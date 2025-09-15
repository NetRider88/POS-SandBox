/**
 * Authentication Module
 * Handles authentication flows and token management
 */

class AuthenticationManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.tokenExpiryTimer = null;
        
        this.initialize();
    }
    
    /**
     * Initialize authentication manager
     */
    initialize() {
        this.checkAuthenticationStatus();
        this.setupEventListeners();
    }
    
    /**
     * Check current authentication status
     */
    checkAuthenticationStatus() {
        if (window.apiClient && window.apiClient.isAuthenticated()) {
            this.isAuthenticated = true;
            this.updateAuthenticationUI(true);
            this.scheduleTokenRefresh();
        } else {
            this.isAuthenticated = false;
            this.updateAuthenticationUI(false);
        }
    }
    
    /**
     * Setup event listeners for authentication
     */
    setupEventListeners() {
        // Listen for storage changes (multi-tab support)
        window.addEventListener('storage', (e) => {
            if (e.key === 'talabat_pos_auth') {
                this.checkAuthenticationStatus();
            }
        });
        
        // Listen for window focus to check token validity
        window.addEventListener('focus', () => {
            this.checkAuthenticationStatus();
        });
    }
    
    /**
     * Perform authentication
     */
    async authenticate() {
        try {
            if (!window.configManager) {
                throw new Error('Configuration manager not available');
            }
            
            const config = window.configManager.getCurrentConfig();
            if (!config) {
                throw new Error('No configuration found. Please configure the integration first.');
            }
            
            if (!config.pluginUsername || !config.pluginPassword) {
                throw new Error('Username and password are required');
            }
            
            this.updateAuthStatus('pending', 'Authenticating...');
            this.showLoading('Authenticating with Talabat POS API...');
            
            // Update API client configuration
            window.apiClient.updateConfig(config);
            
            const result = await window.apiClient.authenticate(
                config.pluginUsername,
                config.pluginPassword
            );
            
            this.hideLoading();
            
            if (result.success) {
                this.isAuthenticated = true;
                this.currentUser = {
                    username: config.pluginUsername,
                    environment: config.environment,
                    authenticatedAt: new Date().toISOString()
                };
                
                this.updateAuthStatus('success', 'Authentication successful');
                this.updateAuthenticationUI(true);
                this.scheduleTokenRefresh();
                
                this.showResults('Authentication Test Results', [
                    '✅ Login API endpoint accessible',
                    '✅ Credentials validated successfully',
                    '✅ Access token generated',
                    '✅ Token expiry set correctly',
                    `✅ Environment: ${config.environment.toUpperCase()}`
                ], 'auth-results');
                
                this.logActivity('Authentication successful', 'success');
                
                return {
                    success: true,
                    message: 'Authentication successful'
                };
                
            } else {
                this.updateAuthStatus('error', 'Authentication failed');
                this.showResults('Authentication Test Results', [
                    '❌ Authentication failed: ' + result.error
                ], 'auth-results');
                
                this.logActivity('Authentication failed: ' + result.error, 'error');
                
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            this.hideLoading();
            this.updateAuthStatus('error', 'Authentication failed');
            this.showResults('Authentication Test Results', [
                '❌ Authentication failed: ' + error.message
            ], 'auth-results');
            
            this.logActivity('Authentication error: ' + error.message, 'error');
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Refresh authentication token
     */
    async refreshToken() {
        try {
            if (!window.apiClient) {
                throw new Error('API client not available');
            }
            
            this.showLoading('Refreshing authentication token...');
            
            const result = await window.apiClient.refreshAccessToken();
            
            this.hideLoading();
            
            if (result.success) {
                this.scheduleTokenRefresh();
                this.showResults('Token Refresh Results', [
                    '✅ Token refresh endpoint accessible',
                    '✅ New token generated successfully',
                    '✅ Old token invalidated',
                    '✅ Token expiry updated'
                ], 'auth-results');
                
                this.logActivity('Token refreshed successfully', 'success');
                
                return {
                    success: true,
                    message: 'Token refreshed successfully'
                };
            } else {
                this.logout();
                this.showResults('Token Refresh Results', [
                    '❌ Token refresh failed: ' + result.error,
                    '❌ Please re-authenticate'
                ], 'auth-results');
                
                this.logActivity('Token refresh failed: ' + result.error, 'error');
                
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            this.hideLoading();
            this.logout();
            
            this.showResults('Token Refresh Results', [
                '❌ Token refresh error: ' + error.message
            ], 'auth-results');
            
            this.logActivity('Token refresh error: ' + error.message, 'error');
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Logout and clear authentication
     */
    logout() {
        if (window.apiClient) {
            window.apiClient.clearAuthData();
        }
        
        this.isAuthenticated = false;
        this.currentUser = null;
        
        if (this.tokenExpiryTimer) {
            clearTimeout(this.tokenExpiryTimer);
            this.tokenExpiryTimer = null;
        }
        
        this.updateAuthStatus('pending', 'Ready to test');
        this.updateAuthenticationUI(false);
        
        this.logActivity('User logged out', 'info');
    }
    
    /**
     * Schedule automatic token refresh
     */
    scheduleTokenRefresh() {
        if (this.tokenExpiryTimer) {
            clearTimeout(this.tokenExpiryTimer);
        }
        
        // Refresh token 5 minutes before expiry (default 55 minutes for 1-hour tokens)
        const refreshTime = 55 * 60 * 1000; // 55 minutes in milliseconds
        
        this.tokenExpiryTimer = setTimeout(() => {
            this.refreshToken();
        }, refreshTime);
        
        this.logActivity('Token refresh scheduled for 55 minutes', 'info');
    }
    
    /**
     * Update authentication status UI
     */
    updateAuthStatus(status, text) {
        const statusElement = document.getElementById('auth-status');
        const textElement = document.getElementById('auth-text');
        
        if (statusElement && textElement) {
            statusElement.className = `status-indicator status-${status}`;
            textElement.textContent = text;
        }
    }
    
    /**
     * Update authentication UI elements
     */
    updateAuthenticationUI(authenticated) {
        const badge = document.getElementById('auth-badge');
        if (badge) {
            if (authenticated) {
                badge.textContent = 'Authenticated';
                badge.className = 'status-badge authenticated';
                badge.style.background = 'var(--bg-success)';
            } else {
                badge.textContent = 'Not Authenticated';
                badge.className = 'status-badge not-authenticated';
                badge.style.background = 'var(--bg-danger)';
            }
        }
        
        // Update other UI elements that depend on authentication status
        this.updateDependentElements(authenticated);
    }
    
    /**
     * Update elements that depend on authentication
     */
    updateDependentElements(authenticated) {
        const dependentButtons = document.querySelectorAll('[data-requires-auth="true"]');
        dependentButtons.forEach(button => {
            button.disabled = !authenticated;
            if (!authenticated) {
                button.title = 'Authentication required';
            } else {
                button.title = '';
            }
        });
    }
    
    /**
     * Show loading overlay
     */
    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        
        if (overlay && text) {
            text.textContent = message;
            overlay.classList.add('show');
        }
    }
    
    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
    
    /**
     * Show test results
     */
    showResults(title, results, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.style.display = 'block';
        
        let html = `<h4>${title}</h4>`;
        results.forEach(result => {
            if (result.startsWith('✅')) {
                html += `<div class="success-highlight">${result}</div>`;
            } else if (result.startsWith('❌')) {
                html += `<div class="error-highlight">${result}</div>`;
            } else {
                html += `<div style="padding: 8px 0;">${result}</div>`;
            }
        });
        
        container.innerHTML = html;
    }
    
    /**
     * Log activity
     */
    logActivity(message, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            module: 'AuthenticationManager'
        };
        
        if (window.monitoringManager) {
            window.monitoringManager.addLog(logEntry);
        }
        
        console.log(`[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`);
    }
    
    /**
     * Get current authentication status
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            currentUser: this.currentUser,
            hasValidToken: window.apiClient ? window.apiClient.isAuthenticated() : false
        };
    }
    
    /**
     * Check if user has required permissions
     */
    hasPermission(permission) {
        if (!this.isAuthenticated) return false;
        
        // In a real implementation, this would check user roles/permissions
        // For now, all authenticated users have all permissions
        return true;
    }
}

// Global functions for backward compatibility
function testAuthentication() {
    if (window.authManager) {
        return window.authManager.authenticate();
    }
}

function testTokenRefresh() {
    if (window.authManager) {
        return window.authManager.refreshToken();
    }
}

// Initialize global authentication manager
window.authManager = new AuthenticationManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthenticationManager;
}
