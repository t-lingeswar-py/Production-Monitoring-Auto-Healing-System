const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const HEALER_URL = process.env.HEALER_URL || 'http://localhost:4000';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for unified status
app.get('/api/overview', async (req, res) => {
  try {
    let backendData = { status: 'UNKNOWN' };
    let healerStats = { totalIncidentsDetected: 0 };
    let healerIncidents = [];

    try {
      const bRes = await fetch(`${BACKEND_URL}/api/health`);
      backendData = await bRes.json();
    } catch (e) {
      backendData = { status: 'DOWN', error: 'Backend unreachable' };
    }

    try {
      const hRes = await fetch(`${HEALER_URL}/api/healer/incidents?limit=15`);
      const hJson = await hRes.json();
      healerIncidents = hJson.incidents || [];
      healerStats = hJson.stats || {};
    } catch (e) {
      // Healer offline fallback
    }

    res.json({
      timestamp: new Date().toISOString(),
      backend: backendData,
      healer: healerStats,
      incidents: healerIncidents,
      urls: {
        grafana: process.env.GRAFANA_URL || 'http://localhost:3001',
        prometheus: process.env.PROMETHEUS_URL || 'http://localhost:9090',
        alertmanager: process.env.ALERTMANAGER_URL || 'http://localhost:9093'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy chaos injection endpoints to backend
app.post('/api/chaos/:action', async (req, res) => {
  const { action } = req.params;
  try {
    const targetUrl = `${BACKEND_URL}/api/chaos/${action}`;
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const json = await response.json();
    res.status(response.status).json(json);
  } catch (err) {
    res.status(500).json({ error: `Failed to invoke chaos action ${action}: ${err.message}` });
  }
});

// Proxy manual heal trigger
app.post('/api/trigger-heal', async (req, res) => {
  try {
    const response = await fetch(`${HEALER_URL}/api/healer/trigger-manual-healing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const json = await response.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: `Failed to trigger heal: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`💻 Command Center Dashboard running on http://localhost:${PORT}`);
});
