require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
const corsOptions = isProduction
  ? {} // Same origin in production, no CORS needed
  : { origin: ['http://localhost:5173', 'http://localhost:3000'] };
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for generated videos
app.use('/output', express.static(path.join(__dirname, '..', 'output')));

// API Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React frontend in production
if (isProduction) {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientBuildPath));
  // Fallback: semua route non-API diarahkan ke React (untuk React Router)
  app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 NyarProject API Server running on port ${PORT}`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`);
  console.log(`🔬 Health Check: http://localhost:${PORT}/health\n`);
});
