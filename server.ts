import express from "express";
import authRouter from "./routes/auth-route.js";
import inspectionRouter from "./routes/inspection-route.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/inspections", inspectionRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/inspections", inspectionRouter);

app.get("/health", (_, res) => res.json({ ok: true }));
app.listen(port, () => console.log(`SSB API listening on ${port}`));
