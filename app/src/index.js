const express = require('express');
const cors = require('cors');
const logger = require('./logger');
const db = require('./db');
const {
  register,
  httpRequestCounter,
  httpRequestDurationHistogram,
  activeAnomaliesGauge,
  autoHealingCounter
} = require('./metrics');

const app = express();
const PORT = process.env.PORT || 3000;

// Memory leak simulation storage
let memoryLeakArray = [];
let artificialLatencyMs = 0;
let isUnhealthyState = false;

app.use(cors());
app.use(express.json());

// Telemetry Middleware: Track request metrics & durations
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestCounter.inc({ method: req.method, route, status_code: res.statusCode });
    httpRequestDurationHistogram.observe({ method: req.method, route, status_code: res.statusCode }, duration);
  });

  if (artificialLatencyMs > 0) {
    setTimeout(next, artificialLatencyMs);
  } else {
    next();
  }
});

// ----------------------------------------------------
// Core Application & Prometheus Endpoints
// ----------------------------------------------------

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    logger.error('Error serving metrics', { error: ex.message });
    res.status(500).end(ex);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = db.getStatus();
  const memory = process.memoryUsage();
  
  if (isUnhealthyState || !dbStatus.connected) {
    logger.warn('Health check reported UNHEALTHY state', { isUnhealthyState, dbConnected: dbStatus.connected });
    return res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      service: 'backend-app',
      unhealthyState: isUnhealthyState,
      database: dbStatus
    });
  }

  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'backend-app',
    uptime: process.uptime(),
    memory: {
      heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024)
    },
    database: dbStatus
  });
});

// Business Logic API Endpoints
app.get('/api/users', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM users LIMIT 10');
    res.json({ success: true, count: 5, data: [
      { id: 1, name: 'Alice Smith', role: 'DevOps Lead' },
      { id: 2, name: 'Bob Jones', role: 'SRE Specialist' },
      { id: 3, name: 'Charlie Brown', role: 'System Admin' }
    ] });
  } catch (err) {
    res.status(503).json({ success: false, error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    await db.query('SELECT * FROM orders');
    res.json({ success: true, count: 3, items: ['Order #1001', 'Order #1002', 'Order #1003'] });
  } catch (err) {
    res.status(503).json({ success: false, error: err.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    app: 'Production Monitoring & Auto-Healing Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'production',
    anomaliesActive: memoryLeakArray.length > 0 || artificialLatencyMs > 0 || !db.getStatus().connected || isUnhealthyState,
    artificialLatencyMs,
    memoryLeakChunks: memoryLeakArray.length,
    dbConnected: db.getStatus().connected,
    isUnhealthyState
  });
});

// ----------------------------------------------------
// Chaos Engineering Endpoints (Simulate Production Incidents)
// ----------------------------------------------------

// 1. Memory Leak Simulation
app.post('/api/chaos/leak-memory', (req, res) => {
  const mbToLeak = req.body.mb || 150;
  logger.warn(`CHAOS INJECTION: Simulating ${mbToLeak}MB memory allocation`);
  
  try {
    const buffer = Buffer.alloc(mbToLeak * 1024 * 1024, 'X');
    memoryLeakArray.push(buffer);
    activeAnomaliesGauge.inc();
    
    res.json({
      message: `Memory leak injected: Allocated ${mbToLeak}MB`,
      totalLeakBuffers: memoryLeakArray.length,
      currentHeapMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
  } catch (err) {
    logger.error('Failed to allocate memory buffer', { error: err.message });
    res.status(500).json({ error: 'Allocation failed', details: err.message });
  }
});

// 2. Sever Database Connection
app.post('/api/chaos/db-disconnect', (req, res) => {
  db.severConnection();
  activeAnomaliesGauge.inc();
  res.json({ message: 'CHAOS INJECTED: Database connection severed' });
});

// 3. Inject High Latency
app.post('/api/chaos/latency', (req, res) => {
  artificialLatencyMs = req.body.ms || 2500;
  activeAnomaliesGauge.inc();
  logger.warn(`CHAOS INJECTED: High latency added (${artificialLatencyMs}ms per request)`);
  res.json({ message: `Artificial latency set to ${artificialLatencyMs}ms` });
});

// 4. Crash Service State (Health Check Fail)
app.post('/api/chaos/crash', (req, res) => {
  isUnhealthyState = true;
  activeAnomaliesGauge.inc();
  logger.error('CHAOS INJECTED: Backend service put into CRASH / UNHEALTHY state!');
  res.json({ message: 'Backend service status marked DOWN' });
});

// 5. Reset/Recover Chaos manually
app.post('/api/chaos/recover', (req, res) => {
  memoryLeakArray = [];
  artificialLatencyMs = 0;
  isUnhealthyState = false;
  db.reconnect();
  activeAnomaliesGauge.set(0);
  
  if (global.gc) {
    global.gc();
  }
  
  logger.info('CHAOS CLEARED: All simulated anomalies reverted.');
  res.json({ message: 'System state recovered manually' });
});

// ----------------------------------------------------
// Remediation API (Invoked by Auto-Healer Agent)
// ----------------------------------------------------

app.post('/api/remediate/clear-memory', (req, res) => {
  const freedChunks = memoryLeakArray.length;
  memoryLeakArray = [];
  if (global.gc) global.gc();
  autoHealingCounter.inc({ incident_type: 'MemoryExhaustion', action: 'GarbageCollect' });
  activeAnomaliesGauge.set(0);
  logger.info(`AUTO-HEALED: Purged ${freedChunks} memory leak buffers.`);
  res.json({ status: 'success', message: `Purged ${freedChunks} memory leak buffers` });
});

app.post('/api/remediate/reconnect-db', (req, res) => {
  const result = db.reconnect();
  autoHealingCounter.inc({ incident_type: 'DatabaseDown', action: 'PoolReset' });
  logger.info('AUTO-HEALED: Database pool reset & reconnected.');
  res.json({ status: 'success', result });
});

app.post('/api/remediate/reset-latency', (req, res) => {
  artificialLatencyMs = 0;
  autoHealingCounter.inc({ incident_type: 'HighLatency', action: 'FlushTrafficQueue' });
  logger.info('AUTO-HEALED: Latency queue flushed and reset to normal.');
  res.json({ status: 'success', message: 'Latency reset' });
});

app.post('/api/remediate/restart-service', (req, res) => {
  isUnhealthyState = false;
  memoryLeakArray = [];
  artificialLatencyMs = 0;
  db.reconnect();
  autoHealingCounter.inc({ incident_type: 'ServiceCrash', action: 'ProcessRestart' });
  logger.info('AUTO-HEALED: Simulated process restart completed. Service healthy.');
  res.json({ status: 'success', message: 'Service restarted & healthy' });
});

// Start Server
app.listen(PORT, () => {
  logger.info(`🚀 Backend Application running on port ${PORT}`);
  logger.info(`📊 Prometheus metrics available at http://localhost:${PORT}/metrics`);
  logger.info(`❤️ Health check endpoint available at http://localhost:${PORT}/api/health`);
});
