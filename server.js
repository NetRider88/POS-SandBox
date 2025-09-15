/**
 * Talabat POS Integration Testing Platform - Backend Server
 * Node.js Express server for API proxying, data persistence, and additional functionality
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class TalabatPOSServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.db = null;
        
        // Talabat API configuration
        this.talabatAPI = {
            staging: {
                baseUrl: 'https://staging-api.talabat.com/pos',
                loginEndpoint: '/v1/login',
                orderEndpoint: '/v1/orders',
                catalogEndpoint: '/v1/catalog',
                webhookEndpoint: '/v1/webhooks',
                reportEndpoint: '/v1/reports'
            },
            production: {
                baseUrl: 'https://api.talabat.com/pos',
                loginEndpoint: '/v1/login',
                orderEndpoint: '/v1/orders',
                catalogEndpoint: '/v1/catalog',
                webhookEndpoint: '/v1/webhooks',
                reportEndpoint: '/v1/reports'
            }
        };
        
        // Regional IP addresses for whitelisting
        this.ipAddresses = {
            me: ['63.32.225.161', '18.202.96.85', '52.208.41.152'],
            eu: ['63.32.162.210', '34.255.237.245', '63.32.145.112'],
            apac: ['3.0.217.166', '3.1.134.42', '3.1.56.76'],
            latam: ['54.161.200.26', '54.174.130.155', '18.204.190.239'],
            staging: ['34.246.34.27', '18.202.142.208', '54.72.10.41']
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the server
     */
    async initialize() {
        try {
            await this.initializeDatabase();
            this.setupMiddleware();
            this.setupRoutes();
            this.setupErrorHandling();
            await this.startServer();
        } catch (error) {
            console.error('Failed to initialize server:', error);
            process.exit(1);
        }
    }
    
    /**
     * Initialize SQLite database
     */
    async initializeDatabase() {
        try {
            this.db = await open({
                filename: './data/talabat_pos.db',
                driver: sqlite3.Database
            });
            
            // Create tables
            await this.createTables();
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Create database tables
     */
    async createTables() {
        const tables = [
            // Configurations table
            `CREATE TABLE IF NOT EXISTS configurations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                integration_name TEXT NOT NULL,
                integration_code TEXT UNIQUE NOT NULL,
                base_url TEXT NOT NULL,
                plugin_username TEXT NOT NULL,
                plugin_password_hash TEXT NOT NULL,
                environment TEXT DEFAULT 'staging',
                country TEXT DEFAULT 'AE',
                region TEXT DEFAULT 'me',
                vendor_code TEXT,
                remote_id TEXT,
                callback_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )`,
            
            // Test results table
            `CREATE TABLE IF NOT EXISTS test_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                configuration_id INTEGER,
                test_type TEXT NOT NULL,
                test_name TEXT NOT NULL,
                status TEXT NOT NULL,
                results JSON,
                error_message TEXT,
                execution_time_ms INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (configuration_id) REFERENCES configurations (id)
            )`,
            
            // Logs table
            `CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                configuration_id INTEGER,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                module TEXT,
                details JSON,
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (configuration_id) REFERENCES configurations (id)
            )`,
            
            // API metrics table
            `CREATE TABLE IF NOT EXISTS api_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                configuration_id INTEGER,
                endpoint TEXT NOT NULL,
                method TEXT NOT NULL,
                status_code INTEGER,
                response_time_ms INTEGER,
                request_size INTEGER,
                response_size INTEGER,
                success BOOLEAN,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (configuration_id) REFERENCES configurations (id)
            )`,
            
            // Reports table
            `CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                configuration_id INTEGER,
                report_type TEXT NOT NULL,
                report_format TEXT NOT NULL,
                date_range_from DATE,
                date_range_to DATE,
                record_count INTEGER,
                file_path TEXT,
                file_size INTEGER,
                generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (configuration_id) REFERENCES configurations (id)
            )`,
            
            // Scheduled reports table
            `CREATE TABLE IF NOT EXISTS scheduled_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                configuration_id INTEGER,
                report_type TEXT NOT NULL,
                report_format TEXT NOT NULL,
                frequency TEXT NOT NULL,
                next_run DATETIME NOT NULL,
                email_recipients TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (configuration_id) REFERENCES configurations (id)
            )`
        ];
        
        for (const table of tables) {
            await this.db.exec(table);
        }
        
        // Create indexes for better performance
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_test_results_config ON test_results(configuration_id)',
            'CREATE INDEX IF NOT EXISTS idx_logs_config ON logs(configuration_id)',
            'CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_api_metrics_config ON api_metrics(configuration_id)',
            'CREATE INDEX IF NOT EXISTS idx_api_metrics_created ON api_metrics(created_at)'
        ];
        
        for (const index of indexes) {
            await this.db.exec(index);
        }
    }
    
    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use('/api/', limiter);
        
        // CORS configuration
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? ['https://your-domain.com'] 
                : true,
            credentials: true
        }));
        
        // Compression
        this.app.use(compression());
        
        // Logging
        this.app.use(morgan('combined'));
        
        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Static file serving
        this.app.use(express.static('.', {
            index: 'index.html',
            setHeaders: (res, path) => {
                // Set security headers for static files
                if (path.endsWith('.html')) {
                    res.setHeader('X-Frame-Options', 'DENY');
                    res.setHeader('X-Content-Type-Options', 'nosniff');
                }
            }
        }));
    }
    
    /**
     * Setup API routes
     */
    setupRoutes() {
        const router = express.Router();
        
        // Configuration routes
        router.post('/config', this.createConfiguration.bind(this));
        router.get('/config/:id', this.getConfiguration.bind(this));
        router.put('/config/:id', this.updateConfiguration.bind(this));
        router.delete('/config/:id', this.deleteConfiguration.bind(this));
        router.get('/configs', this.listConfigurations.bind(this));
        
        // Authentication routes (proxy to Talabat API)
        router.post('/auth/login', this.authenticateUser.bind(this));
        router.post('/auth/refresh', this.refreshToken.bind(this));
        router.post('/auth/logout', this.logoutUser.bind(this));
        
        // Testing routes
        router.post('/test/authentication', this.testAuthentication.bind(this));
        router.post('/test/orders', this.testOrderManagement.bind(this));
        router.post('/test/catalog', this.testCatalogManagement.bind(this));
        router.post('/test/webhooks', this.testWebhooks.bind(this));
        router.post('/test/ssl', this.testSSL.bind(this));
        router.post('/test/ip-connectivity', this.testIPConnectivity.bind(this));
        router.post('/test/full-suite', this.runFullTestSuite.bind(this));
        
        // Monitoring routes
        router.get('/monitoring/metrics', this.getMetrics.bind(this));
        router.get('/monitoring/logs', this.getLogs.bind(this));
        router.post('/monitoring/log', this.addLog.bind(this));
        router.delete('/monitoring/logs', this.clearLogs.bind(this));
        
        // Reports routes
        router.post('/reports/generate', this.generateReport.bind(this));
        router.get('/reports/history', this.getReportHistory.bind(this));
        router.post('/reports/schedule', this.scheduleReport.bind(this));
        router.get('/reports/scheduled', this.getScheduledReports.bind(this));
        router.delete('/reports/scheduled/:id', this.cancelScheduledReport.bind(this));
        
        // Health check
        router.get('/health', this.healthCheck.bind(this));
        
        // System info
        router.get('/system/info', this.getSystemInfo.bind(this));
        
        this.app.use('/api', router);
        
        // Serve index.html for all other routes (SPA support)
        this.app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }
    
    /**
     * Configuration management endpoints
     */
    async createConfiguration(req, res) {
        try {
            const {
                integration_name,
                integration_code,
                base_url,
                plugin_username,
                plugin_password,
                environment = 'staging',
                country = 'AE',
                region = 'me',
                vendor_code,
                remote_id,
                callback_url
            } = req.body;
            
            // Validate required fields
            if (!integration_name || !integration_code || !base_url || !plugin_username || !plugin_password) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    required: ['integration_name', 'integration_code', 'base_url', 'plugin_username', 'plugin_password']
                });
            }
            
            // Hash password
            const password_hash = crypto.createHash('sha256').update(plugin_password).digest('hex');
            
            const result = await this.db.run(`
                INSERT INTO configurations (
                    integration_name, integration_code, base_url, plugin_username, 
                    plugin_password_hash, environment, country, region, vendor_code, 
                    remote_id, callback_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                integration_name, integration_code, base_url, plugin_username,
                password_hash, environment, country, region, vendor_code,
                remote_id, callback_url
            ]);
            
            const configuration = await this.db.get(
                'SELECT * FROM configurations WHERE id = ?',
                [result.lastID]
            );
            
            // Remove password hash from response
            delete configuration.plugin_password_hash;
            
            await this.addLogEntry(result.lastID, 'info', 'Configuration created', 'ConfigurationAPI');
            
            res.status(201).json({
                success: true,
                data: configuration
            });
            
        } catch (error) {
            console.error('Create configuration error:', error);
            res.status(500).json({
                error: 'Failed to create configuration',
                message: error.message
            });
        }
    }
    
    async getConfiguration(req, res) {
        try {
            const { id } = req.params;
            
            const configuration = await this.db.get(
                'SELECT * FROM configurations WHERE id = ? AND is_active = 1',
                [id]
            );
            
            if (!configuration) {
                return res.status(404).json({
                    error: 'Configuration not found'
                });
            }
            
            // Remove password hash from response
            delete configuration.plugin_password_hash;
            
            res.json({
                success: true,
                data: configuration
            });
            
        } catch (error) {
            console.error('Get configuration error:', error);
            res.status(500).json({
                error: 'Failed to get configuration',
                message: error.message
            });
        }
    }
    
    async updateConfiguration(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            // Remove sensitive fields that shouldn't be updated directly
            delete updateData.id;
            delete updateData.created_at;
            
            // Hash password if provided
            if (updateData.plugin_password) {
                updateData.plugin_password_hash = crypto.createHash('sha256')
                    .update(updateData.plugin_password).digest('hex');
                delete updateData.plugin_password;
            }
            
            updateData.updated_at = new Date().toISOString();
            
            const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
            const updateValues = Object.values(updateData);
            updateValues.push(id);
            
            await this.db.run(
                `UPDATE configurations SET ${updateFields} WHERE id = ?`,
                updateValues
            );
            
            const updated = await this.db.get(
                'SELECT * FROM configurations WHERE id = ?',
                [id]
            );
            
            delete updated.plugin_password_hash;
            
            res.json({
                success: true,
                data: updated
            });
            
        } catch (error) {
            console.error('Update configuration error:', error);
            res.status(500).json({
                error: 'Failed to update configuration',
                message: error.message
            });
        }
    }
    
    async deleteConfiguration(req, res) {
        try {
            const { id } = req.params;
            
            await this.db.run(
                'UPDATE configurations SET is_active = 0 WHERE id = ?',
                [id]
            );
            
            res.json({
                success: true,
                message: 'Configuration deleted successfully'
            });
            
        } catch (error) {
            console.error('Delete configuration error:', error);
            res.status(500).json({
                error: 'Failed to delete configuration',
                message: error.message
            });
        }
    }
    
    async listConfigurations(req, res) {
        try {
            const configurations = await this.db.all(
                'SELECT id, integration_name, integration_code, environment, country, created_at, updated_at FROM configurations WHERE is_active = 1 ORDER BY created_at DESC'
            );
            
            res.json({
                success: true,
                data: configurations
            });
            
        } catch (error) {
            console.error('List configurations error:', error);
            res.status(500).json({
                error: 'Failed to list configurations',
                message: error.message
            });
        }
    }
    
    /**
     * Authentication proxy endpoints
     */
    async authenticateUser(req, res) {
        try {
            const { username, password, environment = 'staging' } = req.body;
            
            if (!username || !password) {
                return res.status(400).json({
                    error: 'Username and password are required'
                });
            }
            
            const apiConfig = this.talabatAPI[environment];
            const startTime = Date.now();
            
            try {
                // In a real implementation, this would make an actual API call to Talabat
                // For demonstration, we'll simulate the authentication
                const mockResponse = {
                    access_token: this.generateMockToken(username),
                    refresh_token: this.generateMockToken(username + '_refresh'),
                    token_type: 'Bearer',
                    expires_in: 3600,
                    scope: 'pos_integration'
                };
                
                const responseTime = Date.now() - startTime;
                
                // Log API metrics
                await this.logAPIMetrics(
                    null, // configuration_id would be determined from username
                    apiConfig.loginEndpoint,
                    'POST',
                    200,
                    responseTime,
                    JSON.stringify(req.body).length,
                    JSON.stringify(mockResponse).length,
                    true
                );
                
                res.json({
                    success: true,
                    data: mockResponse
                });
                
            } catch (apiError) {
                const responseTime = Date.now() - startTime;
                
                await this.logAPIMetrics(
                    null,
                    apiConfig.loginEndpoint,
                    'POST',
                    500,
                    responseTime,
                    JSON.stringify(req.body).length,
                    0,
                    false,
                    apiError.message
                );
                
                throw apiError;
            }
            
        } catch (error) {
            console.error('Authentication error:', error);
            res.status(401).json({
                error: 'Authentication failed',
                message: error.message
            });
        }
    }
    
    /**
     * Testing endpoints
     */
    async testAuthentication(req, res) {
        try {
            const { configuration_id, username, password } = req.body;
            const startTime = Date.now();
            
            // Simulate authentication test
            const success = Math.random() > 0.1; // 90% success rate for demo
            const executionTime = Date.now() - startTime;
            
            const results = {
                endpoint_accessible: true,
                credentials_valid: success,
                token_generated: success,
                token_format_valid: success,
                response_time_ms: executionTime
            };
            
            // Save test results
            await this.db.run(`
                INSERT INTO test_results (
                    configuration_id, test_type, test_name, status, results, 
                    execution_time_ms
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                configuration_id,
                'authentication',
                'Login API Test',
                success ? 'passed' : 'failed',
                JSON.stringify(results),
                executionTime
            ]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Test authentication error:', error);
            res.status(500).json({
                error: 'Authentication test failed',
                message: error.message
            });
        }
    }
    
    async testOrderManagement(req, res) {
        try {
            const { configuration_id, test_scenarios } = req.body;
            const startTime = Date.now();
            
            const results = {
                scenarios_tested: test_scenarios || [],
                results: {}
            };
            
            // Simulate testing each scenario
            for (const scenario of test_scenarios || []) {
                const scenarioSuccess = Math.random() > 0.15; // 85% success rate
                results.results[scenario] = {
                    status: scenarioSuccess ? 'passed' : 'failed',
                    response_time_ms: Math.floor(Math.random() * 1000) + 100,
                    details: scenarioSuccess ? 'Test passed successfully' : 'Simulated failure for testing'
                };
            }
            
            const executionTime = Date.now() - startTime;
            const allPassed = Object.values(results.results).every(r => r.status === 'passed');
            
            // Save test results
            await this.db.run(`
                INSERT INTO test_results (
                    configuration_id, test_type, test_name, status, results, 
                    execution_time_ms
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                configuration_id,
                'order_management',
                'Order Management Test Suite',
                allPassed ? 'passed' : 'failed',
                JSON.stringify(results),
                executionTime
            ]);
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Test order management error:', error);
            res.status(500).json({
                error: 'Order management test failed',
                message: error.message
            });
        }
    }
    
    /**
     * Monitoring endpoints
     */
    async getMetrics(req, res) {
        try {
            const { configuration_id, from_date, to_date } = req.query;
            
            let query = `
                SELECT 
                    COUNT(*) as total_calls,
                    AVG(response_time_ms) as avg_response_time,
                    COUNT(CASE WHEN success = 1 THEN 1 END) as successful_calls,
                    COUNT(CASE WHEN success = 0 THEN 1 END) as failed_calls,
                    endpoint,
                    method
                FROM api_metrics 
                WHERE 1=1
            `;
            
            const params = [];
            
            if (configuration_id) {
                query += ' AND configuration_id = ?';
                params.push(configuration_id);
            }
            
            if (from_date) {
                query += ' AND created_at >= ?';
                params.push(from_date);
            }
            
            if (to_date) {
                query += ' AND created_at <= ?';
                params.push(to_date);
            }
            
            query += ' GROUP BY endpoint, method ORDER BY created_at DESC';
            
            const metrics = await this.db.all(query, params);
            
            // Calculate overall metrics
            const totalCalls = metrics.reduce((sum, m) => sum + m.total_calls, 0);
            const totalSuccessful = metrics.reduce((sum, m) => sum + m.successful_calls, 0);
            const avgResponseTime = metrics.reduce((sum, m) => sum + (m.avg_response_time || 0), 0) / metrics.length || 0;
            
            const summary = {
                total_api_calls: totalCalls,
                success_rate: totalCalls > 0 ? (totalSuccessful / totalCalls) * 100 : 100,
                average_response_time: Math.round(avgResponseTime),
                endpoints: metrics
            };
            
            res.json({
                success: true,
                data: summary
            });
            
        } catch (error) {
            console.error('Get metrics error:', error);
            res.status(500).json({
                error: 'Failed to get metrics',
                message: error.message
            });
        }
    }
    
    async getLogs(req, res) {
        try {
            const { configuration_id, level, limit = 100, offset = 0 } = req.query;
            
            let query = 'SELECT * FROM logs WHERE 1=1';
            const params = [];
            
            if (configuration_id) {
                query += ' AND configuration_id = ?';
                params.push(configuration_id);
            }
            
            if (level) {
                query += ' AND level = ?';
                params.push(level);
            }
            
            query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit), parseInt(offset));
            
            const logs = await this.db.all(query, params);
            
            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM logs WHERE 1=1';
            const countParams = [];
            
            if (configuration_id) {
                countQuery += ' AND configuration_id = ?';
                countParams.push(configuration_id);
            }
            
            if (level) {
                countQuery += ' AND level = ?';
                countParams.push(level);
            }
            
            const countResult = await this.db.get(countQuery, countParams);
            
            res.json({
                success: true,
                data: {
                    logs: logs,
                    total: countResult.total,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
            
        } catch (error) {
            console.error('Get logs error:', error);
            res.status(500).json({
                error: 'Failed to get logs',
                message: error.message
            });
        }
    }
    
    /**
     * Utility methods
     */
    generateMockToken(username) {
        const payload = {
            username: username,
            timestamp: Date.now(),
            random: Math.random()
        };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    
    async logAPIMetrics(configId, endpoint, method, statusCode, responseTime, requestSize, responseSize, success, errorMessage = null) {
        try {
            await this.db.run(`
                INSERT INTO api_metrics (
                    configuration_id, endpoint, method, status_code, response_time_ms,
                    request_size, response_size, success, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                configId, endpoint, method, statusCode, responseTime,
                requestSize, responseSize, success, errorMessage
            ]);
        } catch (error) {
            console.error('Failed to log API metrics:', error);
        }
    }
    
    async addLogEntry(configId, level, message, module, details = null) {
        try {
            await this.db.run(`
                INSERT INTO logs (configuration_id, level, message, module, details)
                VALUES (?, ?, ?, ?, ?)
            `, [configId, level, message, module, details ? JSON.stringify(details) : null]);
        } catch (error) {
            console.error('Failed to add log entry:', error);
        }
    }
    
    /**
     * Health check endpoint
     */
    async healthCheck(req, res) {
        try {
            // Check database connection
            await this.db.get('SELECT 1');
            
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                database: 'connected'
            });
        } catch (error) {
            res.status(503).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }
    
    /**
     * Authentication proxy endpoints
     */
    async refreshToken(req, res) {
        try {
            const { refresh_token } = req.body;
            
            if (!refresh_token) {
                return res.status(400).json({
                    error: 'Refresh token is required'
                });
            }
            
            // Mock refresh token logic
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
            
        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(401).json({
                error: 'Token refresh failed',
                message: error.message
            });
        }
    }
    
    async logoutUser(req, res) {
        try {
            // In a real implementation, this would invalidate the token
            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                error: 'Logout failed',
                message: error.message
            });
        }
    }
    
    /**
     * Additional testing endpoints
     */
    async testWebhooks(req, res) {
        try {
            const { webhook_url } = req.body;
            
            if (!webhook_url) {
                return res.status(400).json({
                    error: 'Webhook URL is required'
                });
            }
            
            // Mock webhook testing
            const results = {
                endpoint_accessible: true,
                ssl_valid: webhook_url.startsWith('https://'),
                response_time_ms: Math.floor(Math.random() * 500) + 100,
                status_code: 200,
                content_type: 'application/json'
            };
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('Webhook test error:', error);
            res.status(500).json({
                error: 'Webhook test failed',
                message: error.message
            });
        }
    }
    
    async testSSL(req, res) {
        try {
            const { url } = req.body;
            
            if (!url) {
                return res.status(400).json({
                    error: 'URL is required'
                });
            }
            
            const results = {
                url: url,
                ssl_valid: url.startsWith('https://'),
                certificate_valid: true,
                expires_in_days: 365,
                issuer: 'Mock CA'
            };
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('SSL test error:', error);
            res.status(500).json({
                error: 'SSL test failed',
                message: error.message
            });
        }
    }
    
    async testIPConnectivity(req, res) {
        try {
            const { ip_addresses } = req.body;
            
            if (!ip_addresses || !Array.isArray(ip_addresses)) {
                return res.status(400).json({
                    error: 'IP addresses array is required'
                });
            }
            
            const results = ip_addresses.map(ip => ({
                ip: ip,
                accessible: true,
                response_time_ms: Math.floor(Math.random() * 100) + 20
            }));
            
            res.json({
                success: true,
                data: results
            });
            
        } catch (error) {
            console.error('IP connectivity test error:', error);
            res.status(500).json({
                error: 'IP connectivity test failed',
                message: error.message
            });
        }
    }
    
    async runFullTestSuite(req, res) {
        try {
            const { configuration_id } = req.body;
            
            // Mock full test suite results
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
            
        } catch (error) {
            console.error('Full test suite error:', error);
            res.status(500).json({
                error: 'Full test suite failed',
                message: error.message
            });
        }
    }
    
    /**
     * Monitoring endpoints
     */
    async addLog(req, res) {
        try {
            const { configuration_id, level, message, module, details } = req.body;
            
            await this.addLogEntry(configuration_id, level, message, module, details);
            
            res.json({
                success: true,
                message: 'Log entry added successfully'
            });
            
        } catch (error) {
            console.error('Add log error:', error);
            res.status(500).json({
                error: 'Failed to add log entry',
                message: error.message
            });
        }
    }
    
    async clearLogs(req, res) {
        try {
            await this.db.run('DELETE FROM logs');
            
            res.json({
                success: true,
                message: 'All logs cleared successfully'
            });
            
        } catch (error) {
            console.error('Clear logs error:', error);
            res.status(500).json({
                error: 'Failed to clear logs',
                message: error.message
            });
        }
    }
    
    /**
     * Reports endpoints
     */
    async getReportHistory(req, res) {
        try {
            const { configuration_id, limit = 50 } = req.query;
            
            let query = 'SELECT * FROM reports WHERE 1=1';
            const params = [];
            
            if (configuration_id) {
                query += ' AND configuration_id = ?';
                params.push(configuration_id);
            }
            
            query += ' ORDER BY generated_at DESC LIMIT ?';
            params.push(parseInt(limit));
            
            const reports = await this.db.all(query, params);
            
            res.json({
                success: true,
                data: reports
            });
            
        } catch (error) {
            console.error('Get report history error:', error);
            res.status(500).json({
                error: 'Failed to get report history',
                message: error.message
            });
        }
    }
    
    async scheduleReport(req, res) {
        try {
            const { configuration_id, report_type, report_format, frequency, email_recipients } = req.body;
            
            const nextRun = new Date();
            nextRun.setDate(nextRun.getDate() + 1); // Tomorrow
            
            const result = await this.db.run(`
                INSERT INTO scheduled_reports (
                    configuration_id, report_type, report_format, frequency, 
                    next_run, email_recipients
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                configuration_id, report_type, report_format, frequency,
                nextRun.toISOString(), email_recipients
            ]);
            
            res.json({
                success: true,
                data: {
                    id: result.lastID,
                    next_run: nextRun.toISOString()
                }
            });
            
        } catch (error) {
            console.error('Schedule report error:', error);
            res.status(500).json({
                error: 'Failed to schedule report',
                message: error.message
            });
        }
    }
    
    async getScheduledReports(req, res) {
        try {
            const { configuration_id } = req.query;
            
            let query = 'SELECT * FROM scheduled_reports WHERE is_active = 1';
            const params = [];
            
            if (configuration_id) {
                query += ' AND configuration_id = ?';
                params.push(configuration_id);
            }
            
            query += ' ORDER BY next_run ASC';
            
            const reports = await this.db.all(query, params);
            
            res.json({
                success: true,
                data: reports
            });
            
        } catch (error) {
            console.error('Get scheduled reports error:', error);
            res.status(500).json({
                error: 'Failed to get scheduled reports',
                message: error.message
            });
        }
    }
    
    async cancelScheduledReport(req, res) {
        try {
            const { id } = req.params;
            
            await this.db.run(
                'UPDATE scheduled_reports SET is_active = 0 WHERE id = ?',
                [id]
            );
            
            res.json({
                success: true,
                message: 'Scheduled report cancelled successfully'
            });
            
        } catch (error) {
            console.error('Cancel scheduled report error:', error);
            res.status(500).json({
                error: 'Failed to cancel scheduled report',
                message: error.message
            });
        }
    }
    
    /**
     * Get system information
     */
    async getSystemInfo(req, res) {
        const os = require('os');
        
        try {
            const systemInfo = {
                platform: os.platform(),
                architecture: os.arch(),
                node_version: process.version,
                uptime: process.uptime(),
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: process.memoryUsage()
                },
                cpu: {
                    cores: os.cpus().length,
                    load_average: os.loadavg()
                }
            };
            
            res.json({
                success: true,
                data: systemInfo
            });
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get system info',
                message: error.message
            });
        }
    }
    
    /**
     * Error handling middleware
     */
    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res, next) => {
            if (req.path.startsWith('/api/')) {
                res.status(404).json({
                    error: 'API endpoint not found',
                    path: req.path
                });
            } else {
                next();
            }
        });
        
        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Global error handler:', error);
            
            res.status(error.status || 500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            });
        });
    }
    
    /**
     * Start the server
     */
    async startServer() {
        // Ensure data directory exists
        await fs.mkdir('./data', { recursive: true });
        
        this.app.listen(this.port, () => {
            console.log(`🚀 Talabat POS Integration Platform server running on port ${this.port}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️  Database: SQLite (./data/talabat_pos.db)`);
            console.log(`🌐 Access: http://localhost:${this.port}`);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            this.shutdown();
        });
        
        process.on('SIGINT', () => {
            console.log('SIGINT received. Shutting down gracefully...');
            this.shutdown();
        });
    }
    
    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            if (this.db) {
                await this.db.close();
                console.log('Database connection closed.');
            }
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Initialize and start server
const server = new TalabatPOSServer();

module.exports = TalabatPOSServer;
