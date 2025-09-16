/**
 * Vercel-Compatible Talabat POS Integration Platform Server
 * Uses in-memory storage instead of SQLite for serverless compatibility
 */

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage (perfect for testing/demo)
let inMemoryStorage = {
    configurations: [],
    logs: [],
    testResults: [],
    apiMetrics: [],
    reports: [],
    scheduledReports: []
};

// Add sample data for demonstration
inMemoryStorage.configurations.push({
    id: 1,
    integration_name: 'Demo POS UAE',
    integration_code: 'demo-pos-ae',
    base_url: 'https://demo-pos-api.com',
    environment: 'staging',
    country: 'AE',
    vendor_code: 'DEMO001',
    remote_id: '123456',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
});

// Add sample logs
inMemoryStorage.logs.push(
    {
        id: 1,
        configuration_id: 1,
        level: 'info',
        message: 'Application started successfully',
        module: 'Server',
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        configuration_id: 1,
        level: 'success',
        message: 'Authentication test passed',
        module: 'AuthenticationTester',
        created_at: new Date(Date.now() - 60000).toISOString()
    }
);

class TalabatPOSVercelServer {
    constructor() {
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    setupMiddleware() {
        // Security and middleware
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // CORS for Vercel
        app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });
        
        // Static file serving
        app.use(express.static('.', {
            index: 'index.html'
        }));
    }
    
    setupRoutes() {
        // Health check
        app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                message: '🚀 Talabat POS Integration Platform is running on Vercel!',
                platform: 'vercel',
                storage: 'in-memory'
            });
        });
        
        // Authentication endpoints
        app.post('/api/auth/login', (req, res) => {
            const { username, password } = req.body;
            
            if (username && password) {
                const mockResponse = {
                    access_token: this.generateMockToken(username),
                    refresh_token: this.generateMockToken(username + '_refresh'),
                    token_type: 'Bearer',
                    expires_in: 3600
                };
                
                res.json({
                    success: true,
                    data: mockResponse
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Username and password required'
                });
            }
        });
        
        app.post('/api/auth/refresh', (req, res) => {
            const { refresh_token } = req.body;
            
            if (!refresh_token) {
                return res.status(400).json({
                    error: 'Refresh token is required'
                });
            }
            
            const mockResponse = {
                access_token: this.generateMockToken('refreshed_user'),
                refresh_token: this.generateMockToken('refreshed_user_refresh'),
                token_type: 'Bearer',
                expires_in: 3600
            };
            
            res.json({
                success: true,
                data: mockResponse
            });
        });
        
        // Testing endpoints
        app.post('/api/test/authentication', (req, res) => {
            const testResult = {
                success: true,
                data: {
                    endpoint_accessible: true,
                    credentials_valid: true,
                    token_generated: true,
                    response_time_ms: Math.floor(Math.random() * 500) + 100
                }
            };
            
            // Store test result
            inMemoryStorage.testResults.push({
                id: Date.now(),
                configuration_id: req.body.configuration_id || 1,
                test_type: 'authentication',
                status: 'passed',
                results: testResult.data,
                created_at: new Date().toISOString()
            });
            
            res.json(testResult);
        });
        
        app.post('/api/test/orders', (req, res) => {
            const scenarios = req.body.test_scenarios || ['order_reception', 'order_acceptance'];
            const results = {};
            
            scenarios.forEach(scenario => {
                results[scenario] = {
                    status: 'passed',
                    response_time_ms: Math.floor(Math.random() * 1000) + 200,
                    details: `${scenario} test completed successfully`
                };
            });
            
            // Store test result
            inMemoryStorage.testResults.push({
                id: Date.now(),
                configuration_id: req.body.configuration_id || 1,
                test_type: 'order_management',
                status: 'passed',
                results: { scenarios_tested: scenarios, results },
                created_at: new Date().toISOString()
            });
            
            res.json({
                success: true,
                data: { scenarios_tested: scenarios, results }
            });
        });
        
        app.post('/api/test/webhooks', (req, res) => {
            const { webhook_url } = req.body;
            
            const results = {
                endpoint_accessible: true,
                ssl_valid: webhook_url ? webhook_url.startsWith('https://') : false,
                response_time_ms: Math.floor(Math.random() * 500) + 100,
                status_code: 200,
                content_type: 'application/json'
            };
            
            res.json({
                success: true,
                data: results
            });
        });
        
        app.post('/api/test/full-suite', (req, res) => {
            const testResults = {
                overall_status: 'passed',
                tests_run: 6,
                tests_passed: 5,
                tests_failed: 1,
                execution_time_ms: 15000,
                results: {
                    authentication: { status: 'passed', details: 'All authentication tests passed' },
                    order_management: { status: 'passed', details: 'Order flow tests successful' },
                    catalog_management: { status: 'passed', details: 'Catalog validation passed' },
                    store_management: { status: 'passed', details: 'Store management working' },
                    webhooks: { status: 'failed', details: 'One webhook endpoint timeout' },
                    reporting: { status: 'passed', details: 'Report generation successful' }
                }
            };
            
            res.json({
                success: true,
                data: testResults
            });
        });
        
        // Monitoring endpoints
        app.get('/api/monitoring/metrics', (req, res) => {
            const mockMetrics = {
                total_api_calls: Math.floor(Math.random() * 500) + 100,
                success_rate: 94.5 + Math.random() * 5,
                average_response_time: Math.floor(Math.random() * 300) + 150,
                active_orders: Math.floor(Math.random() * 20) + 5,
                system_status: 'operational'
            };
            
            res.json({
                success: true,
                data: mockMetrics
            });
        });
        
        app.get('/api/monitoring/logs', (req, res) => {
            const { limit = 20 } = req.query;
            const logs = inMemoryStorage.logs.slice(-parseInt(limit));
            
            res.json({
                success: true,
                data: {
                    logs: logs,
                    total: inMemoryStorage.logs.length
                }
            });
        });
        
        app.post('/api/monitoring/log', (req, res) => {
            const { configuration_id, level, message, module, details } = req.body;
            
            const logEntry = {
                id: Date.now(),
                configuration_id: configuration_id || 1,
                level: level || 'info',
                message: message || 'Log entry',
                module: module || 'Unknown',
                details: details,
                created_at: new Date().toISOString()
            };
            
            inMemoryStorage.logs.push(logEntry);
            
            res.json({
                success: true,
                message: 'Log entry added successfully'
            });
        });
        
        // Configuration endpoints
        app.get('/api/config/:id', (req, res) => {
            const { id } = req.params;
            const config = inMemoryStorage.configurations.find(c => c.id == id);
            
            if (config) {
                res.json({
                    success: true,
                    data: config
                });
            } else {
                res.status(404).json({
                    error: 'Configuration not found'
                });
            }
        });
        
        app.get('/api/configs', (req, res) => {
            res.json({
                success: true,
                data: inMemoryStorage.configurations
            });
        });
        
        // Reports endpoints
        app.post('/api/reports/generate', (req, res) => {
            const { report_type, format } = req.body;
            
            const report = {
                id: `RPT_${Date.now()}`,
                type: report_type || 'performance',
                format: format || 'json',
                generated_at: new Date().toISOString(),
                download_url: `/api/reports/download/RPT_${Date.now()}`,
                record_count: Math.floor(Math.random() * 100) + 10
            };
            
            inMemoryStorage.reports.push(report);
            
            res.json({
                success: true,
                data: report
            });
        });
        
        app.get('/api/reports/history', (req, res) => {
            res.json({
                success: true,
                data: inMemoryStorage.reports
            });
        });
        
        // System info
        app.get('/api/system/info', (req, res) => {
            const systemInfo = {
                platform: 'vercel',
                node_version: process.version,
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            };
            
            res.json({
                success: true,
                data: systemInfo
            });
        });
        
        // Serve main application
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
        
        // Catch all for SPA routing
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) {
                res.status(404).json({
                    error: 'API endpoint not found',
                    path: req.path
                });
            } else {
                res.sendFile(path.join(__dirname, 'index.html'));
            }
        });
    }
    
    setupErrorHandling() {
        // Global error handler
        app.use((error, req, res, next) => {
            console.error('Global error handler:', error);
            
            res.status(error.status || 500).json({
                error: 'Internal server error',
                message: error.message,
                platform: 'vercel'
            });
        });
    }
    
    generateMockToken(username) {
        const payload = {
            username: username,
            timestamp: Date.now(),
            random: Math.random()
        };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    
    start() {
        if (process.env.VERCEL) {
            // Running on Vercel, export the app
            return app;
        } else {
            // Running locally
            app.listen(port, () => {
                console.log(`🚀 Talabat POS Integration Platform running on http://localhost:${port}`);
                console.log(`📊 Platform: Local development`);
                console.log(`💾 Storage: In-memory (perfect for testing)`);
                console.log(`🌐 Access: http://localhost:${port}`);
            });
        }
    }
}

// Initialize server
const server = new TalabatPOSVercelServer();

// Export for Vercel
module.exports = server.start();

// Start locally if not on Vercel
if (!process.env.VERCEL) {
    server.start();
}
