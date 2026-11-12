const supportEmail = process.env.SUPPORT_EMAIL ?? process.env.PRIVACY_CONTACT_EMAIL ?? "support@example.com";
const supportUrl = process.env.SUPPORT_URL ?? "https://ssb-backend-engine.vercel.app/support";

export const supportHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beansight Support</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;max-width:820px;margin:0 auto;padding:32px 20px;color:#222}h1,h2{line-height:1.2}a{color:#1769aa}</style></head>
<body><h1>Beansight Support</h1><p>We help coffee sellers and buyers use Beansight for collaborative quality inspections.</p>
<h2>Contact support</h2><p>Email us at <a href="mailto:${supportEmail}">${supportEmail}</a>. Please include your account email, device model, app version, and a description of the issue. Do not send passwords or private authentication tokens.</p>
<h2>Common help</h2><ul><li><strong>Sign in:</strong> use email/password or Sign in with Apple.</li><li><strong>Join an inspection:</strong> ask the room owner for the room code, then join from the inspection screen.</li><li><strong>Inspection results:</strong> make sure the seller has uploaded the image and AI analysis before refreshing history.</li><li><strong>Live inspection:</strong> check camera permissions, internet access, and that both participants use the same room code.</li></ul>
<h2>Response time</h2><p>We aim to respond to support requests within two business days.</p>
<h2>Additional resources</h2><p><a href="${supportUrl}">Support page</a> · <a href="/privacy-policy">Privacy Policy</a> · <a href="/copyright">Copyright</a></p>
</body></html>`;

export const supportJson = { app: "Beansight", email: supportEmail, supportUrl, responseTime: "Within two business days" };
