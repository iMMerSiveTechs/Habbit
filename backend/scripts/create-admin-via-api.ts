import { db } from "../src/db";

async function createAdminViaAPI() {
  const email = "jayplay90@vibecode.app";
  const password = "3Kenson33";
  const name = "Jayplay90";

  console.log("🔐 Creating admin via Better Auth API...\n");

  try {
    // Delete existing user if exists
    const existing = await db.user.findUnique({
      where: { email },
      include: { accounts: true, Profile: true },
    });

    if (existing) {
      console.log("🗑️  Deleting existing user...");
      if (existing.Profile) {
        await db.profile.delete({ where: { id: existing.Profile.id } });
      }
      for (const account of existing.accounts) {
        await db.account.delete({ where: { id: account.id } });
      }
      await db.user.delete({ where: { id: existing.id } });
      console.log("✅ Old account deleted\n");
    }

    // Create via Better Auth API
    console.log("📝 Making signup request...");
    const response = await fetch("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error("❌ Signup failed:", data);
      return;
    }

    console.log("✅ Account created via Better Auth!");
    console.log("   User ID:", data.user.id);

    // Now add admin profile
    const profile = await db.profile.create({
      data: {
        userId: data.user.id,
        handle: name.toLowerCase(),
        isAdmin: true,
        skipOnboarding: true,
        subscriptionTier: "elite",
        grandfathered: true,
      },
    });

    console.log("\n✅ Admin profile created!");
    console.log("\n📧 Admin Credentials:");
    console.log("   Email:", email);
    console.log("   Password:", password);
    console.log("   Name:", name);
    console.log("   Handle:", profile.handle);
    console.log("   Admin:", profile.isAdmin);
    console.log("   Tier:", profile.subscriptionTier);

    console.log("\n🎉 You can now sign in with these credentials!");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

createAdminViaAPI();
