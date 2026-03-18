import { createMiddleware } from "hono/factory";
import type { AppType } from "../types";

/**
 * Middleware that requires authentication.
 * Returns 401 if no user session is present.
 */
export const requireAuth = createMiddleware<AppType>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, 401);
  }
  await next();
});
