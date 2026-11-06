import express from "express";
import { AccessToken } from "livekit-server-sdk";

const app = express();
app.use(express.json());

app.post("/api/livekit/token", async (req, res) => {
  const { roomName, identity, role } = req.body ?? {};
  if (!roomName || !identity || !["farmer", "buyer"].includes(role)) {
    return res.status(400).json({ error: "roomName, identity, and role are required" });
  }

  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity,
    name: identity,
    ttl: "2h"
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: role === "farmer",
    canPublishData: true,
    canSubscribe: true
  });

  res.json({ serverUrl: process.env.LIVEKIT_URL, participantToken: await token.toJwt(), roomName, role });
});

app.get("/health", (_, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 8787, () => console.log("LiveKit token API listening"));
