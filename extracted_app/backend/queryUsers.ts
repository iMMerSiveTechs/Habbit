import { db } from "./src/db";

async function queryUsers() {
  try {
    const users = await db.user.findMany({
      include: {
        Profile: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("\n📋 USER ACCOUNTS:\n");

    if (users.length === 0) {
      console.log("No users found in database.");
      return;
    }

    for (const user of users) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.name || "Not set"}`);
      console.log(`🆔 User ID: ${user.id}`);
      console.log(`📅 Created: ${user.createdAt.toLocaleDateString()}`);

      if (user.Profile) {
        console.log(`🔑 Admin: ${user.Profile.isAdmin ? "YES ✅" : "No"}`);
        console.log(`🎫 Tier: ${user.Profile.subscriptionTier}`);
        console.log(`🏷️  Handle: @${user.Profile.handle}`);
      }
      console.log("");
    }

    console.log(`\nTotal users: ${users.length}\n`);
  } catch (error) {
    console.error("Error querying users:", error);
  } finally {
    await db.$disconnect();
  }
}

queryUsers();
