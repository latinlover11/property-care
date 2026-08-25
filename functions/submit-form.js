import { sendMail } from "./_lib/smtp.js";
import { verifyTurnstile } from "./_lib/turnstile.js";
import { isValidEmail, captureSubscriber } from "./_lib/subscribers.js";

function sanitize(value) {
  return String(value || "").trim().slice(0, 2000);
}

async function saveReview(env, review) {
  if (!env.REVIEWS) return;
  try {
    await env.REVIEWS.put(
      `pending:${review.id}`,
      JSON.stringify({ ...review, status: "pending" })
    );
  } catch (err) {
    console.error("Failed to store review in KV:", err);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const formData = await request.formData();
  const isHoneypot = Boolean(formData.get("bot-field"));
  const formName = sanitize(formData.get("form-name")) || "contact";

  const user = env.FORM_SMTP_USER;
  const pass = env.FORM_SMTP_PASS;
  const to = env.FORM_TO_EMAIL || (user ? user : "");

  if (isHoneypot) {
    return Response.redirect(`${new URL(request.url).origin}/success`, 303);
  }

  const expectedAction = formName === "newsletter" ? "newsletter" : formName === "review" ? "review" : "contact";
  const token = formData.get("cf-turnstile-response");
  const clientIp = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const valid = await verifyTurnstile(String(token || ""), expectedAction, clientIp, env);
  if (!valid) {
    return Response.json({ ok: false, error: "Security check failed. Please try again." }, { status: 403 });
  }

  if (!user || !pass || !to) {
    return Response.json({ ok: false, error: "SMTP not configured" }, { status: 500 });
  }

  let subject;
  let text;
  if (formName === "newsletter") {
    const email = sanitize(formData.get("email"));
    const consent = sanitize(formData.get("consent"));
    if (!isValidEmail(email)) {
      return Response.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
    }
    if (consent !== "yes") {
      return Response.json({ ok: false, error: "Please confirm you'd like to subscribe." }, { status: 400 });
    }

    await captureSubscriber(env, { email, source: "newsletter" });

    if (user && pass && to) {
      try {
        await sendMail({
          user, pass, to,
          subject: "New Newsletter Subscriber",
          text: [
            "A new subscriber joined the Property Care mailing list.",
            "",
            `Email: ${email}`,
            `Source: newsletter`,
            `Subscribed: ${new Date().toUTCString()}`,
          ].join("\r\n"),
        });
        // When Buttondown is active it sends its own welcome email — skip the
        // manual SMTP one to avoid sending the subscriber two welcome messages.
        if (!env.BUTTONDOWN_API_KEY) {
          await sendMail({
            user, pass, to: email,
            subject: "You're on the list — Property Care",
            text: [
              "Thanks for subscribing to Property Care updates!",
              "",
              "You'll get occasional seasonal tips, helpful home-maintenance reminders, and the",
              "odd offer — never spam, and you can unsubscribe anytime.",
              "",
              "In the meantime, if something on your property needs attention, just reply to this",
              "email or call us at (720) 707-5411.",
              "",
              "— Property Care",
              "",
              `To stop receiving these emails: ${new URL(request.url).origin}/unsubscribe?email=${encodeURIComponent(email)}`,
            ].join("\r\n"),
          });
        }
      } catch (err) {
        console.error("Subscriber notification email failed:", err);
      }
    }

    return Response.redirect(`${new URL(request.url).origin}/success`, 303);
  } else if (formName === "review") {
    const name = sanitize(formData.get("name"));
    const rating = sanitize(formData.get("rating"));
    const serviceType = sanitize(formData.get("service-type"));
    const review = sanitize(formData.get("review"));

    if (!name || !review) {
      return Response.json({ ok: false, error: "Name and review are required" }, { status: 400 });
    }

    subject = `New ${rating}-Star Review from ${name}`;
    text = [
      "A new customer review was submitted on property-care.pages.dev.",
      "",
      `Name: ${name}`,
      `Rating: ${rating || "n/a"} / 5`,
      `Service: ${serviceType || "n/a"}`,
      "",
      "Review:",
      review,
      "",
      `Submitted: ${new Date().toUTCString()}`,
    ].join("\r\n");

    await saveReview(env, {
      id: crypto.randomUUID(),
      name,
      rating: /^[1-5]$/.test(rating) ? Number(rating) : null,
      serviceType: serviceType || "",
      review,
      submittedAt: new Date().toISOString(),
    });
  } else {
    const name = sanitize(formData.get("name"));
    const phone = sanitize(formData.get("phone"));
    const address = sanitize(formData.get("address"));
    const email = sanitize(formData.get("email"));
    const serviceType = sanitize(formData.get("service-type"));
    const subscribe = sanitize(formData.get("subscribe"));
    if (subscribe === "yes" && isValidEmail(email)) {
      await captureSubscriber(env, { email, source: "contact" });
    }
    const preferredDate = sanitize(formData.get("preferred-date"));
    const when = sanitize(formData.get("when"));
    const estimate = sanitize(formData.get("estimate"));
    const consent = sanitize(formData.get("consent"));
    const message = sanitize(formData.get("message"));

    if (!name || (!phone && !email)) {
      return Response.json({ ok: false, error: "Name and phone or email are required" }, { status: 400 });
    }

    subject = `Estimate Request from ${name}`;
    text = [
      "New estimate request from property-care.pages.dev",
      "",
      `Name: ${name}`,
      `Phone: ${phone || "n/a"}`,
      `Property Address: ${address || "n/a"}`,
      `Email: ${email || "n/a"}`,
      `Service Needed: ${serviceType || "Not sure / Other"}`,
      `Preferred Date: ${preferredDate || "n/a"}`,
      `When: ${when || "n/a"}`,
      `Estimated Range: ${estimate || "n/a"}`,
      `Consent: ${consent === "yes" ? "Yes" : "No"}`,
      "",
      "Project Details:",
      message || "(none provided)",
      "",
      `Submitted: ${new Date().toUTCString()}`,
    ].join("\r\n");
  }

  try {
    await sendMail({ user, pass, to, subject, text });
    return Response.redirect(`${new URL(request.url).origin}/success`, 303);
  } catch (err) {
    console.error("Form submission failed:", err);
    return Response.json({ ok: false, error: "Submissions currently unavailable. Please call." }, { status: 500 });
  }
}