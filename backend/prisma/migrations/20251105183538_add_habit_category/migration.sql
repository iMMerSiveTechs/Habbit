-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "habit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_habit" ("archived", "color", "createdAt", "description", "frequency", "icon", "id", "order", "profileId", "recurringDays", "recurringInterval", "recurringType", "reminderEnabled", "reminderTime", "targetCount", "title", "updatedAt") SELECT "archived", "color", "createdAt", "description", "frequency", "icon", "id", "order", "profileId", "recurringDays", "recurringInterval", "recurringType", "reminderEnabled", "reminderTime", "targetCount", "title", "updatedAt" FROM "habit";
DROP TABLE "habit";
ALTER TABLE "new_habit" RENAME TO "habit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
