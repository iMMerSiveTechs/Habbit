-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "handle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'preview',
    "grandfathered" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "skipOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "trialEndsAt" DATETIME,
    "subscriptionEndsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("createdAt", "grandfathered", "handle", "id", "subscriptionEndsAt", "subscriptionTier", "trialEndsAt", "updatedAt", "userId") SELECT "createdAt", "grandfathered", "handle", "id", "subscriptionEndsAt", "subscriptionTier", "trialEndsAt", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_handle_key" ON "Profile"("handle");
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
