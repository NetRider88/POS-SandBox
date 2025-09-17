/**
 * Minimal Vercel Serverless Function
 * Talabat POS Integration Platform
 */

const express = require('express');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());

// In-memory storage
let storage = {
  configurations: [
    {
      id: 1,
      integration_name: 'Demo POS UAE',
      integration_code: 'demo-pos-ae',
      base_url: 'https://demo-pos-api.com',
      environment: 'staging',
      country: 'AE',
      vendor_code: 'DEMO001',
      remote_id: '123456',
      created_at: new Date().toISOString(),
      is_active: true
    }
  ],
  logs: [
    {
      id: 1,
      level: 'info',
      message: '🚀 Talabat POS Platform running on Vercel!',
      created_at: new Date().toISOString()
    }
  ]
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'vercel',
    storage: 'in-memory',
    message: '🚀 Talabat POS Integration Platform is running on Vercel!',
    timestamp: new Date().toISOString()
  });
});

// Get configurations
app.get('/api/configurations', (req, res) => {
  res.json({
    success: true,
    data: storage.configurations,
    count: storage.configurations.length
  });
});

// Create configuration
app.post('/api/configurations', (req, res) => {
  const config = {
    id: storage.configurations.length + 1,
    ...req.body,
    created_at: new Date().toISOString(),
    is_active: true
  };
  storage.configurations.push(config);
  res.json({ success: true, data: config });
});

// Get logs
app.get('/api/logs', (req, res) => {
  res.json({
    success: true,
    data: storage.logs,
    count: storage.logs.length
  });
});

// Add log
app.post('/api/logs', (req, res) => {
  const log = {
    id: storage.logs.length + 1,
    ...req.body,
    created_at: new Date().toISOString()
  };
  storage.logs.push(log);
  res.json({ success: true, data: log });
});

// Test endpoint
app.post('/api/test', (req, res) => {
  const { test_type } = req.body;
  
  const result = {
    id: Date.now(),
    test_type: test_type || 'general',
    status: 'success',
    message: `✅ ${test_type || 'General'} test completed successfully`,
    timestamp: new Date().toISOString(),
    details: {
      platform: 'vercel',
      environment: 'production',
      storage: 'in-memory'
    }
  };
  
  res.json({ success: true, data: result });
});

// Root route removed - handled by Vercel static routing

// API catch all handler (only for non-static routes)
app.get('*', (req, res) => {
  // Skip if it's a static file request
  if (req.path.includes('/styles/') || req.path.includes('/js/') || req.path.includes('/images/') || req.path.includes('/assets/')) {
    return res.status(404).json({ error: 'Static file not found' });
  }
  
  res.json({
    message: '🚀 Talabat POS Integration Platform API',
    endpoints: [
      'GET /api/health',
      'GET /api/configurations',
      'POST /api/configurations',
      'GET /api/logs',
      'POST /api/logs',
      'POST /api/test'
    ]
  });
});

module.exports = app;
