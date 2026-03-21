-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "handle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "grandfathered" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "skipOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" DATETIME,
    "subscriptionEndsAt" DATETIME,
    "integrity" INTEGER NOT NULL DEFAULT 100,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "lastAuditDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("createdAt", "grandfathered", "handle", "id", "isAdmin", "skipOnboarding", "subscriptionEndsAt", "subscriptionTier", "trialEndsAt", "updatedAt", "userId") SELECT "createdAt", "grandfathered", "handle", "id", "isAdmin", "skipOnboarding", "subscriptionEndsAt", "subscriptionTier", "trialEndsAt", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_handle_key" ON "Profile"("handle");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE TABLE "new_habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT NOT NULL DEFAULT '#00D4FF',
    "category" TEXT NOT NULL DEFAULT 'general',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "targetCount" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "recurringType" TEXT,
    "recurringInterval" INTEGER,
    "recurringDays" TEXT,
    "reminderTime" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "habitType" TEXT NOT NULL DEFAULT 'standard',
    "protocolTarget" INTEGER,
    "protocolWindowDays" INTEGER,
    "protocolStartDate" TEXT,
    "protocolStatus" TEXT,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "completionHistory" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "habit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_habit" ("archived", "category", "color", "createdAt", "description", "frequency", "icon", "id", "order", "profileId", "recurringDays", "recurringInterval", "recurringType", "reminderEnabled", "reminderTime", "targetCount", "title", "updatedAt") SELECT "archived", "category", "color", "createdAt", "description", "frequency", "icon", "id", "order", "profileId", "recurringDays", "recurringInterval", "recurringType", "reminderEnabled", "reminderTime", "targetCount", "title", "updatedAt" FROM "habit";
DROP TABLE "habit";
ALTER TABLE "new_habit" RENAME TO "habit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
