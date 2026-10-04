const completionToken = 'CSRF_NOTIFICATION_CHANGE_CONFIRMED';

interface TrainingSettings {
  notificationsEnabled: boolean;
  lastChangeUsedValidCsrfToken: boolean;
}

const settingsByUser = new Map<string, TrainingSettings>();

function getSettings(userId: string) {
  let settings = settingsByUser.get(userId);
  if (!settings) {
    settings = { notificationsEnabled: true, lastChangeUsedValidCsrfToken: false };
    settingsByUser.set(userId, settings);
  }
  return settings;
}

/**
 * Controlled per-user training state. It is deliberately not connected to the
 * platform account or its real notification settings.
 */
export function getTrainingCsrfSettings(userId: string) {
  const settings = getSettings(userId);
  return {
    profileName: 'Training Victim',
    notificationsEnabled: settings.notificationsEnabled,
    lastChangeUsedValidCsrfToken: settings.lastChangeUsedValidCsrfToken,
  };
}

export function updateTrainingCsrfSettings(
  userId: string,
  notificationsEnabled: boolean,
  usedValidCsrfToken: boolean,
) {
  const settings = getSettings(userId);
  settings.notificationsEnabled = notificationsEnabled;
  settings.lastChangeUsedValidCsrfToken = usedValidCsrfToken;
  return {
    ...getTrainingCsrfSettings(userId),
    completionToken: !notificationsEnabled && !usedValidCsrfToken ? completionToken : null,
  };
}

export function hasUnprotectedNotificationChange(userId: string) {
  const settings = getSettings(userId);
  return !settings.notificationsEnabled && !settings.lastChangeUsedValidCsrfToken;
}

export function resetTrainingCsrfSettings() {
  settingsByUser.clear();
}
