import express from "express";
import cors from "cors";
import contactsRouter from "./routes/contacts.js";
import usersRouter from "./routes/users.js";
import aiRouter from "./routes/ai.js";
import analyticsRouter from "./routes/analytics.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increased for audio uploads

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/contacts", contactsRouter);
app.use("/api/user", usersRouter);
app.use("/api/ai", aiRouter);
app.use("/api/analytics", analyticsRouter);

export default app;
