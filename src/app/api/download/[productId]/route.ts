export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, orders, downloads, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { hexclave } from "@/lib/hexclave";
import { getProductEffectivePrice } from "@/lib/price-utils";
import { getCloudflareContext } from "@opennextjs/cloudflare";

const PRIVATE_NO_STORE = "private, no-cache, no-store, must-revalidate";
const ALLOWED_EXTENSIONS = [".zip", ".pdf", ".tar.gz"];

function textError(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function safeAttachmentName(fileUrl: string, slug: string): string {
  let baseName = "";
  try {
    baseName = decodeURIComponent(new URL(fileUrl).pathname.split("/").pop() || "");
  } catch {
    baseName = "";
  }
  // Strip anything that could break the header or escape a directory.
  baseName = baseName.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "");
  if (!ALLOWED_EXTENSIONS.some((ext) => baseName.toLowerCase().endsWith(ext))) {
    baseName = `${slug}.zip`;
  }
  return baseName;
}

/**
 * Entitlement-gated download. Access is granted to admins, buyers with a
 * completed order, or anyone for a published product that is currently free.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    if (!productId || productId.length > 128) {
      return textError(404, "Product or file not found.");
    }

    const hexclaveUser = await hexclave.getUser();
    if (!hexclaveUser) {
      return textError(401, "Unauthorized: Please sign in to download.");
    }

    // Role, product and completed purchase are independent lookups.
    const [[dbUser], [product], [orderRecord]] = await Promise.all([
      db.select({ role: users.role }).from(users).where(eq(users.id, hexclaveUser.id)).limit(1),
      db
        .select({
          id: products.id,
          slug: products.slug,
          fileUrl: products.fileUrl,
          redirectDownload: products.redirectDownload,
          published: products.published,
          price: products.price,
          isFree: products.isFree,
          discountPercent: products.discountPercent,
          promoStart: products.promoStart,
          promoEnd: products.promoEnd,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1),
      db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.userId, hexclaveUser.id),
            eq(orders.productId, productId),
            eq(orders.status, "completed")
          )
        )
        .limit(1),
    ]);

    if (!product || !product.fileUrl) {
      return textError(404, "Product or file not found.");
    }

    const isAdmin = dbUser?.role === "admin";
    const isCurrentlyFree = product.published && getProductEffectivePrice(product).isFree;

    if (!isAdmin && !orderRecord && !isCurrentlyFree) {
      return textError(403, "Forbidden: You have not purchased this product.");
    }

    // Audit log + counter. downloads.order_id is a FK to orders, so only
    // purchase-backed downloads get an audit row; the counter always moves.
    try {
      await Promise.all([
        orderRecord
          ? db.insert(downloads).values({
              id: crypto.randomUUID(),
              userId: hexclaveUser.id,
              productId,
              orderId: orderRecord.id,
            })
          : null,
        db
          .update(products)
          .set({ downloadsCount: sql`${products.downloadsCount} + 1` })
          .where(eq(products.id, productId)),
      ]);
    } catch (dbErr) {
      console.error("Failed to log download audit event:", dbErr);
    }

    const fileUrl = product.fileUrl;

    // Private R2 storage: r2://<slug>/<file>.zip, streamed only after the
    // entitlement check above. The bucket is never exposed publicly.
    if (fileUrl.startsWith("r2://")) {
      const key = fileUrl.slice("r2://".length);
      if (!key || key.startsWith("/") || key.includes("\\") || key.split("/").some((s) => s === ".." || s === "")) {
        return textError(404, "Product or file not found.");
      }
      const { env } = await getCloudflareContext({ async: true });
      const object = await env.ASSETS_BUCKET.get(key);
      if (!object) {
        console.error("R2 object missing for product", product.slug, key);
        return textError(404, "Product file is temporarily unavailable. Please contact support.");
      }
      const fileName = safeAttachmentName(fileUrl, product.slug);
      return new Response(object.body, {
        headers: {
          "Content-Type": fileName.endsWith(".zip") ? "application/zip" : "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Content-Length": String(object.size),
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": PRIVATE_NO_STORE,
          ETag: object.httpEtag,
        },
      });
    }

    // Remote storage
    if (/^https?:\/\//i.test(fileUrl)) {
      const target = new URL(fileUrl);
      if (product.redirectDownload) {
        return NextResponse.redirect(target, { headers: { "Cache-Control": PRIVATE_NO_STORE } });
      }

      try {
        const upstream = await fetch(target);
        if (upstream.ok && upstream.body) {
          const fileName = safeAttachmentName(fileUrl, product.slug);
          const headers: Record<string, string> = {
            "Content-Type": fileName.endsWith(".zip") ? "application/zip" : "application/octet-stream",
            "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": PRIVATE_NO_STORE,
          };
          const length = upstream.headers.get("content-length");
          if (length) headers["Content-Length"] = length;
          // Stream instead of buffering the whole archive in Worker memory.
          return new Response(upstream.body, { headers });
        }
      } catch (err) {
        console.error("Fetch download failed, falling back to direct URL redirect:", err);
      }

      return NextResponse.redirect(target, { headers: { "Cache-Control": PRIVATE_NO_STORE } });
    }

    // Same-origin relative path only: no traversal, no protocol-relative or
    // backslash tricks that could redirect off-site.
    if (
      !fileUrl.startsWith("/") ||
      fileUrl.startsWith("//") ||
      fileUrl.includes("\\") ||
      fileUrl.split("/").some((segment) => segment === "..")
    ) {
      return textError(404, "Product or file not found.");
    }

    return NextResponse.redirect(new URL(fileUrl, req.url), {
      headers: { "Cache-Control": PRIVATE_NO_STORE },
    });
  } catch (error) {
    console.error("Secure download authorization error:", error);
    return textError(500, "Internal Server Error: Unable to process secure download.");
  }
}
