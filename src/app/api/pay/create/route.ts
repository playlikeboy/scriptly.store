import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPaymentLinkAction } from "@/lib/actions/payment-links";
import { encodePaymentLinkPayload, isSafeRedirectUrl } from "@/lib/payments/link-encoder";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

// payment_links.price is int4 paise.
const MAX_PRICE_INR = 21_474_836;

function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: CORS_HEADERS });
}

function normalizeRedirect(raw: string): string {
  const trimmed = raw.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

const optionalText = (max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((v) => (v == null ? undefined : String(v).trim()))
    .pipe(z.string().max(max).optional());

const linkInputSchema = z.object({
  title: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).trim())
    .pipe(z.string().min(1, "Missing required parameter: 'title'").max(200, "'title' is too long (max 200)")),
  price: z.coerce
    .number({ message: "Missing or invalid required parameter: 'price' (must be > 0)" })
    .refine((n) => Number.isFinite(n) && n > 0, "Missing or invalid required parameter: 'price' (must be > 0)")
    .refine((n) => n >= 1, "'price' must be at least 1 (INR)")
    .refine((n) => n <= MAX_PRICE_INR, "'price' is too large"),
  redirectUrl: z
    .string({ message: "Missing required parameter: 'redirectUrl' (or 'redirect')" })
    .trim()
    .min(1, "Missing required parameter: 'redirectUrl' (or 'redirect')")
    .max(2048, "'redirectUrl' is too long")
    .transform(normalizeRedirect)
    .refine(isSafeRedirectUrl, "'redirectUrl' must be a valid http(s) URL"),
  description: optionalText(2000),
  currency: optionalText(3)
    .transform((c) => (c ? c.toUpperCase() : "INR"))
    .refine((c) => /^[A-Z]{3}$/.test(c), "'currency' must be a 3-letter ISO code"),
  customSlug: optionalText(80),
  encryptionKey: optionalText(256),
});

type LinkInput = z.infer<typeof linkInputSchema>;

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message || "Invalid request parameters.";
}

function buildUrls(origin: string, input: LinkInput) {
  const { title, price, redirectUrl, description, currency, encryptionKey } = input;

  const dynamicUrl = `${origin}/pay?title=${encodeURIComponent(title)}&price=${price}&redirect=${encodeURIComponent(redirectUrl)}${
    description ? `&desc=${encodeURIComponent(description)}` : ""
  }`;

  // Signed Base64 token, or AES-256-GCM key-encrypted token when a key is given
  const token = encodePaymentLinkPayload(
    { title, price, redirectUrl, description, currency },
    { sign: true, encryptionKey: encryptionKey || undefined }
  );
  const encodedUrl = `${origin}/pay?data=${token}`;
  const unlockedUrl = encryptionKey
    ? `${encodedUrl}&key=${encodeURIComponent(encryptionKey)}`
    : encodedUrl;

  return { dynamicUrl, token, encodedUrl, unlockedUrl };
}

// Handle CORS Preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

