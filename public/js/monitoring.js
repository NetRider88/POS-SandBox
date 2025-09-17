/**
 * Monitoring Module
 * Handles real-time monitoring, logging, and performance tracking
 */

class MonitoringManager {
    constructor() {
        this.logs = [];
        this.metrics = {
            responseTime: [],
            successRate: [],
            errorRate: [],
            activeOrders: 0,
            systemStatus: 'monitoring'
        };
        
        this.maxLogEntries = 1000;
        this.maxMetricPoints = 50;
        this.monitoringInterval = null;
        this.isMonitoring = false;
        
        // Performance tracking
        this.performanceData = {
            apiCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalResponseTime: 0,
            averageResponseTime: 0
        };
        
        this.initialize();
    }
    
    /**
     * Initialize monitoring system
     */
    initialize() {
        this.loadStoredData();
        this.setupEventListeners();
        this.startMonitoring();
        this.initializeCharts();
    }
    
    /**
     * Load stored monitoring data
     */
    loadStoredData() {
        try {
            const storedLogs = localStorage.getItem('talabat_pos_logs');
            if (storedLogs) {
                this.logs = JSON.parse(storedLogs).slice(-this.maxLogEntries);
            }
            
            const storedMetrics = localStorage.getItem('talabat_pos_metrics');
            if (storedMetrics) {
                this.metrics = { ...this.metrics, ...JSON.parse(storedMetrics) };
            }
        } catch (error) {
            console.error('Error loading monitoring data:', error);
        }
    }
    
    /**
     * Save monitoring data to storage
     */
    saveData() {
        try {
            localStorage.setItem('talabat_pos_logs', JSON.stringify(this.logs.slice(-this.maxLogEntries)));
            localStorage.setItem('talabat_pos_metrics', JSON.stringify(this.metrics));
        } catch (error) {
            console.error('Error saving monitoring data:', error);
        }
    }
    
