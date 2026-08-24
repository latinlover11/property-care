export function expectedHostnames(env) {
  return new Set(
    (env.TURNSTILE_HOSTNAMES || "property-care.pages.dev")
      .split(",").map((h) => h.trim()).filter(Boolean)
  );
}

export async function verifyTurnstile(token, action, clientIp, env) {
  const secret = env.TURNSTILE_SECRET;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  if (!secret) return false;

  let result;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp }),
    });
    if (!res.ok) return false;
    result = await res.json();
  } catch {
    return false;
  }

  return result.success === true && result.action === action && expectedHostnames(env).has(result.hostname);
}