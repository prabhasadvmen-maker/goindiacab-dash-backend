import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import adminAuthRoutes from './routes/adminAuthRoutes.js';
import partnerRoutes from './routes/partnerRoutes.js';
import userAuthRoutes from './routes/userAuthRoutes.js';
import configRoutes from './routes/configRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import adminComplaintRoutes from './routes/adminComplaintRoutes.js';
import http from 'http';
import { initSocket } from './socket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// CORS setup
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// JSON Body Parser with increased limit for Base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Rate Limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: { success: false, message: 'Too many OTP requests. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/admins/complaints', adminComplaintRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/v1/user/auth/send-otp', otpLimiter);
app.use('/api/v1/user/auth/resend-otp', otpLimiter);
app.use('/api/v1/user/auth/login', authLimiter);
app.use('/api/v1/user/auth/register', authLimiter);
app.use('/api/v1/user/auth', userAuthRoutes);
app.use('/api/config', configRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'GoIndiaCab SuperAdmin API is running' });
});

const PORT = process.env.PORT || 5000;

// Connect DB then start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server & Socket.io running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error(`Database connection error: ${err.message}`);
  });
