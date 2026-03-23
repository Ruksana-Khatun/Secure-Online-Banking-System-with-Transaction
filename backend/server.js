import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import authRoutes        from "./routes/auth.routes.js";
import accountRoutes     from "./routes/account.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import otpRoutes         from "./routes/otp.routes.js";
import adminRoutes       from "./routes/admin.routes.js";
import legacyRoutes      from "./routes/legacy.routes.js";
import bbpsRoutes        from "./routes/bbps.routes.js";
import digikhataPpiRoutes from "./routes/digikhataPpi.routes.js";
import aepsRoutes        from "./routes/aeps.routes.js";

// ─────────────────────────────────────────────
// ENV Check
// ─────────────────────────────────────────────
const requiredEnv = ["MONGO_URI", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];
const missingEnv  = requiredEnv.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`❌ Missing required env vars: ${missingEnv.join(", ")}`);
  console.error("Create backend/.env (you can copy from backend/.env.example).");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1);

// ─────────────────────────────────────────────
// Security Middleware
// ─────────────────────────────────────────────
app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
      : ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials:         true,
    methods:             ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders:      ["Content-Type", "Authorization", "X-Requested-With"],
    preflightContinue:   false,
    optionsSuccessStatus: 200,
  })
);
app.options("*", cors());

// ─────────────────────────────────────────────
// Rate Limiters
// ─────────────────────────────────────────────


const isDevelopmentOrMock = process.env.NODE_ENV === 'development' || process.env.AEPS_MODE === 'mock';

const authLimiter = rateLimit({
  windowMs:       15 * 60 * 1000, // 15 min
  max:            30,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: "Too many requests, try again later." },
  skip: (req) => isDevelopmentOrMock, // Skip rate limiter in dev/mock mode
});

// ✅ Bug Fix #3: apiLimiter ab use ho raha hai
const apiLimiter = rateLimit({
  windowMs:       60 * 1000, // 1 min
  max:            120,
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: "Too many requests, try again later." },
  skip: (req) => isDevelopmentOrMock, // Skip rate limiter in dev/mock mode
});

const aepsLimiter = rateLimit({
  windowMs:       60 * 1000, // 1 min
  max:            30,         // AEPS pe strict limit
  standardHeaders: true,
  legacyHeaders:  false,
  message: { success: false, message: "Too many AEPS requests, try again later." },
  skip: (req) => isDevelopmentOrMock, // Skip AEPS rate limiter in dev/mock mode
});

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ ok: true, timestamp: new Date() }));
app.get("/check",  (_, res) => res.send("Server is running ✅"));

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────


app.use("/api/aeps", aepsLimiter, aepsRoutes);


app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/otp",  authLimiter, otpRoutes); 


app.use("/api/accounts",     apiLimiter, accountRoutes);
app.use("/api/transactions",  apiLimiter, transactionRoutes);
app.use("/api/bbps",          apiLimiter, bbpsRoutes);
app.use("/api/ppi",           apiLimiter, digikhataPpiRoutes);
app.use("/api/admin",         adminRoutes); 
// app.use("/",                  legacyRoutes);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () =>
      console.log(`🚀 API running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    process.exit(1);
  }
})();