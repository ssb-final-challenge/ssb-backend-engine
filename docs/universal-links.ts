const domain = process.env.UNIVERSAL_LINK_DOMAIN ?? "ssb-backend-engine.vercel.app";
const teamId = process.env.APPLE_TEAM_ID ?? "YOUR_TEAM_ID";
const bundleIds = (process.env.APPLE_BUNDLE_IDS ?? process.env.APPLE_BUNDLE_ID ?? "")
  .split(",").map((value) => value.trim()).filter(Boolean);

export function appleAppSiteAssociation() {
  return {
    applinks: {
      apps: [],
      details: bundleIds.map((bundleId) => ({
        appID: `${teamId}.${bundleId}`,
        paths: ["/join/*"]
      }))
    }
  };
}

export function joinRoomHtml(roomCode: string) {
  const safeRoomCode = roomCode.replace(/[^a-zA-Z0-9_-]/g, "");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Join Beansight Inspection</title><meta name="apple-itunes-app" content="app-argument:https://${domain}/join/${safeRoomCode}"><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:620px;margin:0 auto;padding:40px 22px;line-height:1.6}button{padding:12px 18px;border:0;border-radius:8px;background:#1769aa;color:white;font-size:16px}</style></head><body><h1>Join Beansight inspection</h1><p>Room code: <strong>${safeRoomCode}</strong></p><p>If Beansight is installed, tap the shared link again to open the app. Otherwise install Beansight and return to this link.</p><button onclick="location.href='https://${domain}/join/${safeRoomCode}'">Open Beansight</button></body></html>`;
}
