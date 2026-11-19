import express from "express";
import cors from "cors";
import authRouter from "./routes/auth-route.js";
import inspectionRouter from "./routes/inspection-route.js";
import { openapi } from "./docs/openapi.js";
import { privacyPolicyHtml } from "./docs/privacy-policy.js";
import { supportHtml, supportJson } from "./docs/support.js";
import { copyrightHtml, copyrightJson } from "./docs/copyright.js";
import { appleAppSiteAssociation, joinRoomHtml } from "./docs/universal-links.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(((error, _req, res, next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({ success: false, error: { code: "IMAGE_TOO_LARGE", message: "Gambar terlalu besar. Kurangi resolusi lalu coba lagi." } });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "Data permintaan tidak dapat dibaca." } });
    return;
  }
  next(error);
}) as express.ErrorRequestHandler);
app.use("/api/auth", authRouter);
app.use("/api/inspections", inspectionRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/inspections", inspectionRouter);
const swaggerHtml = `<!doctype html>
<html><head><title>SSB Inspection API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" /></head>
<body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
<script>window.onload = () => SwaggerUIBundle({ url: "/api/docs/openapi.json", dom_id: "#swagger-ui", presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset], layout: "StandaloneLayout" });</script>
</body></html>`;
app.get(["/api/docs", "/api/docs/"], (_req, res) => res.type("html").send(swaggerHtml));
app.get("/api/docs/openapi.json", (_req, res) => res.json(openapi));
app.get("/swagger", (_req, res) => res.redirect("/api/docs/"));
app.get("/swagger/openapi.json", (_req, res) => res.json(openapi));
app.get("/", (_req, res) => res.redirect("/api/docs/"));
app.get(["/privacy-policy", "/privacy-policy/", "/api/privacy-policy", "/api/v1/privacy-policy"], (_req, res) => res.type("html").send(privacyPolicyHtml));
app.get(["/support", "/support/", "/api/support", "/api/v1/support"], (_req, res) => res.type("html").send(supportHtml));
app.get(["/copyright", "/copyright/"], (_req, res) => res.type("html").send(copyrightHtml));
app.get(["/api/copyright", "/api/v1/copyright"], (_req, res) => res.json(copyrightJson));
app.get(["/api/support.json", "/api/v1/support.json"], (_req, res) => res.json(supportJson));
app.get("/.well-known/apple-app-site-association", (_req, res) => res.type("application/json").send(JSON.stringify(appleAppSiteAssociation())));
app.get("/join/:roomCode", (req, res) => res.type("html").send(joinRoomHtml(req.params.roomCode)));

app.get("/health", (_, res) => res.json({ ok: true }));
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`SSB API listening on ${port}`));
}

export { app };
export default app;
