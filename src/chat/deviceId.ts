// Stable per-install device id for push token registration. Unlike
// Constants.sessionId (which regenerates every app launch), this id is
// generated once and persisted in SecureStore so the backend's
// (user_id, device_id) unique row is reused across launches instead of
// growing unbounded.
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ia5_device_id';

function generateId(): string {
  // Not cryptographically random — fine for a device-id use case where we
  // only need "unique enough per install", not unguessable.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Falls back to the caller-supplied value (e.g. Constants.deviceName ||
// 'unknown-device') if SecureStore itself is unavailable/fails, so push
// registration never crashes because of this helper.
export async function getStableDeviceId(fallback: string): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(STORAGE_KEY);
    if (existing) return existing;
    const created = generateId();
    await SecureStore.setItemAsync(STORAGE_KEY, created);
    return created;
  } catch {
    return fallback;
  }
}
