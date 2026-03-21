-- CreateTable
CREATE TABLE "weekly_reflection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "weekStartDate" DATETIME NOT NULL,
    "weekEndDate" DATETIME NOT NULL,
    "overallRating" TEXT NOT NULL,
    "biggestWin" TEXT NOT NULL,
    "keyLearning" TEXT,
    "areasToImprove" TEXT,
    "nextWeekFocus" TEXT,
    "habitsConsistency" INTEGER NOT NULL DEFAULT 0,
    "focusHoursLogged" REAL NOT NULL DEFAULT 0,
    "moodPattern" TEXT,
    "insights" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "weekly_reflection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monthly_reflection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "overallRating" TEXT NOT NULL,
    "biggestAccomplishment" TEXT NOT NULL,
    "keyLessonsLearned" TEXT,
    "areasForGrowth" TEXT,
    "nextMonthPriorities" TEXT,
    "habitsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalFocusHours" REAL NOT NULL DEFAULT 0,
    "streaksAchieved" TEXT,
    "topProductiveDay" TEXT,
    "topProductiveHour" INTEGER,
    "moodOverview" TEXT,
    "insights" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "monthly_reflection_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reflection_prompt_template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reflectionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "prompts" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reflection_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" INTEGER NOT NULL,
    "dailyReflectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dailyReflectionTime" TEXT NOT NULL DEFAULT '20:00',
    "dailyMissedReminderTime" TEXT NOT NULL DEFAULT '16:00',
    "weeklyReflectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "weeklyReflectionDay" INTEGER NOT NULL DEFAULT 0,
    "weeklyReflectionTime" TEXT NOT NULL DEFAULT '18:00',
    "monthlyReflectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "monthlyReflectionDay" INTEGER NOT NULL DEFAULT 1,
    "monthlyReflectionTime" TEXT NOT NULL DEFAULT '18:00',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tonePref" TEXT NOT NULL DEFAULT 'encouraging',
    "showInsights" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reflection_settings_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reflection_profileId_weekStartDate_key" ON "weekly_reflection"("profileId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reflection_profileId_year_month_key" ON "monthly_reflection"("profileId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "reflection_settings_profileId_key" ON "reflection_settings"("profileId");
