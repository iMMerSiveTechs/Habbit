-- CreateTable
CREATE TABLE "biometric_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hrv" INTEGER,
    "restingHR" INTEGER,
    "sleepScore" REAL,
    "sleepHours" REAL,
    "deepSleep" REAL,
    "remSleep" REAL,
    "stressLevel" INTEGER,
    "energyLevel" INTEGER,
    "activityMins" INTEGER,
    "steps" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'manual',
    CONSTRAINT "biometric_data_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "buddy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "buddyId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastNudge" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "buddy_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "group_membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_membership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "group_membership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "topic" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "voice_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "voiceMode" TEXT NOT NULL DEFAULT 'adaptive',
    "pitch" REAL NOT NULL DEFAULT 1.0,
    "speed" REAL NOT NULL DEFAULT 1.0,
    "personality" TEXT NOT NULL DEFAULT 'balanced',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "voice_profile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "buddy_profileId_buddyId_key" ON "buddy"("profileId", "buddyId");

-- CreateIndex
CREATE UNIQUE INDEX "group_membership_profileId_groupId_key" ON "group_membership"("profileId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "voice_profile_profileId_key" ON "voice_profile"("profileId");
