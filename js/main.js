/**
 * Main Application Controller
 * Coordinates all modules and handles global application logic
 */

class TalabatPOSApp {
    constructor() {
        this.version = '1.0.0';
        this.initialized = false;
        this.currentTab = 'configuration';
        
        // Module references
        this.configManager = null;
        this.apiClient = null;
        this.authManager = null;
        this.integrationTester = null;
        this.monitoringManager = null;
        this.reportsManager = null;
        
        this.initialize();
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log(`🚀 Initializing Talabat POS Integration Platform v${this.version}`);
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initializeApp());
            } else {
                this.initializeApp();
            }
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showCriticalError('Failed to initialize application: ' + error.message);
        }
    }
    
    /**
     * Initialize application after DOM is ready
     */
    async initializeApp() {
        try {
            // Get references to initialized modules
            this.configManager = window.configManager;
            this.apiClient = window.apiClient;
            this.authManager = window.authManager;
            this.integrationTester = window.integrationTester;
            this.monitoringManager = window.monitoringManager;
            this.reportsManager = window.reportsManager;
            
            // Setup global event listeners
            this.setupEventListeners();
            
            // Initialize UI
            this.initializeUI();
            
            // Check initial state
            this.checkInitialState();
            
            this.initialized = true;
            
            console.log('✅ Application initialized successfully');
            
            // Log initialization
            if (this.monitoringManager) {
                this.monitoringManager.addLog({
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Talabat POS Integration Platform v${this.version} initialized`,
                    module: 'TalabatPOSApp'
                });
            }
            
        } catch (error) {
            console.error('Error during app initialization:', error);
            this.showCriticalError('Application initialization failed: ' + error.message);
        }
    }
    
    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.textContent.toLowerCase().replace(' ', '');
                this.showTab(tab);
            });
        });
        
        // Configuration form changes
        const configFields = ['integrationName', 'integrationCode', 'baseUrl', 'pluginUsername', 
                             'pluginPassword', 'environment', 'country', 'vendorCode', 'remoteId'];
        
        configFields.forEach(fieldId => {
            const element = document.getElementById(fieldId);
            if (element) {
                element.addEventListener('change', () => this.onConfigurationChange());
            }
        });
        
        // Country change updates region
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            countrySelect.addEventListener('change', (e) => {
                this.updateRegionFromCountry(e.target.value);
            });
        }
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
        
        // Window beforeunload for unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
        
        // Handle import file selection
        const importInput = document.createElement('input');
        importInput.type = 'file';
        importInput.accept = '.json';
        importInput.style.display = 'none';
        importInput.addEventListener('change', (e) => this.handleConfigImport(e));
        document.body.appendChild(importInput);
        window.configImportInput = importInput;
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        // Show default tab
        this.showTab('configuration');
        
        // Initialize tooltips and help text
        this.initializeTooltips();
        
        // Set up responsive behavior
        this.setupResponsiveBehavior();
        
        // Initialize form validation
        this.initializeFormValidation();
    }
    
    /**
     * Check initial application state
     */
    checkInitialState() {
        // Check if configuration exists
        const config = this.configManager?.getCurrentConfig();
        if (config && config.integrationName) {
            console.log('✅ Configuration loaded:', config.integrationName);
        } else {
            console.log('⚠️ No configuration found - please configure integration');
        }
        
        // Check authentication status
        if (this.authManager?.isAuthenticated) {
            console.log('✅ User is authenticated');
        } else {
            console.log('🔐 Authentication required');
        }
        
        // Update UI based on state
        this.updateUIState();
    }
    
    /**
     * Show specific tab
     */
    showTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = Array.from(document.querySelectorAll('.tab-btn'))
            .find(btn => btn.textContent.toLowerCase().includes(tabName));
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
            this.currentTab = tabName;
        }
        
        // Log tab change
        if (this.monitoringManager) {
            this.monitoringManager.addLog({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Tab changed to: ${tabName}`,
                module: 'TalabatPOSApp'
            });
        }
    }
    
    /**
     * Handle configuration changes
     */
    onConfigurationChange() {
        // Mark as having unsaved changes
        this.markUnsavedChanges(true);
        
        // Auto-validate configuration on change
        setTimeout(() => {
            this.validateConfigurationSilently();
        }, 500);
    }
    
    /**
     * Update region based on selected country
     */
    updateRegionFromCountry(countryCode) {
        const regionSelect = document.getElementById('regionSelect');
        if (!regionSelect || !this.configManager) return;
        
        const countryConfig = this.configManager.config.countries[countryCode];
        if (countryConfig) {
            regionSelect.value = countryConfig.region;
        }
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + S to save configuration
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            this.saveConfiguration();
        }
        
        // Ctrl/Cmd + E to export configuration
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            this.exportConfiguration();
        }
        
        // Ctrl/Cmd + R to run full test suite (when not in input field)
        if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
            e.preventDefault();
            this.runFullTestSuite();
        }
        
        // Tab numbers for quick navigation
        if (e.ctrlKey || e.metaKey) {
            const tabMap = {
                '1': 'configuration',
                '2': 'testing',
                '3': 'monitoring',
                '4': 'reports'
            };
            
            if (tabMap[e.key]) {
                e.preventDefault();
                this.showTab(tabMap[e.key]);
            }
        }
    }
    
    /**
     * Handle configuration import
     */
    async handleConfigImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            await this.configManager.importConfiguration(file);
            this.showSuccessMessage('Configuration imported successfully!');
            this.updateUIState();
        } catch (error) {
            this.showErrorMessage('Failed to import configuration: ' + error.message);
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    /**
     * Initialize tooltips and help text
     */
    initializeTooltips() {
        // Add tooltips to form elements
        const tooltips = {
            'integrationName': 'Enter your company name and country (e.g., "Perfect POS UAE")',
            'integrationCode': 'Use lowercase with hyphens (e.g., "perfect-pos-ae")',
            'baseUrl': 'Your POS system\'s API base URL (must use HTTPS)',
            'pluginUsername': 'Username provided by Talabat for API access',
            'pluginPassword': 'Password provided by Talabat for API access',
            'vendorCode': 'Your unique vendor identifier in Talabat system',
            'remoteId': 'Your restaurant/store ID in your POS system'
        };
        
        Object.entries(tooltips).forEach(([id, tooltip]) => {
            const element = document.getElementById(id);
            if (element) {
                element.title = tooltip;
            }
        });
    }
    
    /**
     * Setup responsive behavior
     */
    setupResponsiveBehavior() {
        // Handle mobile menu behavior
        const handleResize = () => {
            const isMobile = window.innerWidth < 768;
            
            // Adjust tab navigation for mobile
            const navTabs = document.querySelector('.nav-tabs');
            if (navTabs) {
                if (isMobile) {
                    navTabs.classList.add('mobile');
                } else {
                    navTabs.classList.remove('mobile');
                }
            }
        };
        
        window.addEventListener('resize', handleResize);
        handleResize(); // Initial check
    }
    
    /**
     * Initialize form validation
     */
    initializeFormValidation() {
        // Add real-time validation to form fields
        const fields = [
            { id: 'integrationName', pattern: /^[a-zA-Z\s]+[a-zA-Z]+$/, message: 'Use only letters and spaces' },
            { id: 'integrationCode', pattern: /^[a-z-]+$/, message: 'Use only lowercase letters and hyphens' },
            { id: 'baseUrl', validation: 'url', message: 'Must be a valid HTTPS URL' },
            { id: 'pluginUsername', pattern: /^[a-zA-Z0-9_]+$/, message: 'Use only letters, numbers, and underscores' }
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                element.addEventListener('blur', () => this.validateField(field));
                element.addEventListener('input', () => this.clearFieldError(field.id));
            }
        });
    }
    
    /**
     * Validate individual field
     */
    validateField(field) {
        const element = document.getElementById(field.id);
        if (!element) return true;
        
        const value = element.value.trim();
        let isValid = true;
        
        if (field.pattern && !field.pattern.test(value)) {
            isValid = false;
        } else if (field.validation === 'url' && value) {
            try {
                const url = new URL(value);
                if (!url.protocol.startsWith('https')) {
                    isValid = false;
                }
            } catch {
                isValid = false;
            }
        }
        
        if (!isValid && value) {
            this.showFieldError(field.id, field.message);
        } else {
            this.clearFieldError(field.id);
        }
        
        return isValid;
    }
    
    /**
     * Show field error
     */
    showFieldError(fieldId, message) {
        const element = document.getElementById(fieldId);
        if (!element) return;
        
        element.classList.add('error');
        
        // Remove existing error message
        this.clearFieldError(fieldId);
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.id = `${fieldId}-error`;
        
        element.parentNode.appendChild(errorDiv);
    }
    
    /**
     * Clear field error
     */
    clearFieldError(fieldId) {
        const element = document.getElementById(fieldId);
        if (element) {
            element.classList.remove('error');
        }
        
        const errorElement = document.getElementById(`${fieldId}-error`);
        if (errorElement) {
            errorElement.remove();
        }
    }
    
    /**
     * Validate configuration silently
     */
    validateConfigurationSilently() {
        if (!this.configManager) return;
        
        const formData = this.configManager.getFormData();
        const validation = this.configManager.validateConfiguration(formData);
        
        // Update UI to show validation status without alerts
        const configSection = document.querySelector('#configuration-tab .test-section');
        if (configSection) {
            if (validation.isValid) {
                configSection.classList.remove('invalid');
                configSection.classList.add('valid');
            } else {
                configSection.classList.remove('valid');
                configSection.classList.add('invalid');
            }
        }
    }
    
    /**
     * Update UI state based on current application state
     */
    updateUIState() {
        // Update authentication status
        if (this.authManager) {
            const authStatus = this.authManager.getAuthStatus();
            const authSection = document.querySelector('[data-requires-auth]');
            if (authSection) {
                authSection.disabled = !authStatus.isAuthenticated;
            }
        }
        
        // Update test results badges
        if (this.integrationTester) {
            this.integrationTester.updateAllBadges();
        }
        
        // Update monitoring dashboard
        if (this.monitoringManager) {
            this.monitoringManager.updateDashboard();
        }
    }
    
    /**
     * Check if there are unsaved changes
     */
    hasUnsavedChanges() {
        const element = document.querySelector('[data-unsaved]');
        return element !== null;
    }
    
    /**
     * Mark unsaved changes
     */
    markUnsavedChanges(hasChanges) {
        if (hasChanges) {
            document.body.setAttribute('data-unsaved', 'true');
        } else {
            document.body.removeAttribute('data-unsaved');
        }
    }
    
    /**
     * Show critical error
     */
    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'critical-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <h2>⚠️ Critical Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()">Reload Application</button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    /**
     * Show success message
     */
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }
    
    /**
     * Show error message
     */
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
}

