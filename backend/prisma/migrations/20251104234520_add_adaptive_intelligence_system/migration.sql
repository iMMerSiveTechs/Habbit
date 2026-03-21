-- CreateTable
CREATE TABLE "missed_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "scheduledTime" DATETIME,
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "responseType" TEXT,
    "responseNote" TEXT,
    "respondedAt" DATETIME,
    "dayOfWeek" INTEGER NOT NULL,
    "hourOfDay" INTEGER NOT NULL,
    "weatherContext" TEXT,
    "locationContext" TEXT,
    "followUpSent" BOOLEAN NOT NULL DEFAULT false,
    "followUpSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "skip_pattern" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "totalMisses" INTEGER NOT NULL DEFAULT 1,
    "totalScheduled" INTEGER NOT NULL DEFAULT 1,
    "skipRate" REAL NOT NULL DEFAULT 0.0,
    "commonSkipDays" TEXT,
    "commonSkipHours" TEXT,
    "skipReasons" TEXT,
    "suggestedTime" TEXT,
    "suggestedDays" TEXT,
    "suggestedFrequency" TEXT,
    "confidenceScore" REAL NOT NULL DEFAULT 0.5,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "adaptive_notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "missedItemId" TEXT,
    "notificationType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledFor" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" DATETIME,
    "actionTaken" TEXT,
    "actionTakenAt" DATETIME,
    "wasHelpful" BOOLEAN,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "missed_item_profileId_itemType_itemId_idx" ON "missed_item"("profileId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "missed_item_profileId_detectedAt_idx" ON "missed_item"("profileId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "skip_pattern_profileId_itemType_itemId_key" ON "skip_pattern"("profileId", "itemType", "itemId");

-- CreateIndex
CREATE INDEX "adaptive_notification_profileId_scheduledFor_idx" ON "adaptive_notification"("profileId", "scheduledFor");

-- CreateIndex
CREATE INDEX "adaptive_notification_profileId_notificationType_idx" ON "adaptive_notification"("profileId", "notificationType");