    /**
     * Setup event listeners for monitoring
     */
    setupEventListeners() {
        // Listen for API call events
        document.addEventListener('apiCallStart', (e) => {
            this.trackAPICallStart(e.detail);
        });
        
        document.addEventListener('apiCallEnd', (e) => {
            this.trackAPICallEnd(e.detail);
        });
        
        // Listen for error events
        window.addEventListener('error', (e) => {
            this.addLog({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `JavaScript Error: ${e.message}`,
                module: 'Global',
                details: {
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno
                }
            });
        });
        
        // Listen for unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.addLog({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `Unhandled Promise Rejection: ${e.reason}`,
                module: 'Global'
            });
        });
        
        // Listen for tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.addLog({
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Application tab hidden',
                    module: 'MonitoringManager'
                });
            } else {
                this.addLog({
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: 'Application tab visible',
                    module: 'MonitoringManager'
                });
                this.refreshMetrics();
            }
        });
    }
    
    /**
     * Start monitoring system
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.updateDashboard();
            this.saveData();
        }, 5000); // Update every 5 seconds
        
        this.addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Monitoring system started',
            module: 'MonitoringManager'
        });
    }
    
    /**
     * Stop monitoring system
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        this.addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Monitoring system stopped',
            module: 'MonitoringManager'
        });
    }
    
    /**
     * Add log entry
     */
    addLog(logEntry) {
        // Ensure log entry has required fields
        const entry = {
            id: Date.now() + Math.random(),
            timestamp: logEntry.timestamp || new Date().toISOString(),
            level: logEntry.level || 'info',
            message: logEntry.message || '',
            module: logEntry.module || 'Unknown',
            details: logEntry.details || null
        };
        
        this.logs.push(entry);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogEntries) {
            this.logs = this.logs.slice(-this.maxLogEntries);
        }
        
        // Update live logs display
        this.updateLiveLogs();
        
        // Update error metrics
        if (entry.level === 'error') {
            this.performanceData.failedCalls++;
            this.updateErrorRate();
        }
        
        console.log(`[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.module}] ${entry.message}`);
    }
    
    /**
     * Track API call start
     */
    trackAPICallStart(details) {
        const callId = details.callId || Date.now() + Math.random();
        
        this.performanceData.apiCalls++;
        
        // Store call start time
        if (!window.apiCallTracker) {
            window.apiCallTracker = new Map();
        }
        window.apiCallTracker.set(callId, {
            startTime: performance.now(),
            endpoint: details.endpoint,
            method: details.method
        });
        
        this.addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `API Call Started: ${details.method} ${details.endpoint}`,
            module: 'APITracker',
            details: { callId, ...details }
        });
    }
    
    /**
     * Track API call end
     */
    trackAPICallEnd(details) {
        const callId = details.callId;
        
        if (window.apiCallTracker && window.apiCallTracker.has(callId)) {
            const callData = window.apiCallTracker.get(callId);
            const responseTime = performance.now() - callData.startTime;
            
            // Update performance metrics
            this.performanceData.totalResponseTime += responseTime;
            this.performanceData.averageResponseTime = 
                this.performanceData.totalResponseTime / this.performanceData.apiCalls;
            
            if (details.success) {
                this.performanceData.successfulCalls++;
            } else {
                this.performanceData.failedCalls++;
            }
            
            // Add to response time metrics
            this.metrics.responseTime.push({
                timestamp: Date.now(),
                value: responseTime
            });
            
            // Keep only recent metrics
            if (this.metrics.responseTime.length > this.maxMetricPoints) {
                this.metrics.responseTime = this.metrics.responseTime.slice(-this.maxMetricPoints);
            }
            
            this.addLog({
                timestamp: new Date().toISOString(),
                level: details.success ? 'success' : 'error',
                message: `API Call ${details.success ? 'Completed' : 'Failed'}: ${callData.method} ${callData.endpoint} (${Math.round(responseTime)}ms)`,
                module: 'APITracker',
                details: {
                    callId,
                    responseTime,
                    status: details.status,
                    ...callData
                }
            });
            
            window.apiCallTracker.delete(callId);
        }
        
        this.updateSuccessRate();
    }
    
    /**
     * Collect system metrics
     */
    collectMetrics() {
        // Simulate system metrics collection
        const timestamp = Date.now();
        
        // System status
        if (window.authManager?.isAuthenticated) {
            this.metrics.systemStatus = 'operational';
        } else {
            this.metrics.systemStatus = 'authentication_required';
        }
        
        // Active orders (simulated)
        this.metrics.activeOrders = Math.floor(Math.random() * 10) + 
            (window.integrationTester?.testResults.order ? 5 : 0);
        
        // Memory usage (if available)
        if (performance.memory) {
            this.addLog({
                timestamp: new Date().toISOString(),
                level: 'debug',
                message: `Memory Usage: ${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB`,
                module: 'SystemMonitor'
            });
        }
    }
    
    /**
     * Update success rate metric
     */
    updateSuccessRate() {
        const totalCalls = this.performanceData.successfulCalls + this.performanceData.failedCalls;
        const successRate = totalCalls > 0 ? (this.performanceData.successfulCalls / totalCalls) * 100 : 100;
        
        this.metrics.successRate.push({
            timestamp: Date.now(),
            value: successRate
        });
        
        if (this.metrics.successRate.length > this.maxMetricPoints) {
            this.metrics.successRate = this.metrics.successRate.slice(-this.maxMetricPoints);
        }
    }
    
    /**
     * Update error rate metric
     */
    updateErrorRate() {
        const totalCalls = this.performanceData.apiCalls;
        const errorRate = totalCalls > 0 ? (this.performanceData.failedCalls / totalCalls) * 100 : 0;
        
        this.metrics.errorRate.push({
            timestamp: Date.now(),
            value: errorRate
        });
        
        if (this.metrics.errorRate.length > this.maxMetricPoints) {
            this.metrics.errorRate = this.metrics.errorRate.slice(-this.maxMetricPoints);
        }
    }
    
    /**
     * Update monitoring dashboard
     */
    updateDashboard() {
        // Update response time
        const avgResponseTime = Math.round(this.performanceData.averageResponseTime) || 0;
        const responseTimeElement = document.getElementById('response-time');
        if (responseTimeElement) {
            responseTimeElement.textContent = avgResponseTime + 'ms';
        }
        
        // Update success rate
        const currentSuccessRate = this.metrics.successRate.length > 0 ? 
            this.metrics.successRate[this.metrics.successRate.length - 1].value : 100;
        const successRateElement = document.getElementById('success-rate');
        if (successRateElement) {
            successRateElement.textContent = Math.round(currentSuccessRate) + '%';
        }
        
        // Update active orders
        const activeOrdersElement = document.getElementById('active-orders');
        if (activeOrdersElement) {
            activeOrdersElement.textContent = this.metrics.activeOrders;
        }
        
        // Update system status
        const systemStatusElement = document.getElementById('system-status');
        if (systemStatusElement) {
            systemStatusElement.textContent = this.formatSystemStatus(this.metrics.systemStatus);
        }
        
        // Update charts
        this.updateCharts();
    }
    
    /**
     * Update live logs display
     */
    updateLiveLogs() {
        const logsContent = document.getElementById('logs-content');
        if (!logsContent) return;
        
        // Show last 20 logs
        const recentLogs = this.logs.slice(-20);
        
        logsContent.innerHTML = recentLogs.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const levelClass = `log-${log.level}`;
            return `<div class="log-entry ${levelClass}">[${time}] [${log.level.toUpperCase()}] [${log.module}] ${log.message}</div>`;
        }).join('');
        
        // Auto-scroll to bottom
        logsContent.scrollTop = logsContent.scrollHeight;
    }
    
    /**
     * Initialize monitoring charts
     */
    initializeCharts() {
        // Initialize response time chart
        const responseCanvas = document.getElementById('response-chart');
        if (responseCanvas) {
            this.responseChart = new SimpleChart(responseCanvas, 'Response Time (ms)');
        }
        
        // Initialize success rate chart
        const successCanvas = document.getElementById('success-chart');
        if (successCanvas) {
            this.successChart = new SimpleChart(successCanvas, 'Success Rate (%)');
        }
    }
    
    /**
     * Update monitoring charts
     */
    updateCharts() {
        if (this.responseChart && this.metrics.responseTime.length > 0) {
            this.responseChart.updateData(this.metrics.responseTime);
        }
        
        if (this.successChart && this.metrics.successRate.length > 0) {
            this.successChart.updateData(this.metrics.successRate);
        }
    }
    
    /**
     * Refresh metrics from current state
     */
    refreshMetrics() {
        this.collectMetrics();
        this.updateDashboard();
    }
    
    /**
     * Format system status for display
     */
    formatSystemStatus(status) {
        const statusMap = {
            'operational': '✅ Operational',
            'authentication_required': '🔐 Auth Required',
            'monitoring': '📊 Monitoring',
            'error': '❌ Error',
            'warning': '⚠️ Warning'
        };
        
        return statusMap[status] || status;
    }
    
    /**
     * Export logs as file
     */
    exportLogs(format = 'json') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        let content, mimeType, filename;
        
        if (format === 'json') {
            content = JSON.stringify({
                exportDate: new Date().toISOString(),
                totalLogs: this.logs.length,
                logs: this.logs,
                metrics: this.metrics,
                performance: this.performanceData
            }, null, 2);
            mimeType = 'application/json';
            filename = `talabat-pos-logs-${timestamp}.json`;
        } else if (format === 'csv') {
            const headers = ['Timestamp', 'Level', 'Module', 'Message'];
            const csvRows = [headers.join(',')];
            
            this.logs.forEach(log => {
                const row = [
                    log.timestamp,
                    log.level,
                    log.module,
                    `"${log.message.replace(/"/g, '""')}"`
                ];
                csvRows.push(row.join(','));
            });
            
            content = csvRows.join('\n');
            mimeType = 'text/csv';
            filename = `talabat-pos-logs-${timestamp}.csv`;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Logs exported as ${format.toUpperCase()}: ${filename}`,
            module: 'MonitoringManager'
        });
    }
    
    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.updateLiveLogs();
        this.saveData();
        
        this.addLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'All logs cleared',
            module: 'MonitoringManager'
        });
    }
    
    /**
     * Get monitoring summary
     */
    getMonitoringSummary() {
        const totalLogs = this.logs.length;
        const errorLogs = this.logs.filter(log => log.level === 'error').length;
        const warningLogs = this.logs.filter(log => log.level === 'warning').length;
        
        return {
            totalLogs,
            errorLogs,
            warningLogs,
            successRate: this.performanceData.apiCalls > 0 ? 
                (this.performanceData.successfulCalls / this.performanceData.apiCalls) * 100 : 100,
            averageResponseTime: this.performanceData.averageResponseTime,
            systemStatus: this.metrics.systemStatus,
            activeOrders: this.metrics.activeOrders,
            uptime: this.isMonitoring ? 'Active' : 'Inactive'
        };
    }
}

/**
 * Simple Chart Class for monitoring visualizations
 */
class SimpleChart {
    constructor(canvas, title) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.title = title;
        this.data = [];
        this.maxPoints = 20;
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        // Set canvas size
        this.canvas.width = 200;
        this.canvas.height = 100;
        
        // Set initial styles
        this.ctx.strokeStyle = '#4facfe';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'rgba(79, 172, 254, 0.1)';
    }
    
    updateData(newData) {
        this.data = newData.slice(-this.maxPoints);
        this.draw();
    }
    
    draw() {
        const { ctx, canvas, data } = this;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (data.length < 2) return;
        
        // Find min/max values
        const values = data.map(point => point.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const range = maxValue - minValue || 1;
        
        // Draw chart
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = (index / (data.length - 1)) * canvas.width;
            const y = canvas.height - ((point.value - minValue) / range) * canvas.height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Fill area under curve
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
    }
}

// Initialize global monitoring manager
window.monitoringManager = new MonitoringManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonitoringManager;
}