// Global functions for backward compatibility and easy access
function showTab(tabName) {
    if (window.talabatPOSApp) {
        window.talabatPOSApp.showTab(tabName);
    }
}

function validateConfiguration() {
    if (window.configManager) {
        const formData = window.configManager.getFormData();
        const validation = window.configManager.validateConfiguration(formData);
        
        if (validation.isValid) {
            window.authManager?.showResults('Configuration Validation', ['✅ Configuration is valid'], 'auth-results');
        } else {
            const errors = validation.errors.map(error => '❌ ' + error);
            window.authManager?.showResults('Configuration Validation', errors, 'auth-results');
        }
    }
}

function saveConfiguration() {
    if (window.configManager) {
        const formData = window.configManager.getFormData();
        const validation = window.configManager.validateConfiguration(formData);
        
        if (validation.isValid) {
            const success = window.configManager.saveConfiguration(formData);
            if (success) {
                window.talabatPOSApp?.showSuccessMessage('Configuration saved successfully!');
                window.talabatPOSApp?.markUnsavedChanges(false);
            } else {
                window.talabatPOSApp?.showErrorMessage('Failed to save configuration');
            }
        } else {
            window.talabatPOSApp?.showErrorMessage('Please fix validation errors before saving');
            validateConfiguration(); // Show errors
        }
    }
}

