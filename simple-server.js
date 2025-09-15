/**
 * Simplified Talabat POS Integration Platform Server
 * For immediate testing and demonstration
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Mock data for testing
let mockConfig = {
    integration_name: 'Demo POS UAE',
    integration_code: 'demo-pos-ae',
    base_url: 'https://demo-pos-api.com',
    environment: 'staging',
    country: 'AE'
};

let mockLogs = [];
let mockMetrics = {
    total_api_calls: 156,
    success_rate: 94.5,
    average_response_time: 245,
    active_orders: 7,
    system_status: 'operational'
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        message: '🚀 Talabat POS Integration Platform is running!'
    });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username && password) {
        res.json({
            success: true,
            data: {
                access_token: `mock_token_${Date.now()}`,
                refresh_token: `refresh_token_${Date.now()}`,
                expires_in: 3600,
                token_type: 'Bearer'
            }
        });
    } else {
        res.status(400).json({
            success: false,
            error: 'Username and password required'
        });
    }
});

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
    
    res.json({
        success: true,
        data: { scenarios_tested: scenarios, results }
    });
});

app.get('/api/monitoring/metrics', (req, res) => {
    res.json({
        success: true,
        data: mockMetrics
    });
});

app.get('/api/monitoring/logs', (req, res) => {
    const sampleLogs = [
        {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Application started successfully',
            module: 'Server'
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'success',
            message: 'Authentication test passed',
            module: 'AuthenticationTester'
        },
        {
            id: 3,
            timestamp: new Date(Date.now() - 120000).toISOString(),
            level: 'info',
            message: 'Order management test initiated',
            module: 'OrderTester'
        }
    ];
    
    res.json({
        success: true,
        data: {
            logs: sampleLogs,
            total: sampleLogs.length
        }
    });
});

app.post('/api/reports/generate', (req, res) => {
    const { report_type, format } = req.body;
    
    res.json({
        success: true,
        data: {
            report_id: `RPT_${Date.now()}`,
            type: report_type || 'performance',
            format: format || 'json',
            generated_at: new Date().toISOString(),
            download_url: `/api/reports/download/RPT_${Date.now()}`
        }
    });
});

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Talabat POS Integration Platform running on http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/api/health`);
    console.log(`🌐 Access the application: http://localhost:${port}`);
    console.log(`📖 API Documentation available in README.md`);
});

module.exports = app;
