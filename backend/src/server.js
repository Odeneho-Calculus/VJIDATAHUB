require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const connectDB = require('./config/database');
const { startProviderBalanceCheckJob } = require('./jobs/checkProviderBalance');
const { startTopzaOrderStatusSyncJob } = require('./jobs/syncTopzaOrderStatus');

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true
  }
});

// Expose io globally
global.io = io;

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_store', (slug) => {
    socket.join(`store:${slug}`);
    console.log(`Socket ${socket.id} joined store room: ${slug}`);
  });

  // Client subscribes to VTU provider change broadcasts
  socket.on('join_vtu_updates', () => {
    socket.join('vtu_updates');
    console.log(`Socket ${socket.id} subscribed to VTU provider updates`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

connectDB();

if (process.env.BALANCE_CHECK_ENABLED !== 'false') {
  try {
    startProviderBalanceCheckJob();
  } catch (error) {
    console.error('Failed to initialize provider balance check job:', error.message);
  }
}

try {
  startTopzaOrderStatusSyncJob();
} catch (error) {
  console.error('Failed to initialize Topza status sync job:', error.message);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.path.endsWith('.jsx') || req.path.endsWith('.js')) {
    res.type('application/javascript');
  }
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/dataplans', require('./routes/dataplans'));
app.use('/api/xpresdata', require('./routes/xpresdata'));
app.use('/api/public', require('./routes/public'));
app.use('/api/guest', require('./routes/guest'));
app.use('/api/store', require('./routes/store'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upgrade', require('./routes/upgrade'));
app.use('/api/admin/notifications', require('./routes/notifications'));
app.use('/api/digimall', require('./routes/digimall'));
app.use('/api/topza', require('./routes/topza'));
app.use('/api/checkers', require('./routes/checkers'));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

const frontendDistPath = path.join(__dirname, '../../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');
const hasFrontendBuild = fs.existsSync(frontendIndexPath);

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));

  app.get(/.*/, (req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  console.log('[Server] Frontend build not found; running API-only mode.');
}

app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'Route not found',
    });
  }
  next();
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
