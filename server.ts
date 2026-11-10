import express from "express";
import { AccessToken } from "livekit-server-sdk";
import authRouter from "./routes/auth-route.js";
import inspectionRouter from "./routes/inspection-route.js";

type Role = "farmer" | "buyer";
interface LiveKitTokenRequest { roomName?: unknown; identity?: unknown; role?: unknown; }

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const livekitUrl = process.env.LIVEKIT_URL;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
  throw new Error("LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are required");
}

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/inspections", inspectionRouter);

app.post("/api/livekit/token", async (req, res): Promise<void> => {
  const { roomName, identity, role } = (req.body ?? {}) as LiveKitTokenRequest;
  if (typeof roomName !== "string" || typeof identity !== "string" || !["farmer", "buyer"].includes(String(role))) {
    res.status(400).json({ error: "roomName, identity, and role are required" });
    return;
  }

  const participantRole = role as Role;
  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity,
    name: identity,
    ttl: "2h"
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: participantRole === "farmer",
    canPublishData: true,
    canSubscribe: true
  });

  res.json({ serverUrl: livekitUrl, participantToken: await token.toJwt(), roomName, role: participantRole });
});

app.get("/health", (_, res) => res.json({ ok: true }));
app.listen(port, () => console.log(`LiveKit token API listening on ${port}`));
