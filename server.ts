import express from "express";
import cors from "cors";
import authRouter from "./routes/auth-route.js";
import inspectionRouter from "./routes/inspection-route.js";
import { openapi } from "./docs/openapi.js";
import { privacyPolicyHtml } from "./docs/privacy-policy.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const app = express();
app.use(cors());
app.use(express.json());
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

app.get("/health", (_, res) => res.json({ ok: true }));
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`SSB API listening on ${port}`));
}

export { app };
export default app;
