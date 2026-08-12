// src/events/deviceCalendar.ts
//
// Adds/removes a native device-calendar entry when the alumni follows/
// unfollows an event ("Ikuti Event"), so the event lands on their phone's
// own calendar app too. The created native calendar-event id is persisted
// in SecureStore keyed by the Lima Circle event id, so unfollowing can find
// and remove the exact entry this created (and not touch anything else on
// the device's calendar).
import * as Calendar from 'expo-calendar';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { EventDetail } from './api';

// KNOWN LIMITATION: these keys are not cleared on logout (unlike
// registrationsCache and the cached QR images — see App.tsx's logout()).
// A full fix would need to track all persisted calendar-id keys to sweep on
// account switch; left as a follow-up since SecureStore has no key-listing API.
const STORAGE_PREFIX = 'ia5_event_calendar_id_';

async function ensurePermission(): Promise<boolean> {
  const { status: existing } = await Calendar.getCalendarPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

// iOS has a single "default" calendar. Android does not — find any calendar
// the app can write to, or create a dedicated one on first use.
async function getWritableCalendarId(): Promise<string> {
  if (Platform.OS === 'ios') {
    const def = await Calendar.getDefaultCalendarAsync();
    return def.id;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find(
    (c) => c.allowsModifications && c.accessLevel === Calendar.CalendarAccessLevel.OWNER,
  );
  if (writable) return writable.id;
  return Calendar.createCalendarAsync({
    title: 'Lima Circle',
    color: '#4C7A6A',
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: 'Lima Circle', type: Calendar.SourceType.LOCAL },
    name: 'Lima Circle',
    ownerAccount: 'ialima-mobile',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

// Called on the follow branch of toggleFollow(). Silently no-ops (does not
// throw) if permission is denied or the device has no writable calendar —
// the in-app follow itself has already succeeded by the time this runs, and
// a missing calendar entry is a soft failure, not something that should
// block or roll back the follow action.
export async function addEventToCalendar(event: EventDetail): Promise<void> {
  if (!event.start_date) return;
  try {
    const granted = await ensurePermission();
    if (!granted) return;
    const calendarId = await getWritableCalendarId();
    const calEventId = await Calendar.createEventAsync(calendarId, {
      title: event.name,
      startDate: new Date(event.start_date * 1000),
      endDate: new Date((event.end_date || event.start_date) * 1000),
      location: event.nama_lokasi || event.alamat || undefined,
      notes: event.google_maps_url || undefined,
      timeZone: 'Asia/Jakarta',
    });
    await SecureStore.setItemAsync(STORAGE_PREFIX + event.id, calEventId);
  } catch {
    // Non-fatal — see comment above.
  }
}

// Called on the unfollow branch. No-ops if this device never created a
// calendar entry for this event (nothing stored) or the underlying entry
// was already removed by the user from their own calendar app.
export async function removeEventFromCalendar(eventId: number): Promise<void> {
  const key = STORAGE_PREFIX + eventId;
  try {
    const calEventId = await SecureStore.getItemAsync(key);
    if (!calEventId) return;
    try {
      await Calendar.deleteEventAsync(calEventId);
    } catch {
      // Already gone — not fatal.
    } finally {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Non-fatal — see comment above.
  }
}
