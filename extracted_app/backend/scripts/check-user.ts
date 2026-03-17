import { db } from "../src/db";

async function checkUser() {
  const email = "jayplay90@vibecode.app";

  console.log("🔍 Checking user account...\n");

  try {
    const user = await db.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        Profile: true,
      },
    });

    if (!user) {
      console.log("❌ User not found!");
      return;
    }

    console.log("✅ User found:");
    console.log("   ID:", user.id);
    console.log("   Email:", user.email);
    console.log("   Name:", user.name);
    console.log("   Email Verified:", user.emailVerified);
    console.log("\n📧 Accounts:", user.accounts.length);

    user.accounts.forEach((account, i) => {
      console.log(`\n   Account ${i + 1}:`);
      console.log("   Provider:", account.providerId);
      console.log("   Has Password:", !!account.password);
      console.log("   Password Hash:", account.password ? account.password.substring(0, 30) + "..." : "None");
    });

    if (user.Profile) {
      console.log("\n👤 Profile:");
      console.log("   Handle:", user.Profile.handle);
      console.log("   Admin:", user.Profile.isAdmin);
      console.log("   Skip Onboarding:", user.Profile.skipOnboarding);
      console.log("   Tier:", user.Profile.subscriptionTier);
    } else {
      console.log("\n⚠️  No profile found!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkUser();
