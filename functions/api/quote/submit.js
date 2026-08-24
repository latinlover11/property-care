import { sendMail } from "../../_lib/smtp.js";
import { verifyTurnstile } from "../../_lib/turnstile.js";

function sanitize(value, maxLen = 1000) {
  return String(value || "").trim().slice(0, maxLen);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const clientIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const token = request.headers.get("X-Turnstile") || "";
  if (!(await verifyTurnstile(token, "quote", clientIp, env))) {
    return Response.json({ ok: false, error: "Security check failed. Please try again." }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = sanitize(body.customer_name);
  const email = sanitize(body.customer_email);
  const phone = sanitize(body.customer_phone);
  const address = sanitize(body.address);
  const notes = sanitize(body.notes);
  const serviceType = sanitize(body.service_type);
  const sqft = sanitize(body.square_footage);
  const propertyType = sanitize(body.property_type);
  const extras = Array.isArray(body.extras) ? body.extras.map((e) => sanitize(e)).join(", ") : "";
  const low = Number(body.estimated_price_low);
  const high = Number(body.estimated_price_high);

  if (!name || (!email && !phone)) {
    return Response.json({ ok: false, error: "Name and phone or email are required" }, { status: 400 });
  }

  const user = env.FORM_SMTP_USER;
  const pass = env.FORM_SMTP_PASS;
  const to = env.FORM_TO_EMAIL || (user ? user : "");
  if (!user || !pass || !to) {
    return Response.json({ ok: false, error: "SMTP not configured" }, { status: 500 });
  }

  const subject = `Instant Quote Request from ${name}`;
  const text = [
    "New instant quote request from property-care.pages.dev",
    "",
    `Name: ${name}`,
    `Email: ${email || "n/a"}`,
    `Phone: ${phone || "n/a"}`,
    `Address: ${address || "n/a"}`,
    "",
    `Service: ${serviceType || "n/a"}`,
    `Size: ${sqft ? sqft + " sq ft" : "n/a"}`,
    `Property: ${propertyType ? propertyType.replace(/_/g, " ") : "n/a"}`,
    `Extras: ${extras || "none"}`,
    `Estimated Range: ${Number.isFinite(low) && Number.isFinite(high) ? "$" + low + " - $" + high : "n/a"}`,
    "",
    "Additional Notes:",
    notes || "(none provided)",
    "",
    `Submitted: ${new Date().toUTCString()}`,
  ].join("\r\n");

  try {
    await sendMail({ user, pass, to, subject, text });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Quote submission failed:", err);
    return Response.json({ ok: false, error: "Submission failed. Please call us instead." }, { status: 500 });
  }
}