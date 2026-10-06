const state = require('./state');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

async function executeRemediation(alert) {
  const startTime = Date.now();
  const alertName = alert.labels ? alert.labels.alertname : (alert.alertName || 'UnknownAlert');
  const severity = alert.labels ? alert.labels.severity : (alert.severity || 'warning');
  const summary = alert.annotations ? alert.annotations.summary : (alert.summary || alertName);

  console.log(`[AUTO-HEALER] 🚨 Received Alert: [${severity.toUpperCase()}] ${alertName} - ${summary}`);

  let actionTaken = 'No action required';
  let endpoint = null;

  switch (alertName) {
    case 'BackendServiceDown':
    case 'BackendDown':
    case 'InstanceDown':
      actionTaken = 'Triggered Backend Container / Process Auto-Restart & Health Audit';
      endpoint = `${BACKEND_URL}/api/remediate/restart-service`;
      break;

    case 'DatabaseConnectionLost':
    case 'DatabaseDown':
      actionTaken = 'Flushed Stale DB Connection Pool & Initiated Auto-Reconnect Handshake';
      endpoint = `${BACKEND_URL}/api/remediate/reconnect-db`;
      break;

    case 'CriticalMemoryExhaustion':
    case 'HighMemoryUsage':
      actionTaken = 'Executed Heap Memory Purge & Forced Garbage Collection Sweep';
      endpoint = `${BACKEND_URL}/api/remediate/clear-memory`;
      break;

    case 'HighRequestLatency':
    case 'HighErrorRate':
      actionTaken = 'Flushed Latency Backlog Queue & Reset Circuit Breakers';
      endpoint = `${BACKEND_URL}/api/remediate/reset-latency`;
      break;

    default:
      actionTaken = `Issued diagnostic health probe for custom alert: ${alertName}`;
      endpoint = `${BACKEND_URL}/api/health`;
      break;
  }

  let success = false;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggeredBy: 'Alertmanager', alertName, timestamp: new Date().toISOString() })
    });
    
    if (res.ok) {
      success = true;
      console.log(`[AUTO-HEALER] ✅ Remediation SUCCESSFUL for alert: ${alertName}`);
    } else {
      console.error(`[AUTO-HEALER] ❌ Remediation endpoint returned status ${res.status}`);
    }
  } catch (err) {
    console.error(`[AUTO-HEALER] ⚠️ Remediation call failed (${err.message}). Executing fallback self-heal...`);
    // Fallback: Direct endpoint try
    try {
      await fetch(`${BACKEND_URL}/api/chaos/recover`, { method: 'POST' });
      success = true;
      actionTaken += ' (Fallback self-heal executed successfully)';
    } catch (fallbackErr) {
      console.error(`[AUTO-HEALER] Critical: Fallback heal also failed (${fallbackErr.message})`);
    }
  }

  const durationMs = Date.now() - startTime;
  const incidentRecord = state.recordIncident(alertName, severity, summary, actionTaken, success, durationMs);
  return incidentRecord;
}

module.exports = {
  executeRemediation
};
