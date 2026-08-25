const API = "https://api.buttondown.email/v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeToButtondown(env, { email, source }) {
  if (!env.BUTTONDOWN_API_KEY) return false;
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) return false;
  try {
    const res = await fetch(`${API}/subscribers`, {
      method: "POST",
      headers: {
        "Authorization": `Token ${env.BUTTONDOWN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        tags: [source || "unknown"],
        metadata: { source: source || "unknown" },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    // 201 = created, 409 = already subscribed — both fine
    if (res.status === 201 || res.status === 409) return true;
    console.error("Buttondown subscribe failed:", res.status, await res.text().catch(() => ""));
    return false;
  } catch (err) {
    console.error("Buttondown subscribe error:", err);
    return false;
  }
}

export async function unsubscribeFromButtondown(env, email) {
  if (!env.BUTTONDOWN_API_KEY) return false;
  try {
    const res = await fetch(`${API}/subscribers/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Token ${env.BUTTONDOWN_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "unsubscribed" }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch (err) {
    console.error("Buttondown unsubscribe error:", err);
    return false;
  }
}
