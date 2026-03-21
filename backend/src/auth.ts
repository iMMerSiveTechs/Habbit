import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "./env";
import { db } from "./db";
// ============================================
// Better Auth Configuration
// ============================================
// Better Auth handles all authentication flows for the application
// Endpoints are automatically mounted at /api/auth/* in index.ts
//
// Available endpoints:
//   - POST /api/auth/sign-up/email       - Sign up with email/password
//   - POST /api/auth/sign-in/email       - Sign in with email/password
//   - POST /api/auth/sign-out            - Sign out current session
//   - GET  /api/auth/session             - Get current session
//   - And many more... (see Better Auth docs)
//
// This configuration includes:
//   - Prisma adapter for SQLite database
//   - Expo plugin for React Native support
//   - Email/password authentication
//   - Trusted origins for CORS
console.log("🔐 [Auth] Initializing Better Auth...");
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "sqlite",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,
  plugins: [expo()],
  trustedOrigins: [
    "habit://", // Expo app scheme
    "vibecode://", // Legacy scheme — kept for backward compat during transition
    "http://localhost:3000",
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      // In production, you would send an email here
      console.log(`Password reset requested for ${user.email}`);
      // Only log the reset URL in non-production environments when explicitly enabled
      if (process.env.LOG_RESET_URLS === "true" && process.env.NODE_ENV !== "production") {
        console.log(`Reset URL: ${url}`);
      }
      return;
    },
  },
});
console.log("✅ [Auth] Better Auth initialized");
