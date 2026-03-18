import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "@hono/node-server/serve-static";
import { rateLimiter } from "hono-rate-limiter";

import { auth } from "./auth";
import { db } from "./db";
import { env } from "./env";
import { uploadRouter } from "./routes/upload";
import { sampleRouter } from "./routes/sample";
import habitsRouter from "./routes/habits";
import focusRouter from "./routes/focus";
import cerebraRouter from "./routes/cerebra";
import biometricRouter from "./routes/biometric";
import socialRouter from "./routes/social";
import locationRouter from "./routes/location";
import todosRouter from "./routes/todos";
import templatesRouter from "./routes/templates";
import marketplaceRouter from "./routes/marketplace";
import scheduleRouter from "./routes/schedule";
import adminRouter from "./routes/admin";
import emotionalRouter from "./routes/emotional";
import aiRouter from "./routes/ai";
import adaptiveRouter from "./routes/adaptive";
import tracksRouter from "./routes/tracks";
import preferencesRouter from "./routes/preferences";
import protocolRouter from "./routes/protocol";
import claudeRouter from "./routes/claude";
import smartNotificationsRouter from "./routes/smartNotifications";
import { reflectionRouter } from "./routes/reflection";
import userRouter from "./routes/user";
import subscriptionRouter from "./routes/subscription";
import { type AppType } from "./types";

export { type AppType };

// AppType context adds user and session to the context, will be null if the user or session is null
const app = new Hono<AppType>();

// Global error handler - catches all unhandled exceptions
app.onError((err, c) => {
  const method = c.req.method;
  const path = c.req.path;
  console.error(`[ERROR] ${method} ${path}:`, err.message);
  if (err.stack) console.error(err.stack);

  // Handle Prisma-specific errors
  if (err.message?.includes('Unique constraint')) {
    return c.json({ error: 'Resource already exists', code: 'DUPLICATE' }, 409);
  }
  if (err.message?.includes('Record to update not found') || err.message?.includes('Record to delete does not exist')) {
    return c.json({ error: 'Resource not found', code: 'NOT_FOUND' }, 404);
  }

  return c.json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR'
  }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);
});

console.log("🔧 Initializing Hono application...");
app.use("*", logger());

// Request timing middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  if (duration > 2000) {
    console.warn(`[SLOW] ${c.req.method} ${c.req.path} took ${duration}ms`);
  }
});

app.use("/*", cors({
  origin: (origin) => {
    // No origin header means native app or same-origin request — allow
    if (!origin) return origin;

    const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;

    // In production, require explicit allowlist — never fall back to allow-all
    if (process.env.NODE_ENV === "production") {
      if (!allowedOriginsEnv || allowedOriginsEnv.trim() === "") return "";
      const allowlist = allowedOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean);
      return allowlist.includes(origin) ? origin : "";
    }

    // Development: allow all if ALLOWED_ORIGINS not set (local dev convenience)
    if (!allowedOriginsEnv || allowedOriginsEnv.trim() === "") return origin;

    // Development with explicit allowlist: still enforce it
    const allowlist = allowedOriginsEnv.split(",").map((o) => o.trim()).filter(Boolean);
    return allowlist.includes(origin) ? origin : "";
  },
  credentials: true, // Enable credentials (cookies, authorization headers)
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Strict rate limiting for auth endpoints - 10 requests per minute
app.use("/api/auth/*", rateLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  keyGenerator: (c) => {
    return c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  },
}));

// Rate limiting - 100 requests per minute per IP
console.log("🛡️  Configuring rate limiting (100 req/min)...");
app.use("/api/*", rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per window
  standardHeaders: "draft-7",
  keyGenerator: (c) => {
    // Use IP address as key
    return c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  },
}));

/** Authentication middleware
 * Extracts session from request headers and attaches user/session to context
 * All routes can access c.get("user") and c.get("session")
 */
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null); // type: typeof auth.$Infer.Session.user | null
  c.set("session", session?.session ?? null); // type: typeof auth.$Infer.Session.session | null
  return next();
});

app.use("/api/*", async (c, next) => {
  const user = c.get("user");
  if (user) {
    try {
      const { ensureProfile } = await import("./utils/ensureProfile");
      await ensureProfile(user.id, user.email);
    } catch (e) {
      // Non-blocking: log but don't fail the request
      console.error("[ensureProfile] failed:", e);
    }
  }
  return next();
});

// Better Auth handler
// Handles all authentication endpoints: /api/auth/sign-in, /api/auth/sign-up, etc.
console.log("🔐 Mounting Better Auth handler at /api/auth/*");
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Serve uploaded images statically
// Files in uploads/ directory are accessible at /uploads/* URLs
console.log("📁 Serving static files from uploads/ directory");
app.use("/uploads/*", serveStatic({ root: "./uploads", rewriteRequestPath: (path) => path.replace(/^\/uploads/, '') }));

// Mount route modules
console.log("📤 Mounting upload routes at /api/upload");
app.route("/api/upload", uploadRouter);

console.log("📝 Mounting sample routes at /api/sample");
app.route("/api/sample", sampleRouter);

