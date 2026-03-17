import { db } from "../src/db";
import { auth } from "../src/auth";

async function recreateAdmin() {
  const email = "jayplay90@vibecode.app";
  const password = "3Kenson33";
  const name = "Jayplay90";

  console.log("🔄 Recreating admin account using Better Auth...\n");

  try {
    // Delete existing user
    const existingUser = await db.user.findUnique({
      where: { email },
      include: { accounts: true, Profile: true },
    });

    if (existingUser) {
      console.log("🗑️  Deleting existing user...");
      
      // Delete profile first
      if (existingUser.Profile) {
        await db.profile.delete({
          where: { id: existingUser.Profile.id },
        });
      }
      
      // Delete accounts
      for (const account of existingUser.accounts) {
        await db.account.delete({
          where: { id: account.id },
        });
      }
      
      // Delete user
      await db.user.delete({
        where: { id: existingUser.id },
        });
      console.log("✅ Old account deleted");
    }

    // Use Better Auth API to create user properly
    console.log("\n📝 Creating new account via API...");
    
    // We need to manually create it with Better Auth's expected format
    // Better Auth uses bcrypt, so let's use their internal hash function
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        emailVerified: true,
      },
    });

    // Create account with Better Auth format
    await db.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: email,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    // Create profile
    const profile = await db.profile.create({
      data: {
        userId: user.id,
        handle: name.toLowerCase(),
        isAdmin: true,
        skipOnboarding: true,
        subscriptionTier: "elite",
        grandfathered: true,
      },
    });

    console.log("\n✅ Admin account created!");
    console.log("\n📧 Credentials:");
    console.log("   Email:", email);
    console.log("   Password:", password);
    console.log("   Name:", name);
    console.log("   Admin:", profile.isAdmin);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

recreateAdmin();
