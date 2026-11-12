const copyrightOwner = process.env.COPYRIGHT_OWNER ?? "Beansight";
const copyrightEmail = process.env.COPYRIGHT_EMAIL ?? process.env.SUPPORT_EMAIL ?? "legal@example.com";
const currentYear = new Date().getFullYear();

export const copyrightHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beansight Copyright</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;max-width:820px;margin:0 auto;padding:32px 20px;color:#222}h1,h2{line-height:1.2}a{color:#1769aa}</style></head>
<body><h1>Beansight Copyright</h1><p>© ${currentYear} ${copyrightOwner}. All rights reserved.</p>
<h2>Copyright ownership</h2><p>The Beansight name, logo, application software, original interface designs, documentation, and service content are owned by ${copyrightOwner} or used under license.</p>
<h2>User-submitted content</h2><p>You retain ownership of images, notes, coffee lot information, and other content you submit. You grant Beansight the limited permission needed to host, process, display, and share that content with authorized participants in the inspection workflow.</p>
<h2>Third-party content</h2><p>Apple, LiveKit, Supabase, and other third-party names and services belong to their respective owners. Beansight does not claim ownership of third-party trademarks or materials.</p>
<h2>Permission and infringement requests</h2><p>For copyright ownership questions, permission requests, or infringement notices, contact <a href="mailto:${copyrightEmail}">${copyrightEmail}</a>. Include the relevant work, your contact details, and the reason for your request.</p>
<p><a href="/support">Support</a> · <a href="/privacy-policy">Privacy Policy</a></p>
</body></html>`;

export const copyrightJson = { app: "Beansight", owner: copyrightOwner, year: currentYear, contact: copyrightEmail };
