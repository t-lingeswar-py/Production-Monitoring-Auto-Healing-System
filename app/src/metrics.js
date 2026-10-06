const client = require('prom-client');

// Initialize default node metrics collection
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'backend_' });

// HTTP Request counter
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
});
register.registerMetric(httpRequestCounter);

// Request duration histogram
const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5]
});
register.registerMetric(httpRequestDurationHistogram);

// Active DB Connections Gauge
const dbConnectionGauge = new client.Gauge({
  name: 'db_connection_status',
  help: 'Database connection status (1 = Connected, 0 = Disconnected/Degraded)',
});
dbConnectionGauge.set(1);
register.registerMetric(dbConnectionGauge);

// Memory Heap Gauge
const memoryUsageGauge = new client.Gauge({
  name: 'heap_memory_bytes',
  help: 'Current node heap memory used in bytes',
});
register.registerMetric(memoryUsageGauge);

// Active Anomalies Gauge
const activeAnomaliesGauge = new client.Gauge({
  name: 'active_simulated_anomalies',
  help: 'Number of currently active chaos injection anomalies',
});
activeAnomaliesGauge.set(0);
register.registerMetric(activeAnomaliesGauge);

// Auto-Healing Recovery Counter
const autoHealingCounter = new client.Counter({
  name: 'auto_healing_recovery_count_total',
  help: 'Total count of auto-healing self-recovery actions executed',
  labelNames: ['incident_type', 'action']
});
register.registerMetric(autoHealingCounter);

// Dynamic Memory Heap updating
setInterval(() => {
  const mem = process.memoryUsage();
  memoryUsageGauge.set(mem.heapUsed);
}, 2000);

module.exports = {
  register,
  httpRequestCounter,
  httpRequestDurationHistogram,
  dbConnectionGauge,
  memoryUsageGauge,
  activeAnomaliesGauge,
  autoHealingCounter
};
