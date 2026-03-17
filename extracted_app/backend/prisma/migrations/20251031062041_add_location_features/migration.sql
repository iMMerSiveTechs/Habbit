-- CreateTable
CREATE TABLE "location_geofence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "radius" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onEnter" TEXT,
    "onExit" TEXT,
    "linkedHabits" TEXT,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "lastVisit" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "location_geofence_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "location_visit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "geofenceId" TEXT NOT NULL,
    "profileId" INTEGER NOT NULL,
    "arrivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departedAt" DATETIME,
    "duration" INTEGER,
    "habitsCompleted" INTEGER NOT NULL DEFAULT 0,
    "moodBefore" INTEGER,
    "moodAfter" INTEGER,
    "productivity" INTEGER,
    CONSTRAINT "location_visit_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "location_geofence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "location_pattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "category" TEXT,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "avgDuration" INTEGER,
    "commonDays" TEXT,
    "commonHours" TEXT,
    "suggested" BOOLEAN NOT NULL DEFAULT false,
    "suggestedName" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.5,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "location_mood_map" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "radius" INTEGER NOT NULL DEFAULT 50,
    "locationName" TEXT,
    "avgMood" REAL NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
