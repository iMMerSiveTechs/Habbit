-- CreateTable
CREATE TABLE "user_engagement_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "engagement_pattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "peakHours" TEXT,
    "peakDays" TEXT,
    "avgFirstOpenHour" REAL,
    "avgLastOpenHour" REAL,
    "avgCompletionHours" TEXT,
    "lastAppOpen" DATETIME,
    "appOpensToday" INTEGER NOT NULL DEFAULT 0,
    "totalDataPoints" INTEGER NOT NULL DEFAULT 0,
    "confidenceScore" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "maxPerDay" INTEGER NOT NULL DEFAULT 5,
    "quietHoursStart" TEXT NOT NULL DEFAULT '22:00',
    "quietHoursEnd" TEXT NOT NULL DEFAULT '07:00',
    "enabledTypes" TEXT NOT NULL DEFAULT '["morning_nudge","missed_habit","streak_risk","protocol_risk","evening_reflection","encouragement","comeback"]',
    "tonePref" TEXT NOT NULL DEFAULT 'motivational',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "smart_notification_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "notificationType" TEXT NOT NULL,
    "habitId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "openedAt" DATETIME,
    "actedOn" BOOLEAN NOT NULL DEFAULT false,
    "actedAt" DATETIME,
    "completionWithin1h" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "user_engagement_log_profileId_eventType_idx" ON "user_engagement_log"("profileId", "eventType");

-- CreateIndex
CREATE INDEX "user_engagement_log_profileId_timestamp_idx" ON "user_engagement_log"("profileId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "engagement_pattern_profileId_key" ON "engagement_pattern"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preference_profileId_key" ON "notification_preference"("profileId");

-- CreateIndex
CREATE INDEX "smart_notification_log_profileId_createdAt_idx" ON "smart_notification_log"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "smart_notification_log_profileId_notificationType_idx" ON "smart_notification_log"("profileId", "notificationType");

-- CreateIndex
CREATE INDEX "smart_notification_log_profileId_scheduledFor_idx" ON "smart_notification_log"("profileId", "scheduledFor");
