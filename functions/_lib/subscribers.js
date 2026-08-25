import { subscribeToButtondown } from "./buttondown.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

export async function saveSubscriber(env, { email, source = "unknown" }) {
  if (!env.SUBSCRIBERS) return false;
  if (!isValidEmail(email)) return false;
  const normalized = email.trim().toLowerCase();
  const key = `sub:${normalized}`;
  try {
    const existing = await env.SUBSCRIBERS.get(key);
    if (existing) return true; // already on the list — keep first subscribe date
    await env.SUBSCRIBERS.put(key, JSON.stringify({
      email: normalized,
      source,
      subscribedAt: new Date().toISOString(),
      status: "active",
    }));
    return true;
  } catch (err) {
    console.error("Failed to store subscriber:", err);
    return false;
  }
}

export async function listSubscribers(env) {
  if (!env.SUBSCRIBERS) return [];
  const rows = [];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: "sub:", cursor });
    for (const key of list.keys) {
      const raw = await env.SUBSCRIBERS.get(key.name);
      if (raw) {
        try { rows.push(JSON.parse(raw)); } catch {}
      }
    }
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return rows;
}

// Capture a subscriber: pushes to Buttondown when BUTTONDOWN_API_KEY is set
// (the sending platform), and always keeps a local KV backup so /admin export
// stays accurate. Flip on later by setting the secret — no code changes needed.
export async function captureSubscriber(env, { email, source = "unknown" }) {
  let buttondownOk = true;
  if (env.BUTTONDOWN_API_KEY) {
    buttondownOk = await subscribeToButtondown(env, { email, source });
  }
  const kvOk = await saveSubscriber(env, { email, source });
  return buttondownOk && kvOk;
}
