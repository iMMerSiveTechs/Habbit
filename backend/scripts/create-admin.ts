import { db } from "../src/db";
import bcrypt from "bcryptjs";

async function createAdmin() {
  const email = "jayplay90@vibecode.app";
  const password = "3Kenson33";
  const name = "Jayplay90";

  console.log("🔐 Creating admin account...");

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("⚠️  User already exists, checking profile...");

      // Check if profile exists
      let profile = await db.profile.findUnique({
        where: { userId: existingUser.id },
      });

      if (!profile) {
        // Create profile if it doesn't exist
        profile = await db.profile.create({
          data: {
            userId: existingUser.id,
            handle: name.toLowerCase(),
            isAdmin: true,
            skipOnboarding: true,
            subscriptionTier: "elite",
          },
        });
        console.log("✅ Profile created with admin access");
      } else {
        // Update existing profile to be admin
        profile = await db.profile.update({
          where: { userId: existingUser.id },
          data: {
            isAdmin: true,
            skipOnboarding: true,
            subscriptionTier: "elite",
          },
        });
        console.log("✅ Profile updated with admin access");
      }

      console.log("\n📧 Admin account ready:");
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${name}`);
      console.log(`   Admin: ${profile.isAdmin}`);
      console.log(`   Skip Onboarding: ${profile.skipOnboarding}`);
      console.log(`   Tier: ${profile.subscriptionTier}`);

      return;
    }

    // Create new user via Better Auth
    console.log("Creating new user account...");

    // Hash password using bcrypt
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

    // Create account with hashed password
    await db.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
      },
    });

    // Create admin profile
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

    console.log("\n✅ Admin account created successfully!");
    console.log("\n📧 Admin credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
    console.log(`   Handle: ${profile.handle}`);
    console.log(`   Admin: ${profile.isAdmin}`);
    console.log(`   Skip Onboarding: ${profile.skipOnboarding}`);
    console.log(`   Tier: ${profile.subscriptionTier}`);
    console.log("\n🎉 You can now sign in with these credentials!");

  } catch (error) {
    console.error("❌ Error creating admin:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

createAdmin();
