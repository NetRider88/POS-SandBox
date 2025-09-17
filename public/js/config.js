/**
 * Configuration Management Module
 * Handles application configuration, settings, and environment management
 */

class ConfigurationManager {
    constructor() {
        this.config = {
            // Talabat API Configuration
            talabatAPI: {
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
            },
            
            // Regional IP Addresses for Whitelisting
            ipAddresses: {
                me: ['63.32.225.161', '18.202.96.85', '52.208.41.152'],
                eu: ['63.32.162.210', '34.255.237.245', '63.32.145.112'],
                apac: ['3.0.217.166', '3.1.134.42', '3.1.56.76'],
                latam: ['54.161.200.26', '54.174.130.155', '18.204.190.239'],
                staging: ['34.246.34.27', '18.202.142.208', '54.72.10.41']
            },
            
            // Countries and their configurations
            countries: {
                AE: { name: 'UAE', currency: 'AED', region: 'me' },
                SA: { name: 'Saudi Arabia', currency: 'SAR', region: 'me' },
                KW: { name: 'Kuwait', currency: 'KWD', region: 'me' },
                BH: { name: 'Bahrain', currency: 'BHD', region: 'me' },
                OM: { name: 'Oman', currency: 'OMR', region: 'me' },
                QA: { name: 'Qatar', currency: 'QAR', region: 'me' },
                JO: { name: 'Jordan', currency: 'JOD', region: 'me' },
                EG: { name: 'Egypt', currency: 'EGP', region: 'me' }
            },
            
            // Default timeout and retry settings
            timeouts: {
                api: 30000,
                authentication: 10000,
                webhook: 15000
            },
            
            retryAttempts: 3,
            retryDelay: 1000,
            
            // Storage keys
            storageKeys: {
                config: 'talabat_pos_config',
                auth: 'talabat_pos_auth',
                testResults: 'talabat_pos_test_results',
                logs: 'talabat_pos_logs'
            }
        };
        
        this.currentConfig = null;
        this.loadConfiguration();
    }
    
