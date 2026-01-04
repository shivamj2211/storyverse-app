import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";

import authRoutes from "./routes/auth";
import storiesRoutes from "./routes/stories";
import runsRoutes from "./routes/runs";
import savedRoutes from "./routes/saved";
import ratingsRoutes from "./routes/ratings";
import premiumRoutes from "./routes/premium";
import adminRoutes from "./routes/admin";
import genresRouter from "./routes/genres";
import coinsRouter from "./routes/coins";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Example: postgresql://postgres:YOURPASS@localhost:5432/storyverse"
  );
}
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required.");
}

const app = express();

// ✅ request log (keep)


const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "https://storyverse-surkashi-kerhffc7q-shivam-jaiswals-projects-49ca0bd9.vercel.app",
];

// ✅ CORS MUST BE BEFORE ALL ROUTES
const corsMiddleware = cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.endsWith(".vercel.app")) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.use(corsMiddleware);

// ✅ IMPORTANT: answer preflight for ALL routes
app.options("*", corsMiddleware);

// 🔴 Stripe webhook MUST be before express.json()
app.use("/api/premium/webhook", bodyParser.raw({ type: "application/json" }));

// normal json
app.use(express.json());

// ✅ Routes (after CORS!)
app.use("/api/coins", coinsRouter);
app.use("/api/auth", authRoutes);
app.use("/api/genres", genresRouter);
app.use("/api/stories", storiesRoutes);
app.use("/api/runs", runsRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
