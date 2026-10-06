const logger = require('./logger');
const { dbConnectionGauge } = require('./metrics');

class DatabaseManager {
  constructor() {
    this.isConnected = true;
    this.connectionPoolSize = 10;
    this.activeConnections = 3;
    this.host = process.env.DB_HOST || 'database';
    this.dbName = process.env.DB_NAME || 'production_monitoring';
  }

  async query(sql, params = []) {
    if (!this.isConnected) {
      const err = new Error('DatabaseConnectionError: Connection refused (503 Service Unavailable)');
      logger.error('DB query failed - database disconnected', { sql, error: err.message });
      throw err;
    }
    // Simulate DB query execution time
    const delay = Math.floor(Math.random() * 20) + 5;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return { rows: [{ id: 1, result: 'ok', timestamp: new Date().toISOString() }] };
  }

  severConnection() {
    this.isConnected = false;
    dbConnectionGauge.set(0);
    logger.warn('CHAOS INJECTED: Database connection severed!');
  }

  reconnect() {
    this.isConnected = true;
    dbConnectionGauge.set(1);
    logger.info('AUTO-HEALED: Database connection re-established successfully.');
    return { status: 'reconnected', timestamp: new Date().toISOString() };
  }

  getStatus() {
    return {
      connected: this.isConnected,
      host: this.host,
      database: this.dbName,
      poolSize: this.connectionPoolSize,
      activeConnections: this.isConnected ? this.activeConnections : 0
    };
  }
}

module.exports = new DatabaseManager();
