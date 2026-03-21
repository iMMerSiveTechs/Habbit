-- CreateTable
CREATE TABLE "work_schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "workLocationName" TEXT NOT NULL,
    "workLatitude" REAL NOT NULL,
    "workLongitude" REAL NOT NULL,
    "workAddress" TEXT,
    "homeLatitude" REAL NOT NULL,
    "homeLongitude" REAL NOT NULL,
    "homeAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "prepTimeMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "route" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromLatitude" REAL NOT NULL,
    "fromLongitude" REAL NOT NULL,
    "toName" TEXT NOT NULL,
    "toLatitude" REAL NOT NULL,
    "toLongitude" REAL NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "lastTravelMinutes" INTEGER,
    "lastChecked" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "morning_routine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL DEFAULT 5,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'general',
    "linkedHabitId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "morning_routine_completion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "routineId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    CONSTRAINT "morning_routine_completion_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "morning_routine" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "travel_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "fromName" TEXT NOT NULL,
    "fromLatitude" REAL NOT NULL,
    "fromLongitude" REAL NOT NULL,
    "toName" TEXT NOT NULL,
    "toLatitude" REAL NOT NULL,
    "toLongitude" REAL NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "expectedMinutes" INTEGER NOT NULL,
    "actualMinutes" INTEGER,
    "isCommute" BOOLEAN NOT NULL DEFAULT false,
    "routeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
