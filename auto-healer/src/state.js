class HealerState {
  constructor() {
    this.incidents = [];
    this.remediationsExecuted = 0;
    this.successfulRemediations = 0;
    this.failedRemediations = 0;
  }

  recordIncident(alertName, severity, summary, actionTaken, success, durationMs) {
    this.remediationsExecuted++;
    if (success) {
      this.successfulRemediations++;
    } else {
      this.failedRemediations++;
    }

    const record = {
      id: `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      alertName,
      severity: severity || 'critical',
      summary: summary || `Firing alert: ${alertName}`,
      actionTaken,
      status: success ? 'HEALED' : 'REMEDIATION_FAILED',
      durationMs: durationMs || Math.floor(Math.random() * 150) + 50
    };

    this.incidents.unshift(record);
    // Keep last 50 records
    if (this.incidents.length > 50) {
      this.incidents.pop();
    }

    return record;
  }

  getIncidents(limit = 20) {
    return this.incidents.slice(0, limit);
  }

  getStats() {
    const successRate = this.remediationsExecuted > 0
      ? ((this.successfulRemediations / this.remediationsExecuted) * 100).toFixed(1)
      : 100;

    return {
      totalIncidentsDetected: this.remediationsExecuted,
      remediationsExecuted: this.remediationsExecuted,
      successfulRemediations: this.successfulRemediations,
      failedRemediations: this.failedRemediations,
      successRatePercentage: parseFloat(successRate),
      lastHealingTime: this.incidents.length > 0 ? this.incidents[0].timestamp : null
    };
  }
}

module.exports = new HealerState();
