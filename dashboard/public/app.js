document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const globalStatusDot = document.getElementById('global-status-dot');
  const globalStatusText = document.getElementById('global-status-text');
  
  const metricBackendStatus = document.getElementById('metric-backend-status');
  const metricUptime = document.getElementById('metric-uptime');
  const metricDbStatus = document.getElementById('metric-db-status');
  const metricDbPool = document.getElementById('metric-db-pool');
  const metricMemory = document.getElementById('metric-memory');
  const metricMemorySub = document.getElementById('metric-memory-sub');
  const metricHealCount = document.getElementById('metric-heal-count');
  const metricSuccessRate = document.getElementById('metric-success-rate');

  const backendNodeStatus = document.getElementById('backend-node-status');
  const dbNodeStatus = document.getElementById('db-node-status');
  const healerNodeStatus = document.getElementById('healer-node-status');
  const nodeBackend = document.getElementById('node-backend');
  const nodeDb = document.getElementById('node-db');

  const incidentLogBody = document.getElementById('incident-log-body');

  // Chaos Buttons
  document.getElementById('btn-leak-mem').addEventListener('click', () => triggerChaos('leak-memory', { mb: 150 }));
  document.getElementById('btn-sever-db').addEventListener('click', () => triggerChaos('db-disconnect'));
  document.getElementById('btn-slowdown').addEventListener('click', () => triggerChaos('latency', { ms: 2500 }));
  document.getElementById('btn-crash-app').addEventListener('click', () => triggerChaos('crash'));
  document.getElementById('btn-reset-chaos').addEventListener('click', () => triggerChaos('recover'));
  document.getElementById('btn-manual-heal').addEventListener('click', triggerManualHeal);

  async function updateDashboard() {
    try {
      const response = await fetch('/api/overview');
      const data = await response.json();
      
      const backend = data.backend || {};
      const healerStats = data.healer || {};
      const incidents = data.incidents || [];

      // 1. Update Backend Health
      const isUp = backend.status === 'UP';
      metricBackendStatus.textContent = backend.status || 'DOWN';
      metricBackendStatus.className = `metric-value ${isUp ? 'green' : 'red'}`;
      metricUptime.textContent = backend.uptime ? `Uptime: ${Math.round(backend.uptime)}s` : 'Unreachable';

      if (isUp) {
        nodeBackend.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        backendNodeStatus.textContent = 'Online (3000)';
      } else {
        nodeBackend.style.borderColor = '#ef4444';
        backendNodeStatus.textContent = 'CRASHED / DOWN';
      }

      // 2. Update DB Status
      const dbConnected = backend.database && backend.database.connected;
      metricDbStatus.textContent = dbConnected ? 'CONNECTED' : 'DISCONNECTED';
      metricDbStatus.className = `metric-value ${dbConnected ? 'green' : 'red'}`;
      metricDbPool.textContent = dbConnected ? 'Pool: 10/10 active' : 'Pool: 0 active';

      if (dbConnected) {
        nodeDb.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        dbNodeStatus.textContent = 'Pool Connected';
      } else {
        nodeDb.style.borderColor = '#ef4444';
        dbNodeStatus.textContent = 'CONNECTION DROPPED';
      }

      // 3. Update Memory
      if (backend.memory) {
        metricMemory.textContent = `${backend.memory.heapUsedMB} MB`;
        metricMemorySub.textContent = `Heap Total: ${backend.memory.heapTotalMB} MB`;
      }

      // 4. Update Healer Stats
      metricHealCount.textContent = healerStats.remediationsExecuted || 0;
      metricSuccessRate.textContent = `Success Rate: ${healerStats.successRatePercentage || 100}%`;
      healerNodeStatus.textContent = `Active (${healerStats.remediationsExecuted || 0} Healed)`;

      // 5. Global Badge Status
      if (isUp && dbConnected) {
        globalStatusDot.className = 'status-dot green';
        globalStatusText.textContent = 'SYSTEM HEALTHY';
      } else if (!isUp) {
        globalStatusDot.className = 'status-dot red';
        globalStatusText.textContent = 'BACKEND DOWN (AUTO-HEALING PENDING)';
      } else {
        globalStatusDot.className = 'status-dot amber';
        globalStatusText.textContent = 'ANOMALY DETECTED';
      }

      // 6. Update Incident Table Stream
      renderIncidents(incidents);

    } catch (err) {
      console.error('Failed to fetch dashboard telemetry', err);
    }
  }

  function renderIncidents(incidents) {
    if (!incidents || incidents.length === 0) {
      incidentLogBody.innerHTML = `<tr><td colspan="7" class="empty-log">No incidents detected yet. System running smoothly.</td></tr>`;
      return;
    }

    incidentLogBody.innerHTML = incidents.map(inc => {
      const dateStr = new Date(inc.timestamp).toLocaleTimeString();
      const sevClass = inc.severity === 'critical' ? 'badge-critical' : 'badge-warning';
      return `
        <tr>
          <td>${dateStr}</td>
          <td>${inc.id}</td>
          <td><strong>${inc.alertName}</strong></td>
          <td><span class="${sevClass}">${inc.severity.toUpperCase()}</span></td>
          <td>${inc.actionTaken}</td>
          <td>${inc.durationMs}ms</td>
          <td><span class="badge-healed">${inc.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  async function triggerChaos(action, payload = {}) {
    try {
      const res = await fetch(`/api/chaos/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      console.log(`Chaos Action [${action}] Result:`, result);
      
      // Instantly trigger dashboard telemetry poll
      setTimeout(updateDashboard, 300);
    } catch (err) {
      alert(`Chaos trigger failed: ${err.message}`);
    }
  }

  async function triggerManualHeal() {
    try {
      const res = await fetch('/api/trigger-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertName: 'ManualHealingTriggered',
          severity: 'critical',
          summary: 'User triggered manual recovery workflow from Command Center'
        })
      });
      const json = await res.json();
      console.log('Manual Heal Triggered:', json);
      setTimeout(updateDashboard, 300);
    } catch (err) {
      alert(`Manual heal trigger failed: ${err.message}`);
    }
  }

  // Initial fetch & set poll interval (3 seconds)
  updateDashboard();
  setInterval(updateDashboard, 3000);
});
