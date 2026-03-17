-- AlterTable
ALTER TABLE "location_geofence" ADD COLUMN "linkedTodos" TEXT;
ALTER TABLE "location_geofence" ADD COLUMN "weatherConditions" TEXT;

-- CreateTable
CREATE TABLE "location_reminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "geofenceId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "stayDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "repeatType" TEXT NOT NULL DEFAULT 'always',
    "lastTriggered" DATETIME,
    "timesTriggered" INTEGER NOT NULL DEFAULT 0,
    "linkedHabitId" TEXT,
    "linkedTodoId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "location_reminder_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "location_geofence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "location_suggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "basedOn" TEXT NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdGeofenceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME
);
