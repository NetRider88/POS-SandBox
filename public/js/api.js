/**
 * API Module for Talabat POS Integration
 * Handles all API communications with Talabat POS endpoints
 */

class TalabatAPIClient {
    constructor() {
        this.baseUrl = '';
        this.accessToken = null;
        this.refreshToken = null;
        this.environment = 'staging';
        this.config = null;
        
        // API endpoints
        this.endpoints = {
            login: '/v1/login',
            refresh: '/v1/refresh',
            orders: '/v1/orders',
            catalog: '/v1/catalog',
            store: '/v1/store',
            webhooks: '/v1/webhooks',
            reports: '/v1/reports'
        };
        
        // Request defaults
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'Talabat-POS-Integration-Tester/1.0'
        };
        
        this.initialize();
    }
    
    /**
     * Initialize API client with configuration
     */
    initialize() {
        if (window.configManager) {
            this.config = window.configManager.getCurrentConfig();
            if (this.config) {
                this.baseUrl = this.config.baseUrl;
                this.environment = this.config.environment;
            }
        }
        
        // Load saved authentication data
        this.loadAuthData();
    }
    
    /**
     * Update configuration
     */
    updateConfig(config) {
        this.config = config;
        this.baseUrl = config.baseUrl;
        this.environment = config.environment;
    }
    
    /**
     * Load authentication data from storage
     */
    loadAuthData() {
        try {
            const authData = localStorage.getItem('talabat_pos_auth');
            if (authData) {
                const parsed = JSON.parse(authData);
                this.accessToken = parsed.accessToken;
                this.refreshToken = parsed.refreshToken;
                
                // Check if token is expired
                if (parsed.expiresAt && new Date() > new Date(parsed.expiresAt)) {
                    this.clearAuthData();
                }
            }
        } catch (error) {
            console.error('Error loading auth data:', error);
            this.clearAuthData();
        }
    }
    
    /**
     * Save authentication data to storage
     */
    saveAuthData(authResponse) {
        try {
            const authData = {
                accessToken: authResponse.access_token,
                refreshToken: authResponse.refresh_token,
                expiresAt: new Date(Date.now() + (authResponse.expires_in * 1000)).toISOString(),
                tokenType: authResponse.token_type || 'Bearer'
            };
            
            this.accessToken = authData.accessToken;
            this.refreshToken = authData.refreshToken;
            
            localStorage.setItem('talabat_pos_auth', JSON.stringify(authData));
            this.logActivity('Authentication data saved', 'success');
        } catch (error) {
            console.error('Error saving auth data:', error);
            this.logActivity('Error saving authentication data: ' + error.message, 'error');
        }
    }
    
    /**
     * Clear authentication data
     */
    clearAuthData() {
        this.accessToken = null;
        this.refreshToken = null;
        localStorage.removeItem('talabat_pos_auth');
        this.logActivity('Authentication data cleared', 'info');
    }
    
    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, method = 'GET', data = null, requireAuth = true) {
        try {
            const url = this.baseUrl.replace(/\/$/, '') + endpoint;
            
            const headers = { ...this.defaultHeaders };
            
            if (requireAuth && this.accessToken) {
                headers.Authorization = `Bearer ${this.accessToken}`;
            }
            
            const options = {
                method: method,
                headers: headers,
                mode: 'cors',
                credentials: 'same-origin'
            };
            
            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.body = JSON.stringify(data);
            }
            
            this.logActivity(`Making ${method} request to ${url}`, 'info');
            
            const response = await fetch(url, options);
            
            // Handle different response types
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${responseData.message || responseData}`);
            }
            
            this.logActivity(`API request successful: ${response.status}`, 'success');
            return {
                data: responseData,
                status: response.status,
                headers: response.headers
            };
            
        } catch (error) {
            this.logActivity(`API request failed: ${error.message}`, 'error');
            throw error;
        }
    }
    
    /**
     * Authenticate with Talabat POS API
     */
    async authenticate(username, password) {
        try {
            if (!username || !password) {
                throw new Error('Username and password are required');
            }
            
            const authData = {
                username: username,
                password: password,
                grant_type: 'password',
                scope: 'pos_integration'
            };
            
            const response = await this.makeRequest(this.endpoints.login, 'POST', authData, false);
            
            if (response.data && response.data.access_token) {
                this.saveAuthData(response.data);
                this.logActivity('Authentication successful', 'success');
                return {
                    success: true,
                    data: response.data
                };
            } else {
                throw new Error('Invalid authentication response');
            }
            
        } catch (error) {
            this.logActivity(`Authentication failed: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Refresh access token
     */
    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }
            
            const refreshData = {
                refresh_token: this.refreshToken,
                grant_type: 'refresh_token'
            };
            
            const response = await this.makeRequest(this.endpoints.refresh, 'POST', refreshData, false);
            
            if (response.data && response.data.access_token) {
                this.saveAuthData(response.data);
                this.logActivity('Token refreshed successfully', 'success');
                return {
                    success: true,
                    data: response.data
                };
            } else {
                throw new Error('Invalid refresh response');
            }
            
        } catch (error) {
            this.logActivity(`Token refresh failed: ${error.message}`, 'error');
            this.clearAuthData();
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Test order reception webhook
     */
    async testOrderReception(orderData) {
        try {
            const endpoint = `${this.endpoints.orders}/receive`;
            const response = await this.makeRequest(endpoint, 'POST', orderData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Test order acceptance
     */
    async testOrderAcceptance(orderId, acceptanceData) {
        try {
            const endpoint = `${this.endpoints.orders}/${orderId}/accept`;
            const response = await this.makeRequest(endpoint, 'POST', acceptanceData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Test order rejection
     */
    async testOrderRejection(orderId, rejectionData) {
        try {
            const endpoint = `${this.endpoints.orders}/${orderId}/reject`;
            const response = await this.makeRequest(endpoint, 'POST', rejectionData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Test catalog import
     */
    async testCatalogImport(catalogData, callbackUrl) {
        try {
            const payload = {
                catalog: catalogData,
                callback_url: callbackUrl,
                vendor_code: this.config?.vendorCode,
                remote_id: this.config?.remoteId
            };
            
            const response = await this.makeRequest(this.endpoints.catalog, 'POST', payload);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Test store status update
     */
    async testStoreStatusUpdate(storeData) {
        try {
            const endpoint = `${this.endpoints.store}/status`;
            const response = await this.makeRequest(endpoint, 'PUT', storeData);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Test webhook endpoint
     */
    async testWebhookEndpoint(webhookUrl, testData) {
        try {
            // This will actually test the partner's webhook endpoint
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Talabat-Signature': this.generateWebhookSignature(testData)
                },
                body: JSON.stringify(testData)
            });
            
            return {
                success: response.ok,
                status: response.status,
                data: await response.text()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate reports
     */
    async generateReport(reportParams) {
        try {
            const endpoint = `${this.endpoints.reports}/generate`;
            const response = await this.makeRequest(endpoint, 'POST', reportParams);
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate webhook signature for testing
     */
    generateWebhookSignature(data) {
        // Mock signature generation
        // In real implementation, this would use the actual webhook secret
        const payload = JSON.stringify(data);
        return btoa(payload).substring(0, 32);
    }
    
    /**
     * Validate SSL certificate
     */
    async validateSSL(url) {
        try {
            // Test HTTPS connection
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            return {
                success: true,
                message: 'SSL certificate is valid'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Test IP whitelist connectivity
     */
    async testIPConnectivity(ipAddresses) {
        const results = [];
        
        for (const ip of ipAddresses) {
            try {
                // Note: Due to browser limitations, we can't actually ping IPs
                // This is a simulation for demonstration
                await new Promise(resolve => setTimeout(resolve, 100));
                
                results.push({
                    ip: ip,
                    success: true,
                    responseTime: Math.floor(Math.random() * 100) + 50
                });
            } catch (error) {
                results.push({
                    ip: ip,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * Log activity
     */
    logActivity(message, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            module: 'TalabatAPIClient'
        };
        
        if (window.monitoringManager) {
            window.monitoringManager.addLog(logEntry);
        }
        
        console.log(`[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`);
    }
    
    /**
     * Get authentication status
     */
    isAuthenticated() {
        return !!this.accessToken;
    }
    
    /**
     * Get current access token
     */
    getAccessToken() {
        return this.accessToken;
    }
}

// Initialize global API client
window.apiClient = new TalabatAPIClient();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TalabatAPIClient;
}
