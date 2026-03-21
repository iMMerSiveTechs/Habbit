-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_focus_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "duration" INTEGER,
    "task" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "interrupted" BOOLEAN NOT NULL DEFAULT false,
    "sessionType" TEXT,
    "mood" TEXT,
    "energyLevel" INTEGER,
    "goalDescription" TEXT,
    "linkedHabitId" TEXT,
    "linkedTodoId" TEXT,
    "locationName" TEXT,
    "locationLat" REAL,
    "locationLon" REAL,
    "productivity" INTEGER,
    "notes" TEXT,
    "distractions" INTEGER,
    "inFlowState" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "focus_session_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_focus_session" ("completed", "createdAt", "duration", "endTime", "id", "interrupted", "profileId", "startTime", "task") SELECT "completed", "createdAt", "duration", "endTime", "id", "interrupted", "profileId", "startTime", "task" FROM "focus_session";
DROP TABLE "focus_session";
ALTER TABLE "new_focus_session" RENAME TO "focus_session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
