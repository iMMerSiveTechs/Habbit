/**
 * TodoReminderManager - Reminder setup/edit UI for todos
 *
 * Wraps the existing TodoRemindersManager with the standardized props interface.
 */

import React from "react";
import {
  TodoRemindersManager,
  type LocalReminder,
} from "@/components/TodoRemindersManager";

export type { LocalReminder };

interface TodoReminderManagerProps {
  reminders: LocalReminder[];
  onUpdate: (reminders: LocalReminder[]) => void;
  accentColor?: string;
}

const TodoReminderManager = React.memo(function TodoReminderManager({
  reminders,
  onUpdate,
  accentColor,
}: TodoReminderManagerProps) {
  return (
    <TodoRemindersManager
      reminders={reminders}
      onRemindersChange={onUpdate}
      accentColor={accentColor}
    />
  );
});

export { TodoReminderManager };
export type { TodoReminderManagerProps };
