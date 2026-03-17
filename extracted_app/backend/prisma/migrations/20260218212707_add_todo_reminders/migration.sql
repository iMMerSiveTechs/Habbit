-- CreateTable
CREATE TABLE "todo_reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "todoId" TEXT NOT NULL,
    "reminderTime" TEXT NOT NULL,
    "recurringType" TEXT NOT NULL DEFAULT 'daily',
    "recurringDays" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "todo_reminder_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "todo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
