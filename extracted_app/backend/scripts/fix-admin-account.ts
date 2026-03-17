import { db } from "../src/db";

async function fixAdminAccount() {
  const email = "jayplay90@vibecode.app";

  console.log("🔧 Fixing admin account provider...\n");

  try {
    const user = await db.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    if (!user) {
      console.log("❌ User not found!");
      return;
    }

    const account = user.accounts[0];
    if (!account) {
      console.log("❌ No account found!");
      return;
    }

    console.log("Current provider:", account.providerId);

    // Better Auth uses "credential" for email/password, but let's check the database
    // and update it to what Better Auth expects
    const updated = await db.account.update({
      where: { id: account.id },
      data: {
        providerId: "credential",
        accountId: email, // Better Auth uses email as accountId
      },
    });

    console.log("\n✅ Account updated:");
    console.log("   Provider ID:", updated.providerId);
    console.log("   Account ID:", updated.accountId);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await db.$disconnect();
  }
}

fixAdminAccount();
