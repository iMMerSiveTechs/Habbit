import { PrismaClient } from "../generated/prisma";
// ============================================
// Prisma Database Client
// ============================================
// This is a singleton instance of the Prisma client
// Used throughout the application for database operations
//
// Usage:
//   import { db } from "./db";
//   const users = await db.user.findMany();
//
// The Prisma schema is located at prisma/schema.prisma
// After modifying the schema, run: bunx prisma generate
const prismaClient = new PrismaClient();
export const db = prismaClient;
