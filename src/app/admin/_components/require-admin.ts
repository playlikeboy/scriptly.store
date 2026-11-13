import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth-utils";

/**
 * Page-level guard. Layouts and pages render in parallel, so every admin page
 * that reads data checks access itself instead of relying on the layout alone.
 * The underlying user lookup is request-cached, so this costs no extra query.
 */
export async function requireAdminPage() {
  if (!(await isAdmin())) redirect("/");
}
