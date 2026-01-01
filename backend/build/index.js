"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const auth_1 = __importDefault(require("./routes/auth"));
const stories_1 = __importDefault(require("./routes/stories"));
const runs_1 = __importDefault(require("./routes/runs"));
const saved_1 = __importDefault(require("./routes/saved"));
const ratings_1 = __importDefault(require("./routes/ratings"));
const premium_1 = __importDefault(require("./routes/premium"));
const admin_1 = __importDefault(require("./routes/admin"));
const genres_1 = __importDefault(require("./routes/genres"));
dotenv_1.default.config();
// 🔴 HARD ENV VALIDATION (DO NOT REMOVE)
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Example: postgresql://postgres:YOURPASS@localhost:5432/storyverse");
}
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required.");
}
const app = (0, express_1.default)();
// 🔴 Stripe webhook MUST be before express.json()
app.use("/api/premium/webhook", body_parser_1.default.raw({ type: "application/json" }));
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
// Routes (specific routes first, then dynamic routes)
app.use("/api/auth", auth_1.default);
app.use("/api/genres", genres_1.default); // Must come before /api/stories to avoid /:id catching it
app.use("/api/stories", stories_1.default);
app.use("/api/runs", runs_1.default);
app.use("/api/saved", saved_1.default);
app.use("/api/ratings", ratings_1.default);
app.use("/api/premium", premium_1.default);
app.use("/api/admin", admin_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
});
