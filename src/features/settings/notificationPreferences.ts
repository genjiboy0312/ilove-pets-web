export type NotificationPreferenceKey = "likes" | "comments" | "follow"

export interface NotificationPreferences {
  readonly likes: boolean
  readonly comments: boolean
  readonly follow: boolean
}

export const notificationPreferencesStorageKey = "ilove-pets-web:notification-preferences"

export const defaultNotificationPreferences: NotificationPreferences = {
  likes: true,
  comments: true,
  follow: true,
}

export function normalizeNotificationPreferences(value: string | null): NotificationPreferences {
  if (value === null) {
    return { ...defaultNotificationPreferences }
  }

  try {
    const parsed = JSON.parse(value) as Partial<NotificationPreferences>

    return {
      likes:
        typeof parsed.likes === "boolean" ? parsed.likes : defaultNotificationPreferences.likes,
      comments:
        typeof parsed.comments === "boolean"
          ? parsed.comments
          : defaultNotificationPreferences.comments,
      follow:
        typeof parsed.follow === "boolean" ? parsed.follow : defaultNotificationPreferences.follow,
    }
  } catch {
    return { ...defaultNotificationPreferences }
  }
}

export function getStoredNotificationPreferences(storage: Storage): NotificationPreferences {
  return normalizeNotificationPreferences(storage.getItem(notificationPreferencesStorageKey))
}

export function storeNotificationPreference(
  storage: Storage,
  key: NotificationPreferenceKey,
  enabled: boolean,
): NotificationPreferences {
  const next = { ...getStoredNotificationPreferences(storage), [key]: enabled }

  storage.setItem(notificationPreferencesStorageKey, JSON.stringify(next))

  return next
}
