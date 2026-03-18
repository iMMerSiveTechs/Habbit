-- CreateIndex
CREATE INDEX "Profile_subscriptionTier_idx" ON "Profile"("subscriptionTier");

-- CreateIndex
CREATE INDEX "biometric_data_profileId_timestamp_idx" ON "biometric_data"("profileId", "timestamp");

-- CreateIndex
CREATE INDEX "focus_session_profileId_createdAt_idx" ON "focus_session"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "habit_profileId_archived_idx" ON "habit"("profileId", "archived");

-- CreateIndex
CREATE INDEX "habit_profileId_category_idx" ON "habit"("profileId", "category");

-- CreateIndex
CREATE INDEX "habit_event_habitId_completedAt_idx" ON "habit_event"("habitId", "completedAt");

-- CreateIndex
CREATE INDEX "habit_reminder_habitId_idx" ON "habit_reminder"("habitId");

-- CreateIndex
CREATE INDEX "location_pattern_profileId_idx" ON "location_pattern"("profileId");

-- CreateIndex
CREATE INDEX "location_visit_profileId_idx" ON "location_visit"("profileId");

-- CreateIndex
CREATE INDEX "reflection_profileId_date_idx" ON "reflection"("profileId", "date");

-- CreateIndex
CREATE INDEX "todo_profileId_completed_idx" ON "todo"("profileId", "completed");

-- CreateIndex
CREATE INDEX "todo_profileId_archived_idx" ON "todo"("profileId", "archived");

-- CreateIndex
CREATE INDEX "todo_profileId_dueDate_idx" ON "todo"("profileId", "dueDate");

-- CreateIndex
CREATE INDEX "todo_reminder_todoId_idx" ON "todo_reminder"("todoId");
