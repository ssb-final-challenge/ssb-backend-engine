const contactEmail = process.env.PRIVACY_CONTACT_EMAIL ?? "privacy@example.com";

export const privacyPolicyHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beansight Privacy Policy</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.6;max-width:820px;margin:0 auto;padding:32px 20px;color:#222}h1,h2{line-height:1.2}small{color:#666}a{color:#1769aa}</style></head>
<body><h1>Beansight Privacy Policy</h1><small>Last updated: November 11, 2026</small>
<p>Beansight helps coffee sellers and buyers conduct collaborative coffee quality inspections. This Privacy Policy explains how Beansight collects, uses, stores, and shares information when you use the Beansight mobile application and related services.</p>
<h2>Information we collect</h2>
<ul><li><strong>Account information:</strong> name, email address, role, and authentication identifiers.</li><li><strong>Sign in with Apple:</strong> Apple user identifier and, when provided by Apple, name and email address. We use the Apple user identifier as the account identifier.</li><li><strong>Inspection information:</strong> coffee lot details, inspection room membership, inspection images, sample metadata, AI model results, defect detections, notes, requests, and reports.</li><li><strong>Technical information:</strong> basic request, authentication, and service logs needed to operate and secure the service.</li></ul>
<h2>How we use information</h2><p>We use information to create and secure accounts, connect buyers and sellers in inspection rooms, store and display inspection evidence, generate reports, provide LiveKit collaboration features, maintain the service, prevent abuse, and respond to support requests.</p>
<h2>Sharing and service providers</h2><p>We share information only as needed to provide the service. Beansight uses infrastructure and service providers such as Supabase for database hosting, LiveKit for real-time collaboration, Apple for Sign in with Apple, and hosting providers for application delivery. These providers process information according to their own terms and privacy policies.</p>
<p>We do not sell personal information. Inspection evidence may be visible to members of the inspection room and other users authorized by the room workflow.</p>
<h2>Camera and images</h2><p>Beansight may access camera captures or images that you choose to submit for coffee inspection. Images are used to provide inspection evidence and analysis. Beansight does not access camera or microphone content outside the permissions and actions you grant in the app.</p>
<h2>Retention and deletion</h2><p>We retain account and inspection information while needed to provide the service, maintain records, resolve disputes, or meet legal obligations. You may request deletion of your account and associated personal information by contacting us. Some records may need to be retained where required by law or for legitimate security purposes.</p>
<h2>Security</h2><p>We use access controls, authenticated API requests, encrypted transport, and token verification to protect information. No internet service can guarantee absolute security.</p>
<h2>Children</h2><p>Beansight is not directed to children under 13, and we do not knowingly collect personal information from children under 13.</p>
<h2>International processing</h2><p>Your information may be processed in countries where Beansight or its service providers operate. We take reasonable steps to protect information during such processing.</p>
<h2>Your choices</h2><p>You may request access to, correction of, or deletion of your personal information, subject to applicable law. You can also stop using Sign in with Apple or the app at any time.</p>
<h2>Changes to this policy</h2><p>We may update this policy from time to time. The updated version will be posted on this page with a new effective date.</p>
<h2>Contact</h2><p>For privacy questions or requests, contact <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
</body></html>`;
