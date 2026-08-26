import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ linkify: true, breaks: false });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const KEY = process.env.BUTTONDOWN_API_KEY;
if (!KEY) {
  console.error("Missing BUTTONDOWN_API_KEY. Run: BUTTONDOWN_API_KEY=xxx node scripts/send-test-email.mjs [season]");
  process.exit(1);
}

const season = process.argv[2] || "fall";
const DRAFTS = {
  fall: { subject: "Fall Property-Care Tips from Property Care", file: "src/emails/fall.md" },
};
const draft = DRAFTS[season];
if (!draft) {
  console.error(`No draft for season "${season}". Available: ${Object.keys(DRAFTS).join(", ")}`);
  process.exit(1);
}

const markdown = readFileSync(join(root, draft.file), "utf8").trim();
const html = md.render(markdown);
const API = "https://api.buttondown.email/v1";
const headers = { Authorization: `Token ${KEY}`, "Content-Type": "application/json" };

const createRes = await fetch(`${API}/emails`, {
  method: "POST",
  headers,
  body: JSON.stringify({ subject: draft.subject, body: html, status: "draft" }),
});
if (!createRes.ok) {
  console.error("Create draft failed:", createRes.status, await createRes.text());
  process.exit(1);
}
const email = await createRes.json();
console.log("Draft created:", email.id);
console.log("Preview:", email.absolute_url);

const testRes = await fetch(`${API}/emails/${email.id}/send-draft`, {
  method: "POST",
  headers: { ...headers, "X-Buttondown-Test-Mode": "true" },
  body: JSON.stringify({}),
});
if (!testRes.ok) {
  console.error("Test send failed:", testRes.status, await testRes.text());
  process.exit(1);
}
console.log("Test email sent (Test Mode) — redirected to cmoneyq11@gmail.com.");
