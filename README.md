# Production Monitoring & Auto-Healing System

![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?style=flat-square&logo=githubactions)
![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?style=flat-square&logo=docker)
![Prometheus](https://img.shields.io/badge/Metrics-Prometheus-E6522C?style=flat-square&logo=prometheus)
![Grafana](https://img.shields.io/badge/Dashboards-Grafana-F46800?style=flat-square&logo=grafana)
![Auto-Healing](https://img.shields.io/badge/Autonomous-Auto--Recovery-10B981?style=flat-square)

An end-to-end, enterprise-grade **Production Monitoring & Autonomous Auto-Healing System** designed for high availability, observability, chaos engineering, and automated incident remediation.

---

## 📐 System Architecture

```
                   GitHub
                      │
                      ▼
               GitHub Actions
                      │
                      ▼
                   Docker
                      │
                      ▼
             Backend Application
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
     Prometheus     Logs       Database
         │
         ▼
      Grafana
         │
         ▼
     Alertmanager
         │
         ▼
    Auto-recovery
```

### Flow Breakdown

1. **GitHub Repository**: Source code management, alert definitions, and automation rules.
2. **GitHub Actions**: Automated CI/CD pipeline verifying builds, linting metrics, validating Prometheus/Alertmanager configs, and running integration tests.
3. **Docker Compose**: Containerized ecosystem packaging PostgreSQL, Express Application, Prometheus, Alertmanager, Grafana, and the Auto-Recovery Daemon.
4. **Backend Application**: High-performance Express API exporting `/metrics` using `prom-client`, structured JSON logging with `winston`, and fault injection endpoints for Chaos Engineering.
5. **Database**: PostgreSQL container with connection pool monitoring and automated reconnect logic.
6. **Prometheus**: Continuously scrapes backend metrics every 5 seconds and evaluates production alert rules (`alert_rules.yml`).
7. **Alertmanager**: Receives firing Prometheus alerts and routes webhook payloads to the Auto-Recovery Daemon.
8. **Auto-Recovery Daemon**: Autonomous microservice that parses incoming alert webhooks and executes targeted self-healing remediations (restarting services, clearing heap memory leaks, resetting DB pools, and flushing latency queues).
9. **Grafana Dashboards**: Real-time visualization of HTTP request rates, latency distributions, DB pool status, active incidents, and auto-healing telemetry.
10. **Command Center UI**: Cyberpunk-themed interactive web console displaying live architecture state, real-time metrics, interactive Chaos Control Matrix, and incident audit stream.

---

## 🛠️ Stack & Technologies

* **Language/Runtime**: Node.js v22 (Express.js)
* **Metrics Exporter**: Prometheus Client (`prom-client`)
* **Logging**: Winston Structured JSON Logger
* **Observability**: Prometheus Server v2.48, Alertmanager v0.26, Grafana v10.2
* **Database**: PostgreSQL 15
* **Orchestration**: Docker Compose, GitHub Actions CI/CD
* **Command Center**: Vanilla HTML5, Modern CSS (Glassmorphism), Express BFF

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js v18+](https://nodejs.org/)
* [Docker & Docker Compose](https://www.docker.com/) (for containerized stack)

---

### Option A: Running with Docker Compose (Recommended)

1. **Clone Repository**:
   ```bash
   git clone <your-repo-url>
   cd adventurous-euclid
   ```

2. **Start Complete Stack**:
   ```bash
   docker compose up -d --build
   ```

3. **Access Services**:
   - 💻 **Command Center Dashboard**: [http://localhost:5000](http://localhost:5000)
   - ⚡ **Backend API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
   - 📊 **Prometheus Metrics**: [http://localhost:3000/metrics](http://localhost:3000/metrics)
   - 🔥 **Prometheus UI**: [http://localhost:9090](http://localhost:9090)
   - 🔔 **Alertmanager UI**: [http://localhost:9093](http://localhost:9093)
   - 📈 **Grafana UI**: [http://localhost:3001](http://localhost:3001) *(Login: admin / admin)*

---

### Option B: Local Node.js Execution (No Docker Required)

1. **Install Dependencies**:
   ```bash
   npm run install:all
   ```

2. **Launch Services**:
   ```bash
   npm start
   ```

3. **Run Automated Test**:
   ```bash
   npm test
   ```

---

## 💥 Chaos Engineering & Auto-Healing Verification

The system includes a **Chaos Control Console** to demonstrate auto-healing live:

| Chaos Action | Simulation Target | Auto-Healing Remediation |
| :--- | :--- | :--- |
| **Inject Memory Leak** | Allocates +150MB Buffer chunks on heap | Auto-Healer triggers garbage collection & memory purge |
| **Sever DB Connection** | Drops PostgreSQL connection pool | Auto-Healer resets pool & initiates reconnect handshake |
| **Crash Backend** | Forces backend into 503 DOWN state | Auto-Healer issues service restart & health audit |
| **Inject Latency** | Adds artificial 2500ms delay to API routes | Auto-Healer flushes traffic backlog queue & resets latency |

### Trigger Chaos via API
```bash
# Sever DB Connection
curl -X POST http://localhost:3000/api/chaos/db-disconnect

# Trigger Manual Auto-Healing
curl -X POST http://localhost:4000/api/healer/trigger-manual-healing \
  -H "Content-Type: application/json" \
  -d '{"alertName":"DatabaseConnectionLost","severity":"critical"}'
```

---

## 📊 Prometheus Alerting Rules (`prometheus/alert_rules.yml`)

- **`BackendServiceDown`**: Triggers when `up{job="backend-app"} == 0` for 5s.
- **`DatabaseConnectionLost`**: Triggers when `db_connection_status == 0` for 5s.
- **`CriticalMemoryExhaustion`**: Triggers when heap usage exceeds limit or anomaly is active.
- **`HighRequestLatency`**: Triggers when average API request latency exceeds 1.0s.

---

## 🛡️ Project Directory Structure

```
.
├── .github/workflows/ci-cd.yml  # GitHub Actions CI/CD Pipeline
├── app/                         # Backend Application (Node.js/Express)
│   ├── src/index.js             # API & Metrics server
│   ├── src/metrics.js           # Prometheus metrics definition
│   ├── src/db.js                # DB connection manager & fault simulation
│   └── Dockerfile
├── auto-healer/                 # Autonomous Recovery Microservice
│   ├── src/index.js             # Alertmanager webhook listener & incident state
│   ├── src/remediation.js       # Auto-healing execution engine
│   └── Dockerfile
├── dashboard/                   # Command Center UI & Chaos Control Console
│   ├── public/                  # HTML5/CSS Glassmorphism UI
│   ├── server.js                # Dashboard BFF server
│   └── Dockerfile
├── prometheus/
│   ├── prometheus.yml           # Prometheus scrape configuration
│   └── alert_rules.yml          # Production alerting rules
├── alertmanager/
│   └── alertmanager.yml         # Webhook routing config
├── grafana/
│   ├── provisioning/            # Datasource & Dashboard auto-loader
│   └── dashboards/              # Production overview JSON dashboard
├── docker-compose.yml           # Multi-container orchestration stack
├── Makefile                     # Shortcut helper commands
└── README.md
```

---

## 📄 License
MIT License. Created for Production Resiliency & Observability Engineering.
