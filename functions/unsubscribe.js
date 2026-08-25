import { isValidEmail } from "./_lib/subscribers.js";
import { unsubscribeFromButtondown } from "./_lib/buttondown.js";

function page({ ok, title, body }, origin) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Property Care</title>
<style>
  body { margin:0; font-family:"DM Sans",system-ui,sans-serif; background:#faf6f0; color:#3D2B1F; min-height:100vh; display:flex; align-items:center; justify-content:center; }
  .card { background:#fff; border:1px solid #e6ddcf; border-radius:12px; padding:2.5rem 2rem; max-width:30rem; text-align:center; box-shadow:0 8px 24px rgba(61,43,31,0.06); }
  h1 { font-family:"Playfair Display",Georgia,serif; font-size:1.6rem; margin:0 0 1rem; }
  p { line-height:1.6; color:rgba(61,43,31,0.8); margin:0 0 1.5rem; }
  a { color:#C4977A; font-weight:600; text-decoration:none; }
  .mark { font-size:2.5rem; margin-bottom:0.5rem; }
</style>
</head>
<body>
  <div class="card">
    <div class="mark">${ok ? "✓" : "•"}</div>
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="${origin}">← Back to Property Care</a>
  </div>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;
  const email = String(url.searchParams.get("email") || "").trim().toLowerCase();

  let message;
  if (!env.SUBSCRIBERS) {
    message = { ok: false, title: "Unavailable", body: "The mailing list isn't configured yet. Please email us directly to be removed." };
  } else if (!isValidEmail(email)) {
    message = { ok: false, title: "Invalid link", body: "This unsubscribe link is missing a valid email address." };
  } else {
    const key = `sub:${email}`;
    const raw = await env.SUBSCRIBERS.get(key);
    if (!raw) {
      message = { ok: true, title: "You're all set", body: "That email isn't on our list, so there's nothing to remove." };
    } else {
      const rec = JSON.parse(raw);
      rec.status = "unsubscribed";
      rec.unsubscribedAt = new Date().toISOString();
      await env.SUBSCRIBERS.put(key, JSON.stringify(rec));
      if (env.BUTTONDOWN_API_KEY) {
        await unsubscribeFromButtondown(env, email);
      }
      message = { ok: true, title: "Unsubscribed", body: "You've been removed from the Property Care mailing list. You can resubscribe anytime from our website." };
    }
  }

  return new Response(page(message, origin), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
