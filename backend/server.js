import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';


import authRoutes from './routes/auth.routes.js';
import accountRoutes from './routes/account.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import otpRoutes from "./routes/otp.routes.js";
import adminRoutes from "./routes/admin.routes.js";

dotenv.config();


const app = express();


// Security + parsers
app.use(helmet());
app.use(hpp());
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));


// Rate limiters
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });


app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes)
app.use("/api/otp", otpRoutes);
app.use("/api/admin", adminRoutes);


app.get('/health', (_, res) => res.json({ ok: true }));
app.get("/check",(req,res)=>{
    res.send("Server is running");
})

const PORT = process.env.PORT || 5000;


(async () => {
try {
await mongoose.connect(process.env.MONGO_URI);
console.log('MongoDB connected');
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
} catch (err) {
console.error('DB connection failed', err);
process.exit(1);
}
})();