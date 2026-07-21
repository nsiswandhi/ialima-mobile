// Chat API layer — types + thin fetch helpers over the `mobile/v1` chat/
// broadcast/notification endpoints in class-ia5-chat.php. Mirrors
// community/api.ts: JWT in the X-IA5-Token header, urlencoded POST bodies,
// parse<T>() + ApiError.
import { API_BASE } from '../config';
import { trackEvent } from '../analytics';

export type Img = { full: string; thumbnail: string } | null;

export type ChatPerson = { id: number; name: string; avatar: Img; angkatan: string };

export type ChatThread = {
  id: number;
  other: ChatPerson;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  is_blocked: boolean;
};

export type ChatMessage = {
  id: number;
  sender_id: number;
  body: string;
  created_at: string;
};

export type BroadcastScope = 'angkatan' | 'komunitas' | 'all';

export type Broadcast = {
  id: number;
  sender_id: number;
  sender_name: string;
  scope: BroadcastScope;
  scope_ref: string | null;
  title: string;
  body: string;
  created_at: string;
};

export type NotificationItem =
  | { type: 'chat_message'; thread_id: number; from: ChatPerson; preview: string | null; created_at: string }
  | { type: 'broadcast'; broadcast_id: number; title: string; preview: string; sender_name: string; created_at: string }
  | { type: 'user_notification'; id: number; title: string; body: string; created_at: string };

export type ApiError = Error & { code?: string };

function headers(token: string, json = false) {
  const h: Record<string, string> = { 'X-IA5-Token': token };
  if (json) h['Content-Type'] = 'application/x-www-form-urlencoded';
  return h;
}

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    const err: ApiError = new Error(body?.message || 'Request failed');
    err.code = body?.code;
    throw err;
  }
  return body as T;
}

function form(fields: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    p.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return p.toString();
}

export const chatApi = {
  threads(token: string) {
    return fetch(`${API_BASE}/chat/threads`, { headers: headers(token) }).then(
      parse<{ data: ChatThread[]; total: number }>,
    );
  },

  startThread(token: string, toUserId: number) {
    return fetch(`${API_BASE}/chat/threads/start`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ to_user_id: toUserId }),
    }).then(parse<ChatThread>);
  },

  messages(token: string, threadId: number, afterId?: number) {
    const q = afterId ? `?after_id=${afterId}` : '';
    return fetch(`${API_BASE}/chat/threads/${threadId}/messages${q}`, { headers: headers(token) }).then(
      parse<{ data: ChatMessage[]; total: number }>,
    );
  },

  sendMessage(token: string, threadId: number, body: string) {
    return fetch(`${API_BASE}/chat/messages/send`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ thread_id: threadId, body }),
    }).then(parse<ChatMessage>).then((msg) => { trackEvent('chat_message_sent'); return msg; });
  },

  markThreadRead(token: string, threadId: number) {
    return fetch(`${API_BASE}/chat/threads/${threadId}/read`, {
      method: 'POST',
      headers: headers(token),
    }).then(parse<{ success: boolean; last_read_message_id: number }>);
  },

  block(token: string, userId: number) {
    return fetch(`${API_BASE}/chat/block`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ user_id: userId }),
    }).then(parse<{ success: boolean; user_id: number; is_blocked: boolean }>);
  },

  unblock(token: string, userId: number) {
    return fetch(`${API_BASE}/chat/unblock`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ user_id: userId }),
    }).then(parse<{ success: boolean; user_id: number; is_blocked: boolean }>);
  },

  sendBroadcast(token: string, fields: { scope: BroadcastScope; scope_ref?: number; title: string; body: string }) {
    return fetch(`${API_BASE}/chat/broadcast/send`, {
      method: 'POST',
      headers: headers(token, true),
      body: form(fields),
    }).then(parse<Broadcast>);
  },

  broadcasts(token: string) {
    return fetch(`${API_BASE}/chat/broadcast/list`, { headers: headers(token) }).then(
      parse<{ data: Broadcast[]; total: number }>,
    );
  },

  notifications(token: string) {
    return fetch(`${API_BASE}/notifications`, { headers: headers(token) }).then(
      parse<{ data: NotificationItem[]; total: number; unread_count: number }>,
    );
  },

  markNotificationsRead(
    token: string,
    opts: { threadId?: number; broadcastId?: number; notificationId?: number; all?: boolean } = {},
  ) {
    return fetch(`${API_BASE}/notifications/read`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({
        thread_id: opts.threadId,
        broadcast_id: opts.broadcastId,
        notification_id: opts.notificationId,
        all: opts.all,
      }),
    }).then(parse<{ success: boolean }>);
  },

  registerPushToken(token: string, expoToken: string, deviceId: string) {
    return fetch(`${API_BASE}/push/register`, {
      method: 'POST',
      headers: headers(token, true),
      body: form({ expo_token: expoToken, device_id: deviceId }),
    }).then(parse<{ success: boolean }>);
  },
};