    /**
     * Load configuration from localStorage or set defaults
     */
    loadConfiguration() {
        try {
            const saved = localStorage.getItem(this.config.storageKeys.config);
            if (saved) {
                this.currentConfig = JSON.parse(saved);
                this.populateForm();
            } else {
                this.setDefaults();
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            this.setDefaults();
        }
    }
    
    /**
     * Set default configuration values
     */
    setDefaults() {
        this.currentConfig = {
            integrationName: '',
            integrationCode: '',
            baseUrl: '',
            pluginUsername: '',
            pluginPassword: '',
            environment: 'staging',
            country: 'AE',
            region: 'me',
            vendorCode: '',
            remoteId: '',
            callbackUrl: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    
    /**
     * Save current configuration
     */
    saveConfiguration(formData = null) {
        try {
            if (formData) {
                this.currentConfig = { ...this.currentConfig, ...formData };
            }
            
            this.currentConfig.updatedAt = new Date().toISOString();
            localStorage.setItem(this.config.storageKeys.config, JSON.stringify(this.currentConfig));
            
            this.logActivity('Configuration saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving configuration:', error);
            this.logActivity('Error saving configuration: ' + error.message);
            return false;
        }
    }
    
    /**
     * Validate configuration data
     */
    validateConfiguration(config = null) {
        const data = config || this.currentConfig;
        const errors = [];
        
        // Required fields validation
        if (!data.integrationName) {
            errors.push('Integration Name is required');
        } else if (!/^[a-zA-Z\s]+[a-zA-Z]+$/.test(data.integrationName)) {
            errors.push('Integration Name should follow format: "Company Name Country"');
        }
        
        if (!data.integrationCode) {
            errors.push('Integration Code is required');
        } else if (!/^[a-z-]+$/.test(data.integrationCode)) {
            errors.push('Integration Code should follow format: "company-name-countrycode"');
        }
        
        if (!data.baseUrl) {
            errors.push('Base URL is required');
        } else if (!this.isValidUrl(data.baseUrl)) {
            errors.push('Base URL is not valid');
        } else if (!data.baseUrl.startsWith('https://')) {
            errors.push('Base URL must use HTTPS');
        }
        
        if (!data.pluginUsername) {
            errors.push('Plugin Username is required');
        }
        
        if (!data.pluginPassword) {
            errors.push('Plugin Password is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Get current Talabat API configuration based on environment
     */
    getAPIConfig() {
        const env = this.currentConfig?.environment || 'staging';
        return this.config.talabatAPI[env];
    }
    
    /**
     * Get IP addresses for current region
     */
    getRegionIPs() {
        const region = this.currentConfig?.region || 'me';
        return this.config.ipAddresses[region];
    }
    
    /**
     * Get country configuration
     */
    getCountryConfig() {
        const country = this.currentConfig?.country || 'AE';
        return this.config.countries[country];
    }
    
    /**
     * Export configuration as JSON
     */
    exportConfiguration() {
        const exportData = {
            ...this.currentConfig,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `talabat-pos-config-${this.currentConfig.integrationCode || 'export'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.logActivity('Configuration exported successfully');
    }
    
    /**
     * Import configuration from JSON file
     */
    importConfiguration(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importedConfig = JSON.parse(e.target.result);
                    
                    // Validate imported configuration
                    const validation = this.validateConfiguration(importedConfig);
                    
                    if (validation.isValid) {
                        this.currentConfig = importedConfig;
                        this.saveConfiguration();
                        this.populateForm();
                        this.logActivity('Configuration imported successfully');
                        resolve(importedConfig);
                    } else {
                        reject(new Error('Invalid configuration: ' + validation.errors.join(', ')));
                    }
                } catch (error) {
                    reject(new Error('Error parsing configuration file: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }
    
    /**
     * Populate form fields with current configuration
     */
    populateForm() {
        if (!this.currentConfig) return;
        
        const fields = [
            'integrationName', 'integrationCode', 'baseUrl', 'pluginUsername',
            'environment', 'country', 'vendorCode', 'remoteId', 'callbackUrl'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element && this.currentConfig[field]) {
                element.value = this.currentConfig[field];
            }
        });
        
        // Update region select based on country
        const regionSelect = document.getElementById('regionSelect');
        if (regionSelect && this.currentConfig.country) {
            const countryConfig = this.config.countries[this.currentConfig.country];
            if (countryConfig) {
                regionSelect.value = countryConfig.region;
            }
        }
    }
    
    /**
     * Get form data
     */
    getFormData() {
        const formData = {};
        const fields = [
            'integrationName', 'integrationCode', 'baseUrl', 'pluginUsername',
            'pluginPassword', 'environment', 'country', 'vendorCode', 'remoteId', 'callbackUrl'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                formData[field] = element.value;
            }
        });
        
        // Set region based on country
        const regionSelect = document.getElementById('regionSelect');
        if (regionSelect) {
            formData.region = regionSelect.value;
        }
        
        return formData;
    }
    
    /**
     * Utility method to validate URLs
     */
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    /**
     * Log activity for monitoring
     */
    logActivity(message, level = 'info') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            module: 'ConfigurationManager'
        };
        
        // Store in logs array (will be handled by monitoring module)
        if (window.monitoringManager) {
            window.monitoringManager.addLog(logEntry);
        }
        
        console.log(`[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`);
    }
    
    /**
     * Get current configuration
     */
    getCurrentConfig() {
        return this.currentConfig;
    }
    
    /**
     * Update specific configuration value
     */
    updateConfig(key, value) {
        if (this.currentConfig) {
            this.currentConfig[key] = value;
            this.currentConfig.updatedAt = new Date().toISOString();
        }
    }
}

// Initialize global configuration manager
window.configManager = new ConfigurationManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigurationManager;
}