function exportConfiguration() {
    if (window.configManager) {
        window.configManager.exportConfiguration();
    }
}

function importConfiguration() {
    if (window.configImportInput) {
        window.configImportInput.click();
    }
}

function runFullTestSuite() {
    if (window.integrationTester) {
        // Ensure we're on the testing tab
        showTab('testing');
        
        // Check prerequisites
        const config = window.configManager?.getCurrentConfig();
        if (!config || !config.integrationName) {
            window.talabatPOSApp?.showErrorMessage('Please configure the integration first');
            showTab('configuration');
            return;
        }
        
        if (!window.authManager?.isAuthenticated) {
            window.talabatPOSApp?.showErrorMessage('Please authenticate first');
            return;
        }
        
        // Run the full test suite
        window.integrationTester.runFullTestSuite();
    }
}

// CSS for additional UI elements
const additionalCSS = `
    .field-error {
        color: var(--bg-danger);
        font-size: 0.8rem;
        margin-top: 5px;
    }
    
    .form-group input.error,
    .form-group select.error,
    .form-group textarea.error {
        border-color: var(--bg-danger);
        box-shadow: 0 0 0 3px rgba(255, 65, 108, 0.1);
    }
    
    .test-section.valid {
        border-left: 4px solid var(--bg-success);
    }
    
    .test-section.invalid {
        border-left: 4px solid var(--bg-danger);
    }
    
    .critical-error {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }
    
    .error-content {
        background: white;
        padding: 40px;
        border-radius: var(--border-radius-lg);
        text-align: center;
        max-width: 500px;
    }
    
    .toast {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: var(--border-radius);
        color: white;
        font-weight: 600;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        z-index: 9999;
    }
    
    .toast.show {
        opacity: 1;
        transform: translateX(0);
    }
    
    .toast-success {
        background: var(--bg-success);
    }
    
    .toast-error {
        background: var(--bg-danger);
    }
    
    .toast-info {
        background: var(--bg-info);
    }
    
    [data-unsaved] .header::after {
        content: " (Unsaved Changes)";
        color: var(--bg-warning);
        font-size: 0.8rem;
    }
`;

// Add additional CSS to page
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Initialize application when script loads
window.talabatPOSApp = new TalabatPOSApp();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TalabatPOSApp;
}
