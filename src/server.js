const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config/index');
require('./config/firebase'); // initialize firebase

// Route imports
const authRoutes = require('./routes/auth');
const countryRoutes = require('./routes/countries');
const kycRoutes = require('./routes/kyc');
const applicationRoutes = require('./routes/applications');
const documentRoutes = require('./routes/documents');
const universityRoutes = require('./routes/universities');
const scholarshipRoutes = require('./routes/scholarships');
const visaRoutes = require('./routes/visa');
const activityRoutes = require('./routes/activity');

const consultantCrmRoutes = require('./routes/consultant/crm');
const consultantInsightsRoutes = require('./routes/consultant/insights');
const consultantDocVerificationRoutes = require('./routes/consultant/documentVerification');
const consultantNoteRoutes = require('./routes/consultant/note');

const adminKycRoutes = require('./routes/admin/kycVerification');
const adminAiRoutes = require('./routes/admin/aiMonitoring');
const adminRolesRoutes = require('./routes/admin/roles');
const adminAuditRoutes = require('./routes/admin/auditLogs');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const adminUsersRoutes = require('./routes/admin/users');
const adminApplicationsRoutes = require('./routes/admin/applications');
const universityDashboardRoutes = require('./routes/universityDashboard');
const messagesRoutes = require('./routes/messages');
const webRoutes = require('./routes/web');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.corsOrigin.split(','), credentials: true },
});

// View engine for web dashboard
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.socket.io"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      fontSrc: ["'self'", "https:", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://avyra-api.onrender.com", "wss://avyra-api.onrender.com"],
      frameSrc: ["'self'", "https://meet.jit.si"],
      upgradeInsecureRequests: [],
    },
  },
}));
const corsOrigins = config.corsOrigin ? config.corsOrigin.split(',').map(s => s.trim()).filter(Boolean) : ['http://localhost:3000'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) return cb(null, true);
    cb(null, true); // allow all for dev
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files for web dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Avyra API', version: '1.0.0', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/scholarships', scholarshipRoutes);
app.use('/api/visa', visaRoutes);
app.use('/api/activity', activityRoutes);

// Consultant routes
app.use('/api/consultant/crm', consultantCrmRoutes);
app.use('/api/consultant/insights', consultantInsightsRoutes);
app.use('/api/consultant/documents', consultantDocVerificationRoutes);
app.use('/api/consultant/notes', consultantNoteRoutes);

// Admin routes
app.use('/api/admin/kyc', adminKycRoutes);
app.use('/api/admin/ai', adminAiRoutes);
app.use('/api/admin/roles', adminRolesRoutes);
app.use('/api/admin/audit-logs', adminAuditRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/applications', adminApplicationsRoutes);
app.use('/api/universities/dashboard', universityDashboardRoutes);
app.use('/api/messages', messagesRoutes);

// Web dashboard routes
app.use('/', webRoutes);

// WebSocket
const chatHandler = require('./socket/chat');
const notificationHandler = require('./socket/notifications');

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-room', (userId) => {
    socket.join(`user:${userId}`);
    socket.userId = userId;
  });

  chatHandler(io, socket);
  notificationHandler(io, socket);
  require('./socket/video')(io, socket);

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

app.set('io', io);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
server.listen(config.port, () => {
  console.log(`Avyra API running on port ${config.port} (${config.nodeEnv})`);
  console.log(`Health check: http://localhost:${config.port}/api/health`);
});

module.exports = { app, server, io };
