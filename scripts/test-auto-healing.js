const BACKEND = 'http://localhost:3000';
const HEALER = 'http://localhost:4000';

async function runTest() {
  console.log('🧪 Starting Autonomous Auto-Healing Integration Verification Test...\n');

  try {
    // 1. Verify Initial Health
    console.log('Step 1: Auditing Baseline System Health...');
    const baseline = await fetch(`${BACKEND}/api/health`).then(r => r.json());
    if (baseline.status !== 'UP') throw new Error('Baseline system is not UP!');
    console.log('✅ Baseline Health: UP & Fully Operational');

    // 2. Inject DB Disconnect Chaos
    console.log('\nStep 2: Injecting Chaos [Sever DB Connection]...');
    const chaosRes = await fetch(`${BACKEND}/api/chaos/db-disconnect`, { method: 'POST' }).then(r => r.json());
    console.log('⚠️ Chaos Result:', chaosRes.message);

    const degraded = await fetch(`${BACKEND}/api/health`).then(r => r.json());
    if (degraded.status !== 'DOWN') throw new Error('System did not transition to DOWN after chaos injection!');
    console.log('🚨 Confirmed System Status: DOWN (503 Service Unavailable)');

    // 3. Trigger Alertmanager Webhook Payload to Auto-Healer
    console.log('\nStep 3: Simulating Prometheus Alertmanager Firing Alert Payload...');
    const alertPayload = {
      receiver: 'auto-healing-webhook',
      status: 'firing',
      alerts: [
        {
          status: 'firing',
          labels: { alertname: 'DatabaseConnectionLost', severity: 'critical' },
          annotations: { summary: 'Database connection severed by chaos test' }
        }
      ]
    };

    const webhookRes = await fetch(`${HEALER}/webhook/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload)
    }).then(r => r.json());

    console.log('🛡️ Auto-Healer Webhook Response:', webhookRes);

    // 4. Verify System Recovery
    console.log('\nStep 4: Verifying Auto-Healing Remediation Result...');
    await new Promise(r => setTimeout(r, 1000));
    const healed = await fetch(`${BACKEND}/api/health`).then(r => r.json());

    if (healed.status === 'UP' && healed.database.connected) {
      console.log('🎉 SUCCESS: Autonomous Auto-Healing verified! System restored to UP.');
    } else {
      throw new Error(`Auto-healing verification failed. Status: ${healed.status}`);
    }

  } catch (err) {
    console.error('❌ Test Failed:', err.message);
    process.exit(1);
  }
}

runTest();
