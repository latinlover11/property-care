import { listSubscribers, captureSubscriber, isValidEmail } from "./_lib/subscribers.js";

const SESSION_COOKIE = "pc_admin";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function starsHtml(rating) {
  if (!rating) return "";
  let out = "";
  for (let i = 0; i < 5; i++) {
    out += `<span class="star${i < rating ? " on" : ""}">★</span>`;
  }
  return out;
}

async function sign(value, env) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(env.ADMIN_TOKEN || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [exp, sig] = match[1].split(".");
  if (!exp || !sig) return null;
  const expected = await sign(exp, env);
  if (expected !== sig) return null;
  if (Number(exp) < Date.now()) return null;
  return { expiresAt: Number(exp) };
}

async function makeSession(env) {
  const exp = String(Date.now() + SESSION_TTL_MS);
  const sig = await sign(exp, env);
  return `${SESSION_COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

function htmlPage(title, body, adminOk) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${adminOk ? "Reviews Admin — " : ""}${title}</title>
<style>
  :root { --bark:#3D2B1F; --cream:#faf6f0; --straw:#f2e8d9; --clay:#C4977A; --warm-mid:#6b5b4e; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "DM Sans", system-ui, sans-serif; background:var(--cream); color:var(--bark); }
  .wrap { max-width: 44rem; margin: 0 auto; padding: 2.5rem 1.25rem; }
  h1 { font-family: "Playfair Display", Georgia, serif; font-size: 1.6rem; }
  .card { background:#fff; border:1px solid #e6ddcf; border-radius:8px; padding:1.25rem 1.5rem; margin-bottom:1rem; box-shadow:0 1px 4px rgba(0,0,0,.05); }
  .stars { color:#d97706; letter-spacing:2px; }
  .stars .star.on { color:#d97706; }
  .stars .star { color:#d8cec0; }
  .meta { font-size:.8rem; color:var(--warm-mid); }
  form { display:inline; }
  button { cursor:pointer; border:0; border-radius:6px; padding:.45rem .8rem; font-size:.85rem; font-weight:600; font-family:inherit; }
  .btn-ok { background:#2e7d32; color:#fff; }
  .btn-no { background:#c62828; color:#fff; }
  .btn-sub { background:var(--clay); color:#fff; }
  .btn-link { background:none; color:var(--clay); text-decoration:underline; padding:0; font-weight:500; }
  input[type=password] { padding:.55rem .8rem; border:1px solid #d8cec0; border-radius:6px; font-size:.95rem; min-width:16rem; }
  .empty { color:var(--warm-mid); font-style:italic; }
  .badge { display:inline-block; background:var(--straw); border-radius:20px; padding:.15rem .6rem; font-size:.75rem; font-weight:700; color:var(--bark); }
  .msg { padding:.6rem .9rem; border-radius:6px; margin-bottom:1rem; font-size:.9rem; }
  .msg.ok { background:#dff2df; color:#1b5e20; }
  .msg.err { background:#fdecea; color:#b71c1c; }
  .flash a { color:var(--clay); }
</style>
</head>
<body>
<div class="wrap">
  ${body}
</div>
</body>
</html>`;
}

const LOGIN_PAGE = ({ error }) => htmlPage(
  "Sign In",
  `<h1>Reviews Admin</h1>
   ${error ? `<div class="msg err">${escapeHtml(error)}</div>` : ""}
   <form method="POST" action="/admin">
     <input type="hidden" name="action" value="login">
     <p><label for="pass">Admin token:</label><br>
       <input type="password" id="pass" name="token" autocomplete="current-password" required></p>
     <button class="btn-sub" type="submit">Sign in</button>
   </form>`,
  false
);

async function subscribersSection(env) {
  if (!env.SUBSCRIBERS) {
    return `<h1>Subscribers</h1><p class="msg err">SUBSCRIBERS KV is not configured. Add the binding in wrangler.jsonc.</p>`;
  }
  const subs = await listSubscribers(env);
  const active = subs.filter((s) => s.status !== "unsubscribed");
  const count = subs.length;
  const activeCount = active.length;
  const body = activeCount
    ? `<p><a class="btn-sub" href="/admin?csv=1" style="color:#fff; text-decoration:none; display:inline-block;">Export CSV</a></p>`
    : `<div class="empty">No active subscribers yet. They'll appear here from the newsletter signup and quote/contact forms.</div>`;
  return `<h1>Subscribers <span class="badge">${activeCount} active</span></h1>
      <p style="font-size:.85rem;color:var(--warm-mid);">${count} total · CSV export includes active subscribers only (excludes unsubscribed). Emails come from the newsletter signup and quote/contact forms.</p>
      ${body}`;
}

