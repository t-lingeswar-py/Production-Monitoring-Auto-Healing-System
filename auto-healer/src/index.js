const express = require('express');
const cors = require('cors');
const client = require('prom-client');
const state = require('./state');
const { executeRemediation } = require('./remediation');

const app = express();
const PORT = process.env.AUTO_HEALER_PORT || 4000;

app.use(cors());
app.use(express.json());

// Prometheus Metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'auto_healer_' });

const webhookPayloadsCounter = new client.Counter({
  name: 'alertmanager_webhooks_received_total',
  help: 'Total count of Alertmanager webhook payloads received'
});
register.registerMetric(webhookPayloadsCounter);

const autoHealActionsCounter = new client.Counter({
  name: 'auto_heal_actions_executed_total',
  help: 'Total auto-healing actions executed by alert name',
  labelNames: ['alert_name', 'status']
});
register.registerMetric(autoHealActionsCounter);

// Prometheus endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Alertmanager Webhook Receiver
app.post('/webhook/alerts', async (req, res) => {
  webhookPayloadsCounter.inc();
  const payload = req.body;
  
  console.log(`[AUTO-HEALER] 🔔 Webhook received payload from Alertmanager. Status: ${payload.status}`);
  
  const alerts = payload.alerts || [];
  const results = [];

  for (const alert of alerts) {
    if (alert.status === 'firing') {
      const result = await executeRemediation(alert);
      autoHealActionsCounter.inc({ alert_name: result.alertName, status: result.status });
      results.push(result);
    } else {
      console.log(`[AUTO-HEALER] ℹ️ Alert resolved: ${alert.labels ? alert.labels.alertname : 'Unknown'}`);
    }
  }

  res.status(200).json({
    status: 'received',
    alertsProcessed: alerts.length,
    remediationsExecuted: results.length,
    results
  });
});

// Direct Manual Healing / Chaos Trigger from Command Center UI
app.post('/api/healer/trigger-manual-healing', async (req, res) => {
  const { alertName, severity, summary } = req.body;
  const mockAlert = {
    labels: { alertname: alertName || 'ManualHealingTriggered', severity: severity || 'critical' },
    annotations: { summary: summary || 'User initiated manual auto-healing routine from Command Center' }
  };

  const result = await executeRemediation(mockAlert);
  res.json({ success: true, incident: result });
});

// Audit Log & Stats API for Dashboard
app.get('/api/healer/incidents', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({
    incidents: state.getIncidents(limit),
    stats: state.getStats()
  });
});

app.get('/api/healer/stats', (req, res) => {
  res.json(state.getStats());
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'auto-healer', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🛡️ Auto-Recovery Webhook Daemon running on port ${PORT}`);
  console.log(`📡 Alertmanager webhook URL: http://localhost:${PORT}/webhook/alerts`);
});