/**
 * Open Public Payment Link Creator API.
 * Accessible to everyone, including logged out users and external integrations.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const json = await req.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) {
      return jsonError(400, "Request body must be a JSON object.");
    }
    body = json as Record<string, unknown>;
  } catch {
    return jsonError(400, "Request body must be valid JSON.");
  }

  const parsed = linkInputSchema.safeParse({
    title: body.title ?? body.name,
    price: body.price ?? body.prize,
    redirectUrl: body.redirectUrl ?? body.redirect ?? body.destination,
    description: body.description ?? body.desc,
    currency: body.currency,
    customSlug: body.customSlug ?? body.slug,
    encryptionKey: body.key ?? body.encryptionKey ?? body.secretKey,
  });
  if (!parsed.success) {
    return jsonError(400, firstIssue(parsed.error));
  }

  const input = parsed.data;
  const origin = req.nextUrl.origin;

  let result: Awaited<ReturnType<typeof createPaymentLinkAction>>;
  try {
    result = await createPaymentLinkAction({
      title: input.title,
      price: input.price,
      description: input.description || "",
      redirectUrl: input.redirectUrl,
      currency: input.currency,
      customSlug: input.customSlug,
    });
  } catch (err) {
    console.error("Payment link creation failed:", err);
    return jsonError(500, "Failed to create payment link.");
  }

  const { dynamicUrl, token, encodedUrl, unlockedUrl } = buildUrls(origin, input);
  const slug = result.link.slug;

  return NextResponse.json(
    {
      success: true,
      message: "Payment link created successfully",
      data: {
        id: result.link.id,
        slug,
        url: `${origin}/pay/${slug}`,
        encodedUrl,
        unlockedUrl,
        dynamicUrl,
        token,
        isEncryptedWithKey: Boolean(input.encryptionKey),
        title: result.link.title,
        price: result.link.price / 100,
        currency: result.link.currency,
        redirectUrl: result.link.redirectUrl,
        createdAt: result.link.createdAt,
      },
    },
    { status: 201, headers: CORS_HEADERS }
  );
}

/**
 * Open GET Endpoint:
 * Passing query parameters creates/redirects to payment page.
 * Example: /api/pay/create?title=Pro+Plan&price=499&redirect=https://example.com/thanks
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const title = searchParams.get("title") || searchParams.get("name");
  const rawPrice = searchParams.get("price") || searchParams.get("prize");
  const redirectUrl =
    searchParams.get("redirectUrl") || searchParams.get("redirect") || searchParams.get("destination");
  const format = searchParams.get("format"); // "json" or redirect
  const autoSave = searchParams.get("save") === "true";

  if (!title || !rawPrice || !redirectUrl) {
    return jsonError(
      400,
      "Missing required query parameters: 'title', 'price' (or 'prize'), 'redirect' (or 'redirectUrl')",
      {
        example:
          "/api/pay/create?title=Consulting+Session&price=999&redirect=https%3A%2F%2Fmeet.google.com%2Fxyz",
      }
    );
  }

  const parsed = linkInputSchema.safeParse({
    title,
    price: rawPrice,
    redirectUrl,
    description: searchParams.get("description") || searchParams.get("desc") || undefined,
    currency: searchParams.get("currency") || undefined,
    encryptionKey:
      searchParams.get("key") || searchParams.get("encryptionKey") || searchParams.get("secretKey") || undefined,
  });
  if (!parsed.success) {
    return jsonError(400, firstIssue(parsed.error));
  }

  const input = parsed.data;
  const origin = req.nextUrl.origin;
  const { dynamicUrl, token, encodedUrl, unlockedUrl } = buildUrls(origin, input);

  if (autoSave) {
    try {
      const result = await createPaymentLinkAction({
        title: input.title,
        price: input.price,
        description: input.description || "",
        redirectUrl: input.redirectUrl,
      });
      const hostedUrl = `${origin}/pay/${result.link.slug}`;

      if (format === "json") {
        return NextResponse.json(
          {
            success: true,
            url: hostedUrl,
            encodedUrl,
            unlockedUrl,
            dynamicUrl,
            slug: result.link.slug,
            token,
            isEncryptedWithKey: Boolean(input.encryptionKey),
            data: result.link,
          },
          { headers: CORS_HEADERS }
        );
      }
      return NextResponse.redirect(hostedUrl);
    } catch (err) {
      console.error("Payment link auto-save failed, falling back to dynamic URL:", err);
      // Fallback to dynamic URL if saving fails
      return NextResponse.redirect(unlockedUrl);
    }
  }

  if (format === "json") {
    return NextResponse.json(
      {
        success: true,
        dynamicUrl,
        encodedUrl,
        unlockedUrl,
        token,
        isEncryptedWithKey: Boolean(input.encryptionKey),
        title: input.title,
        price: input.price,
        redirectUrl: input.redirectUrl,
        description: input.description || "",
      },
      { headers: CORS_HEADERS }
    );
  }

  // Direct redirection to the checkout page
  return NextResponse.redirect(unlockedUrl);
}