console.log("✅ Mounting habits routes at /api/habits");
app.route("/api/habits", habitsRouter);

console.log("⏱️  Mounting focus routes at /api/focus");
app.route("/api/focus", focusRouter);

console.log("🧠 Mounting cerebra routes at /api/cerebra");
app.route("/api/cerebra", cerebraRouter);

console.log("❤️  Mounting biometric routes at /api/biometric");
app.route("/api/biometric", biometricRouter);

console.log("👥 Mounting social routes at /api/social");
app.route("/api/social", socialRouter);

console.log("📍 Mounting location routes at /api/location");
app.route("/api/location", locationRouter);

console.log("📋 Mounting todos routes at /api/todos");
app.route("/api/todos", todosRouter);

console.log("📑 Mounting templates routes at /api/templates");
app.route("/api/templates", templatesRouter);

console.log("🛒 Mounting marketplace routes at /api/templates/marketplace");
app.route("/api/templates/marketplace", marketplaceRouter);

console.log("📅 Mounting schedule routes at /api/schedule");
app.route("/api/schedule", scheduleRouter);

console.log("🔑 Mounting admin routes at /api/admin");
app.route("/api/admin", adminRouter);

console.log("💭 Mounting emotional routes at /api/emotional");
app.route("/api/emotional", emotionalRouter);

console.log("🤖 Mounting AI routes at /api/ai");
app.route("/api/ai", aiRouter);

console.log("🎯 Mounting adaptive intelligence routes at /api/adaptive");
app.route("/api/adaptive", adaptiveRouter);

console.log("🎵 Mounting tracks routes at /api/tracks");
app.route("/api/tracks", tracksRouter);

console.log("⚙️  Mounting preferences routes at /api/preferences");
app.route("/api/preferences", preferencesRouter);

console.log("Mounting protocol routes at /api/protocol");
app.route("/api/protocol", protocolRouter);

console.log("🤖 Mounting Claude AI routes at /api/claude");
app.route("/api/claude", claudeRouter);

console.log("Mounting smart notifications routes at /api/smart-notifications");
app.route("/api/smart-notifications", smartNotificationsRouter);

console.log("💭 Mounting reflection routes at /api/reflections");
app.route("/api/reflections", reflectionRouter);

console.log("Mounting user routes at /api/user");
app.route("/api/user", userRouter);

console.log("Mounting subscription routes at /api/subscription");
app.route("/api/subscription", subscriptionRouter);

// Session validity check - called on app foreground
app.get("/api/auth/check", (c) => {
  const user = c.get("user");
  const session = c.get("session");
  if (!user || !session) {
    return c.json({ valid: false }, 401);
  }
  return c.json({ valid: true, userId: user.id, email: user.email });
});

// Achievement endpoints
app.get("/api/achievements/uncelebrated", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  if (!profile) return c.json({ achievements: [] });
  const { getUncelebratedAchievements } = await import("./services/achievementService");
  const achievements = await getUncelebratedAchievements(profile.id);
  return c.json({ achievements });
});

app.post("/api/achievements/:id/celebrate", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const { markCelebrated } = await import("./services/achievementService");
  await markCelebrated(c.req.param("id"));
  return c.json({ success: true });
});

// Health check endpoint
// Used by load balancers and monitoring tools to verify service is running
app.get("/health", async (c) => {
  try {
    // Verify DB connection
    await db.$queryRaw`SELECT 1`;
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    return c.json({ status: "degraded", error: "Database unreachable" }, 503);
  }
});

// Start the server
console.log("⚙️  Starting server...");
serve({ fetch: app.fetch, port: Number(env.PORT) }, () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(`🚀 Server is running on port ${env.PORT}`);
  console.log(`🔗 Base URL: http://localhost:${env.PORT}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n📚 Available endpoints:");
  console.log("  🔐 Auth:     /api/auth/*");
  console.log("  📤 Upload:   POST /api/upload/image");
  console.log("  📝 Sample:   GET/POST /api/sample");
  console.log("  ✅ Habits:     /api/habits");
  console.log("  ⏱️  Focus:      /api/focus");
  console.log("  🧠 Cerebra:    /api/cerebra");
  console.log("  ❤️  Biometric:  /api/biometric");
  console.log("  👥 Social:     /api/social");
  console.log("  📍 Location:   /api/location");
  console.log("  📋 Todos:      /api/todos");
  console.log("  📑 Templates:  /api/templates");
  console.log("  🛒 Marketplace: /api/templates/marketplace");
  console.log("  📅 Schedule:   /api/schedule");
  console.log("  🔑 Admin:      /api/admin");
  console.log("  💭 Emotional:  /api/emotional");
  console.log("  🤖 AI:         /api/ai");
  console.log("  🎯 Adaptive:   /api/adaptive");
  console.log("  🎵 Tracks:     /api/tracks");
  console.log("  Protocol:    /api/protocol");
  console.log("  🧠 Claude:     /api/claude");
  console.log("  💭 Reflection: /api/reflections");
  console.log("  User:        POST /api/user/delete");
  console.log("  💚 Health:     GET /health");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});
