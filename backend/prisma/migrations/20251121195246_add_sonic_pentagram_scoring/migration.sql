-- CreateTable
CREATE TABLE "track" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spotifyId" TEXT,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT,
    "duration" INTEGER,
    "imageUrl" TEXT,
    "previewUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "track_score" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lyricism" INTEGER NOT NULL DEFAULT 50,
    "production" INTEGER NOT NULL DEFAULT 50,
    "vocals" INTEGER NOT NULL DEFAULT 50,
    "flow" INTEGER NOT NULL DEFAULT 50,
    "vibe" INTEGER NOT NULL DEFAULT 50,
    "comment" TEXT,
    "isSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "profileId" INTEGER NOT NULL,
    "trackId" TEXT NOT NULL,
    CONSTRAINT "track_score_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "track_score_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "track_score_aggregate" (
    "trackId" TEXT NOT NULL PRIMARY KEY,
    "avgLyricism" REAL NOT NULL DEFAULT 0,
    "avgProduction" REAL NOT NULL DEFAULT 0,
    "avgVocals" REAL NOT NULL DEFAULT 0,
    "avgFlow" REAL NOT NULL DEFAULT 0,
    "avgVibe" REAL NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "track_score_aggregate_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_preference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "weightLyricism" REAL NOT NULL DEFAULT 1.0,
    "weightProduction" REAL NOT NULL DEFAULT 1.0,
    "weightVocals" REAL NOT NULL DEFAULT 1.0,
    "weightFlow" REAL NOT NULL DEFAULT 1.0,
    "weightVibe" REAL NOT NULL DEFAULT 1.0,
    "discoverySensitivity" REAL NOT NULL DEFAULT 0.5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_preference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "play_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "trackId" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playCount" INTEGER NOT NULL DEFAULT 1,
    "ratingPrompted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "play_history_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "play_history_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "track" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "track_spotifyId_key" ON "track"("spotifyId");

-- CreateIndex
CREATE INDEX "track_spotifyId_idx" ON "track"("spotifyId");

-- CreateIndex
CREATE INDEX "track_score_trackId_idx" ON "track_score"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "track_score_profileId_trackId_key" ON "track_score"("profileId", "trackId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_profileId_key" ON "user_preference"("profileId");

-- CreateIndex
CREATE INDEX "play_history_profileId_playedAt_idx" ON "play_history"("profileId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "play_history_profileId_trackId_key" ON "play_history"("profileId", "trackId");