async function managementPage(request, env, notice) {
  const reviews = [];
  const list = await env.REVIEWS.list({ prefix: "pending:" });
  for (const key of list.keys) {
    const raw = await env.REVIEWS.get(key.name);
    if (raw) reviews.push({ key: key.name, ...JSON.parse(raw) });
  }
  reviews.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const subsHtml = await subscribersSection(env);

  const rows = reviews.length
    ? reviews.map((r) => `
      <div class="card">
        <div class="stars">${starsHtml(r.rating)}</div>
        <p style="margin:.35rem 0;">${escapeHtml(r.review)}</p>
        <p class="meta">— ${escapeHtml(r.name)}${r.serviceType ? ` · ${escapeHtml(r.serviceType)}` : ""} · ${new Date(r.submittedAt).toLocaleString()}</p>
        <form method="POST" action="/admin" onsubmit="return confirm('Publish this review publicly?')">
          <input type="hidden" name="action" value="approve"><input type="hidden" name="id" value="${escapeHtml(r.key)}">
          <button class="btn-ok" type="submit">Publish</button>
        </form>
        <form method="POST" action="/admin" onsubmit="return confirm('Delete this review permanently?')">
          <input type="hidden" name="action" value="reject"><input type="hidden" name="id" value="${escapeHtml(r.key)}">
          <button class="btn-no" type="submit">Reject</button>
        </form>
      </div>`).join("")
    : `<div class="empty">No pending reviews right now. New reviews submitted on the success page will appear here for approval.</div>`;

  const addSubscriberHtml = `
    <h1 style="margin-top:2.5rem;">Add Subscriber</h1>
    <p style="font-size:.85rem;color:var(--warm-mid);">Manually add a past client to the mailing list (e.g., from a previous job). They'll get the same welcome email and unsubscribe link.</p>
    <form method="POST" action="/admin" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
      <input type="hidden" name="action" value="add-subscriber">
      <input type="email" name="email" placeholder="client@email.com" required style="padding:.5rem .7rem; border:1px solid #d8cec0; border-radius:6px; font-size:.9rem; min-width:220px;">
      <select name="source" style="padding:.5rem .7rem; border:1px solid #d8cec0; border-radius:6px; font-size:.9rem;">
        <option value="manual">Manual / past client</option>
        <option value="newsletter">Newsletter</option>
        <option value="contact">Contact form</option>
        <option value="quote">Quote form</option>
      </select>
      <button class="btn-sub" type="submit">Add to List</button>
    </form>`;

  return htmlPage(
    "Admin",
    `${subsHtml}
     ${addSubscriberHtml}
     <h1 style="margin-top:2.5rem;">Reviews Admin <span class="badge">pending: ${reviews.length}</span></h1>
     ${notice ? `<div class="msg ok">${escapeHtml(notice)}</div>` : ""}
     <p style="font-size:.85rem;color:var(--warm-mid);">Publishing a review makes it appear in the testimonial slider on your homepage within minutes. Rejecting removes it permanently. <span class="flash"><a href="/admin?out=1">Sign out</a></span></p>
     ${rows}
     <p><a href="/portfolio.html">← Back to site</a></p>`,
    true
  );
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  const notice = { text: "", ok: true };

  if (action === "login") {
    const token = String(formData.get("token") || "");
    const secret = String(env.ADMIN_TOKEN || "");
    if (secret && constantTimeEqual(token, secret)) {
      const cookie = await makeSession(env);
      return new Response(null, {
        status: 303,
        headers: { Location: "/admin", "Set-Cookie": cookie },
      });
    }
    return new Response(LOGIN_PAGE({ error: "Invalid token." }), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      status: 401,
    });
  }

  const session = await getSession(request, env);
  if (!session) {
    return new Response(LOGIN_PAGE({ error: "Session expired. Sign in again." }), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      status: 401,
    });
  }

  const id = String(formData.get("id") || "");
  if (action === "approve" && id) {
    const raw = await env.REVIEWS.get(id);
    if (raw) {
      const review = JSON.parse(raw);
      await env.REVIEWS.put(`approved:${review.id}`, JSON.stringify({ ...review, approvedAt: new Date().toISOString() }));
      await env.REVIEWS.delete(id);
      notice.text = "Review published to the homepage.";
    } else {
      notice.ok = false;
      notice.text = "Review not found (already handled?).";
    }
  } else if (action === "reject" && id) {
    await env.REVIEWS.delete(id);
    notice.text = "Review rejected.";
  } else if (action === "logout") {
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin", "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0` },
    });
  } else if (action === "add-subscriber") {
    const email = String(formData.get("email") || "").trim();
    const source = String(formData.get("source") || "manual");
    if (isValidEmail(email)) {
      await captureSubscriber(env, { email, source });
      notice.text = `Added ${email} to the mailing list (source: ${source}).`;
    } else {
      notice.ok = false;
      notice.text = "Please enter a valid email address.";
    }
  }

  return new Response(await managementPage(request, env, notice.text || ""), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.searchParams.get("out") === "1" && (await getSession(request, env))) {
    return new Response(null, {
      status: 303,
      headers: { Location: "/admin", "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0` },
    });
  }

  const session = await getSession(request, env);
  if (!session) {
    return new Response(LOGIN_PAGE({ error: "" }), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (url.searchParams.get("csv") === "1") {
    const subs = await listSubscribers(env);
    const active = subs.filter((s) => s.status !== "unsubscribed");
    const header = "email,source,subscribed_at,status\r\n";
    const body = active
      .map((r) => `${r.email},${r.source},${r.subscribedAt},${r.status || "active"}`)
      .join("\r\n");
    return new Response(header + body + "\r\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="subscribers.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(await managementPage(request, env, ""), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}