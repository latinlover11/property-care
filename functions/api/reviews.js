function sanitizeField(value, maxLen) {
  const s = String(value || "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.REVIEWS) {
    return Response.json({ ok: false, error: "Reviews not configured." }, { status: 503 });
  }

  const reviews = [];
  const list = await env.REVIEWS.list({ prefix: "approved:" });
  for (const key of list.keys) {
    const raw = await env.REVIEWS.get(key.name);
    if (!raw) continue;
    try {
      const record = JSON.parse(raw);
      reviews.push({
        name: sanitizeField(record.name, 80),
        rating: Number.isInteger(record.rating) && record.rating >= 1 && record.rating <= 5 ? record.rating : null,
        service: sanitizeField(record.serviceType, 60),
        text: sanitizeField(record.review, 600),
        date: record.approvedAt || record.submittedAt || null,
      });
    } catch {
      // skip corrupt record
    }
  }

  reviews.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return Response.json({ ok: true, count: reviews.length, reviews: reviews.slice(0, 12) }, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}