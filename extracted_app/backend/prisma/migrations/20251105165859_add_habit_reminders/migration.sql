-- CreateTable
CREATE TABLE "habit_reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "habitId" TEXT NOT NULL,
    "reminderTime" TEXT NOT NULL,
    "recurringType" TEXT NOT NULL DEFAULT 'daily',
    "recurringInterval" INTEGER,
    "recurringDays" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "habit_reminder_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
