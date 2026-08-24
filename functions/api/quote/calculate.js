import { PRICING, roundRange } from "../../_lib/pricing.js";
import { verifyTurnstile } from "../../_lib/turnstile.js";

const RATE_LIMIT_PREFIX = "rate-limit:";
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_TTL = 600; // seconds (10 minutes)

const PROPERTY_MULTIPLIER = {
  front_yard: 1.0,
  back_yard: 1.05,
  full_property: 0.92,
};

export async function onRequestPost(context) {
  const { env, request } = context;

  const clientIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const token = request.headers.get("X-Turnstile") || "";
  if (!(await verifyTurnstile(token, "quote", clientIp, env))) {
    return Response.json({ ok: false, error: "Security check failed. Please try again." }, { status: 403 });
  }

  const ipKey = `${RATE_LIMIT_PREFIX}${clientIp}`;
  const existing = await env.REVIEWS.get(ipKey);
  const count = existing ? parseInt(existing) : 0;
  if (count >= RATE_LIMIT_MAX) {
    return Response.json({ ok: false, error: "Too many requests. Please wait 10 minutes." }, { status: 429 });
  }
  await env.REVIEWS.put(ipKey, String(count + 1), { expirationTTL: RATE_LIMIT_TTL * 1000 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const service_key = String(body.service_type || body.service || "").trim();
  const sqft = Number(body.square_footage || body.sqft || 0);
  const propertyType = String(body.property_type || "full_property").trim();
  const extras = Array.isArray(body.extras) ? body.extras.map(String) : [];

  const service = PRICING[service_key];
  if (!service) {
    return Response.json({ ok: false, error: "Unknown service" }, { status: 400 });
  }
  if (!Number.isFinite(sqft) || sqft < 1 || sqft > 100000) {
    return Response.json({ ok: false, error: "Missing or invalid size" }, { status: 400 });
  }

  const mult = PROPERTY_MULTIPLIER[propertyType] ?? 1.0;

  const low = sqft * service.rate[0] * mult;
  const high = sqft * service.rate[1] * mult;

  let extrasLow = 0;
  let extrasHigh = 0;
  const chosenExtras = (service.extras || []).filter((e) => extras.includes(e.id));
  chosenExtras.forEach((e) => {
    extrasLow += e.range[0];
    extrasHigh += e.range[1];
  });

  return Response.json({
    ok: true,
    service: service.label,
    unit: service.unit,
    low: roundRange(low + extrasLow),
    high: roundRange(high + extrasHigh),
    extras: chosenExtras.map((e) => e.label),
  });
}