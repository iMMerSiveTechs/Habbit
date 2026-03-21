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
INSERT INTO "new_habit" ("archived", "color", "createdAt", "description", "frequency", "icon", "id", "order", "profileId", "targetCount", "title", "updatedAt") SELECT "archived", "color", "createdAt", "description", "frequency", "icon", "id", "order", "profileId", "targetCount", "title", "updatedAt" FROM "habit";
DROP TABLE "habit";
ALTER TABLE "new_habit" RENAME TO "habit";
CREATE TABLE "new_todo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" DATETIME,
    "linkedHabitId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "recurringType" TEXT,
    "recurringInterval" INTEGER,
    "recurringDays" TEXT,
    "reminderTime" TEXT,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "archivedAt" DATETIME
);
INSERT INTO "new_todo" ("archived", "archivedAt", "completed", "completedAt", "createdAt", "description", "dueDate", "id", "linkedHabitId", "order", "priority", "profileId", "title", "updatedAt") SELECT "archived", "archivedAt", "completed", "completedAt", "createdAt", "description", "dueDate", "id", "linkedHabitId", "order", "priority", "profileId", "title", "updatedAt" FROM "todo";
DROP TABLE "todo";
ALTER TABLE "new_todo" RENAME TO "todo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
