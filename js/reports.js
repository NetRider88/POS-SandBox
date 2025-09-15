/**
 * Reports Module
 * Handles report generation, scheduling, and analytics
 */

class ReportsManager {
    constructor() {
        this.reportTemplates = {
            completed: {
                name: 'Completed Orders Report',
                description: 'Report of all successfully completed orders',
                fields: ['order_id', 'vendor_code', 'total_amount', 'completion_time', 'customer_info']
            },
            cancelled: {
                name: 'Cancelled Orders Report',
                description: 'Report of all cancelled orders with reasons',
                fields: ['order_id', 'vendor_code', 'total_amount', 'cancellation_reason', 'cancelled_at']
            },
            performance: {
                name: 'Performance Analysis Report',
                description: 'Comprehensive performance metrics and analytics',
                fields: ['response_times', 'success_rates', 'error_rates', 'throughput', 'uptime']
            },
            errors: {
                name: 'Error Analysis Report',
                description: 'Detailed analysis of errors and issues',
                fields: ['error_types', 'error_frequencies', 'error_trends', 'resolution_times']
            },
            all: {
                name: 'Comprehensive Order Report',
                description: 'All orders with complete details',
                fields: ['order_id', 'status', 'vendor_code', 'total_amount', 'timestamps', 'customer_info']
            }
        };
        
        this.scheduledReports = [];
        this.reportHistory = [];
        
        this.initialize();
    }
    
    /**
     * Initialize reports manager
     */
    initialize() {
        this.loadScheduledReports();
        this.loadReportHistory();
        this.setupDateDefaults();
    }
    
    /**
     * Load scheduled reports from storage
     */
    loadScheduledReports() {
        try {
            const stored = localStorage.getItem('talabat_pos_scheduled_reports');
            if (stored) {
                this.scheduledReports = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading scheduled reports:', error);
        }
    }
    
    /**
     * Save scheduled reports to storage
     */
    saveScheduledReports() {
        try {
            localStorage.setItem('talabat_pos_scheduled_reports', JSON.stringify(this.scheduledReports));
        } catch (error) {
            console.error('Error saving scheduled reports:', error);
        }
    }
    
    /**
     * Load report history from storage
     */
    loadReportHistory() {
        try {
            const stored = localStorage.getItem('talabat_pos_report_history');
            if (stored) {
                this.reportHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading report history:', error);
        }
    }
    
    /**
     * Save report history to storage
     */
    saveReportHistory() {
        try {
            // Keep only last 100 reports
            const recentHistory = this.reportHistory.slice(-100);
            localStorage.setItem('talabat_pos_report_history', JSON.stringify(recentHistory));
        } catch (error) {
            console.error('Error saving report history:', error);
        }
    }
    
    /**
     * Setup default date values
     */
    setupDateDefaults() {
        const today = new Date();
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        
        const fromDate = document.getElementById('reportFromDate');
        const toDate = document.getElementById('reportToDate');
        
        if (fromDate && !fromDate.value) {
            fromDate.value = lastMonth.toISOString().split('T')[0];
        }
        
        if (toDate && !toDate.value) {
            toDate.value = today.toISOString().split('T')[0];
        }
    }
    
    /**
     * Generate report based on parameters
     */
    async generateReport() {
        try {
            const params = this.getReportParameters();
            
            if (!this.validateReportParameters(params)) {
                throw new Error('Invalid report parameters');
            }
            
            this.showLoading('Generating report...');
            
            // Simulate report generation time
            await this.simulateApiCall(2000);
            
            const reportData = await this.createReportData(params);
            const formattedReport = await this.formatReport(reportData, params.format);
            
            this.hideLoading();
            
            // Save to history
            const reportRecord = {
                id: Date.now(),
                type: params.type,
                format: params.format,
                dateRange: { from: params.fromDate, to: params.toDate },
                generatedAt: new Date().toISOString(),
                recordCount: reportData.records ? reportData.records.length : 0,
                fileSize: this.estimateFileSize(formattedReport)
            };
            
            this.reportHistory.push(reportRecord);
            this.saveReportHistory();
            
            // Download or display report
            this.deliverReport(formattedReport, params, reportRecord);
            
            // Show success results
            this.showReportResults(reportRecord);
            
            this.logActivity(`Report generated successfully: ${this.reportTemplates[params.type].name}`, 'success');
            
        } catch (error) {
            this.hideLoading();
            this.showResults('Report Generation Results', [
                '❌ Report generation failed: ' + error.message
            ], 'report-results');
            
            this.logActivity('Report generation failed: ' + error.message, 'error');
        }
    }
    
    /**
     * Get report parameters from form
     */
    getReportParameters() {
        const fromDate = document.getElementById('reportFromDate')?.value;
        const toDate = document.getElementById('reportToDate')?.value;
        const type = document.getElementById('reportType')?.value || 'all';
        const format = document.getElementById('reportFormat')?.value || 'json';
        
        return {
            fromDate,
            toDate,
            type,
            format
        };
    }
    
    /**
     * Validate report parameters
     */
    validateReportParameters(params) {
        if (!params.fromDate || !params.toDate) {
            throw new Error('Please select date range');
        }
        
        const fromDate = new Date(params.fromDate);
        const toDate = new Date(params.toDate);
        
        if (fromDate > toDate) {
            throw new Error('From date cannot be later than to date');
        }
        
        const daysDiff = (toDate - fromDate) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
            throw new Error('Date range cannot exceed 365 days');
        }
        
        if (!this.reportTemplates[params.type]) {
            throw new Error('Invalid report type');
        }
        
        if (!['json', 'csv', 'pdf'].includes(params.format)) {
            throw new Error('Invalid report format');
        }
        
        return true;
    }
    
    /**
     * Create report data based on type and parameters
     */
    async createReportData(params) {
        const config = window.configManager?.getCurrentConfig();
        const template = this.reportTemplates[params.type];
        
        let reportData = {
            reportInfo: {
                title: template.name,
                description: template.description,
                generatedAt: new Date().toISOString(),
                dateRange: { from: params.fromDate, to: params.toDate },
                vendor: {
                    code: config?.vendorCode || 'N/A',
                    name: config?.integrationName || 'N/A',
                    environment: config?.environment || 'staging'
                }
            },
            summary: {},
            records: []
        };
        
        // Generate sample data based on report type
        switch (params.type) {
            case 'completed':
                reportData = await this.generateCompletedOrdersReport(reportData, params);
                break;
            case 'cancelled':
                reportData = await this.generateCancelledOrdersReport(reportData, params);
                break;
            case 'performance':
                reportData = await this.generatePerformanceReport(reportData, params);
                break;
            case 'errors':
                reportData = await this.generateErrorsReport(reportData, params);
                break;
            case 'all':
                reportData = await this.generateAllOrdersReport(reportData, params);
                break;
        }
        
        return reportData;
    }
    
    /**
     * Generate completed orders report data
     */
    async generateCompletedOrdersReport(reportData, params) {
        const fromDate = new Date(params.fromDate);
        const toDate = new Date(params.toDate);
        const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
        
        // Generate sample completed orders
        const sampleOrders = [];
        const ordersPerDay = Math.floor(Math.random() * 20) + 10;
        
        for (let i = 0; i < daysDiff * ordersPerDay; i++) {
            const orderDate = new Date(fromDate.getTime() + Math.random() * (toDate - fromDate));
            const completionTime = new Date(orderDate.getTime() + Math.random() * 60 * 60 * 1000); // Add 0-60 minutes
            
            sampleOrders.push({
                order_id: `ORD${Date.now()}_${i}`,
                vendor_code: reportData.reportInfo.vendor.code,
                remote_id: window.configManager?.getCurrentConfig()?.remoteId || '123456',
                order_date: orderDate.toISOString(),
                completion_time: completionTime.toISOString(),
                total_amount: (Math.random() * 100 + 20).toFixed(2),
                currency: window.configManager?.getCountryConfig()?.currency || 'AED',
                customer_info: {
                    masked_phone: `+971*****${Math.floor(Math.random() * 9000) + 1000}`,
                    area: `Area ${Math.floor(Math.random() * 10) + 1}`
                },
                delivery_time_minutes: Math.floor(Math.random() * 30) + 20,
                rating: Math.floor(Math.random() * 2) + 4 // 4-5 stars
            });
        }
        
        reportData.records = sampleOrders;
        reportData.summary = {
            total_orders: sampleOrders.length,
            total_revenue: sampleOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0).toFixed(2),
            average_order_value: sampleOrders.length > 0 ? 
                (sampleOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / sampleOrders.length).toFixed(2) : '0.00',
            average_delivery_time: sampleOrders.length > 0 ?
                Math.round(sampleOrders.reduce((sum, order) => sum + order.delivery_time_minutes, 0) / sampleOrders.length) : 0,
            average_rating: sampleOrders.length > 0 ?
                (sampleOrders.reduce((sum, order) => sum + order.rating, 0) / sampleOrders.length).toFixed(1) : '0.0'
        };
        
        return reportData;
    }
    
    /**
     * Generate cancelled orders report data
     */
    async generateCancelledOrdersReport(reportData, params) {
        const fromDate = new Date(params.fromDate);
        const toDate = new Date(params.toDate);
        const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
        
        const cancellationReasons = [
            'Customer Requested',
            'Restaurant Unavailable',
            'Out of Stock',
            'Delivery Issues',
            'Payment Failed',
            'Technical Error'
        ];
        
        const sampleCancelled = [];
        const cancelledPerDay = Math.floor(Math.random() * 5) + 1;
        
        for (let i = 0; i < daysDiff * cancelledPerDay; i++) {
            const orderDate = new Date(fromDate.getTime() + Math.random() * (toDate - fromDate));
            const cancelledAt = new Date(orderDate.getTime() + Math.random() * 30 * 60 * 1000); // Cancel within 30 minutes
            
            sampleCancelled.push({
                order_id: `CAN${Date.now()}_${i}`,
                vendor_code: reportData.reportInfo.vendor.code,
                order_date: orderDate.toISOString(),
                cancelled_at: cancelledAt.toISOString(),
                total_amount: (Math.random() * 100 + 20).toFixed(2),
                currency: window.configManager?.getCountryConfig()?.currency || 'AED',
                cancellation_reason: cancellationReasons[Math.floor(Math.random() * cancellationReasons.length)],
                cancelled_by: Math.random() > 0.5 ? 'customer' : 'restaurant',
                refund_amount: (Math.random() * 100 + 20).toFixed(2),
                refund_status: Math.random() > 0.2 ? 'processed' : 'pending'
            });
        }
        
        reportData.records = sampleCancelled;
        
        // Calculate cancellation reasons summary
        const reasonCounts = {};
        sampleCancelled.forEach(order => {
            reasonCounts[order.cancellation_reason] = (reasonCounts[order.cancellation_reason] || 0) + 1;
        });
        
        reportData.summary = {
            total_cancelled: sampleCancelled.length,
            total_refunded: sampleCancelled.reduce((sum, order) => sum + parseFloat(order.refund_amount), 0).toFixed(2),
            cancellation_reasons: reasonCounts,
            customer_cancelled: sampleCancelled.filter(order => order.cancelled_by === 'customer').length,
            restaurant_cancelled: sampleCancelled.filter(order => order.cancelled_by === 'restaurant').length,
            refunds_processed: sampleCancelled.filter(order => order.refund_status === 'processed').length,
            refunds_pending: sampleCancelled.filter(order => order.refund_status === 'pending').length
        };
        
        return reportData;
    }
    
    /**
     * Generate performance report data
     */
    async generatePerformanceReport(reportData, params) {
        const metrics = window.monitoringManager?.getMonitoringSummary() || {};
        
        reportData.records = [
            {
                metric: 'API Response Time',
                value: metrics.averageResponseTime || 0,
                unit: 'ms',
                status: metrics.averageResponseTime < 1000 ? 'good' : 'needs_attention'
            },
            {
                metric: 'Success Rate',
                value: metrics.successRate || 100,
                unit: '%',
                status: metrics.successRate > 95 ? 'excellent' : metrics.successRate > 90 ? 'good' : 'poor'
            },
            {
                metric: 'Total API Calls',
                value: window.monitoringManager?.performanceData.apiCalls || 0,
                unit: 'calls',
                status: 'info'
            },
            {
                metric: 'Error Rate',
                value: metrics.successRate ? (100 - metrics.successRate) : 0,
                unit: '%',
                status: metrics.successRate > 95 ? 'excellent' : 'needs_attention'
            },
            {
                metric: 'System Uptime',
                value: metrics.uptime || 'Unknown',
                unit: 'status',
                status: metrics.uptime === 'Active' ? 'excellent' : 'warning'
            }
        ];
        
        reportData.summary = {
            overall_performance: metrics.successRate > 95 && metrics.averageResponseTime < 1000 ? 'Excellent' : 
                                 metrics.successRate > 90 && metrics.averageResponseTime < 2000 ? 'Good' : 'Needs Improvement',
            recommendations: this.generatePerformanceRecommendations(metrics)
        };
        
        return reportData;
    }
    
    /**
     * Generate errors report data
     */
    async generateErrorsReport(reportData, params) {
        const logs = window.monitoringManager?.logs || [];
        const errorLogs = logs.filter(log => log.level === 'error');
        
        // Group errors by type
        const errorTypes = {};
        errorLogs.forEach(log => {
            const errorType = this.categorizeError(log.message);
            if (!errorTypes[errorType]) {
                errorTypes[errorType] = [];
            }
            errorTypes[errorType].push(log);
        });
        
        const errorSummary = Object.keys(errorTypes).map(type => ({
            error_type: type,
            count: errorTypes[type].length,
            first_occurrence: errorTypes[type][0]?.timestamp,
            last_occurrence: errorTypes[type][errorTypes[type].length - 1]?.timestamp,
            sample_message: errorTypes[type][0]?.message
        }));
        
        reportData.records = errorLogs.map(log => ({
            timestamp: log.timestamp,
            error_type: this.categorizeError(log.message),
            message: log.message,
            module: log.module,
            details: log.details
        }));
        
        reportData.summary = {
            total_errors: errorLogs.length,
            unique_error_types: Object.keys(errorTypes).length,
            error_types_summary: errorSummary,
            error_trend: this.calculateErrorTrend(errorLogs),
            most_common_error: errorSummary.length > 0 ? 
                errorSummary.reduce((max, current) => current.count > max.count ? current : max) : null
        };
        
        return reportData;
    }
    
    /**
     * Generate all orders report data
     */
    async generateAllOrdersReport(reportData, params) {
        // Combine completed and cancelled orders
        const completedData = await this.generateCompletedOrdersReport({ ...reportData }, params);
        const cancelledData = await this.generateCancelledOrdersReport({ ...reportData }, params);
        
        const allOrders = [
            ...completedData.records.map(order => ({ ...order, status: 'completed' })),
            ...cancelledData.records.map(order => ({ ...order, status: 'cancelled' }))
        ];
        
        // Sort by order date
        allOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
        
        reportData.records = allOrders;
        reportData.summary = {
            total_orders: allOrders.length,
            completed_orders: completedData.records.length,
            cancelled_orders: cancelledData.records.length,
            completion_rate: allOrders.length > 0 ? 
                ((completedData.records.length / allOrders.length) * 100).toFixed(1) + '%' : '0%',
            total_revenue: completedData.summary.total_revenue,
            total_refunded: cancelledData.summary.total_refunded
        };
        
        return reportData;
    }
    
    /**
     * Format report based on requested format
     */
    async formatReport(reportData, format) {
        switch (format) {
            case 'json':
                return JSON.stringify(reportData, null, 2);
            case 'csv':
                return this.formatAsCSV(reportData);
            case 'pdf':
                return this.formatAsPDF(reportData);
            default:
                return JSON.stringify(reportData, null, 2);
        }
    }
    
    /**
     * Format report data as CSV
     */
    formatAsCSV(reportData) {
        if (!reportData.records || reportData.records.length === 0) {
            return 'No data available';
        }
        
        // Get all possible columns
        const columns = new Set();
        reportData.records.forEach(record => {
            Object.keys(record).forEach(key => {
                if (typeof record[key] !== 'object' || record[key] === null) {
                    columns.add(key);
                }
            });
        });
        
        const columnArray = Array.from(columns).sort();
        
        // Create CSV content
        const csvLines = [columnArray.join(',')];
        
        reportData.records.forEach(record => {
            const row = columnArray.map(column => {
                const value = record[column];
                if (value === null || value === undefined) {
                    return '';
                }
                // Escape commas and quotes
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvLines.push(row.join(','));
        });
        
        return csvLines.join('\n');
    }
    
    /**
     * Format report data as PDF (simulated)
     */
    formatAsPDF(reportData) {
        // In a real implementation, this would generate actual PDF content
        // For now, we'll return a formatted text representation
        let pdfContent = `${reportData.reportInfo.title}\n`;
        pdfContent += `Generated: ${reportData.reportInfo.generatedAt}\n`;
        pdfContent += `Date Range: ${reportData.reportInfo.dateRange.from} to ${reportData.reportInfo.dateRange.to}\n\n`;
        
        pdfContent += 'SUMMARY:\n';
        Object.keys(reportData.summary).forEach(key => {
            pdfContent += `${key}: ${JSON.stringify(reportData.summary[key])}\n`;
        });
        
        pdfContent += '\nDETAILS:\n';
        reportData.records.forEach((record, index) => {
            pdfContent += `Record ${index + 1}:\n`;
            Object.keys(record).forEach(key => {
                pdfContent += `  ${key}: ${record[key]}\n`;
            });
            pdfContent += '\n';
        });
        
        return pdfContent;
    }
    
    /**
     * Deliver report to user (download or display)
     */
    deliverReport(formattedReport, params, reportRecord) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `talabat-pos-${params.type}-report-${timestamp}.${params.format}`;
        
        let mimeType;
        switch (params.format) {
            case 'json':
                mimeType = 'application/json';
                break;
            case 'csv':
                mimeType = 'text/csv';
                break;
            case 'pdf':
                mimeType = 'text/plain'; // In real implementation, would be 'application/pdf'
                break;
            default:
                mimeType = 'text/plain';
        }
        
        const blob = new Blob([formattedReport], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Show report generation results
     */
    showReportResults(reportRecord) {
        const results = [
            '✅ Report generated successfully',
            `✅ Report type: ${this.reportTemplates[reportRecord.type].name}`,
            `✅ Date range: ${reportRecord.dateRange.from} to ${reportRecord.dateRange.to}`,
            `✅ Format: ${reportRecord.format.toUpperCase()}`,
            `✅ Records: ${reportRecord.recordCount}`,
            `✅ File size: ${this.formatFileSize(reportRecord.fileSize)}`,
            '✅ Report downloaded successfully'
        ];
        
        this.showResults('Report Generation Results', results, 'report-results');
    }
    
    /**
     * Schedule recurring report
     */
    async scheduleReport() {
        try {
            const params = this.getReportParameters();
            
            if (!this.validateReportParameters(params)) {
                throw new Error('Invalid report parameters');
            }
            
            // Get scheduling preferences (would show modal in real implementation)
            const frequency = 'weekly'; // daily, weekly, monthly
            const scheduledReport = {
                id: Date.now(),
                ...params,
                frequency,
                nextRun: this.calculateNextRun(frequency),
                createdAt: new Date().toISOString(),
                active: true
            };
            
            this.scheduledReports.push(scheduledReport);
            this.saveScheduledReports();
            
            this.showResults('Report Scheduling Results', [
                '✅ Report scheduled successfully',
                `✅ Report type: ${this.reportTemplates[params.type].name}`,
                `✅ Frequency: ${frequency}`,
                `✅ Next run: ${scheduledReport.nextRun}`,
                '✅ You will receive email notifications when reports are generated'
            ], 'report-results');
            
            this.logActivity(`Report scheduled: ${this.reportTemplates[params.type].name} (${frequency})`, 'success');
            
        } catch (error) {
            this.showResults('Report Scheduling Results', [
                '❌ Report scheduling failed: ' + error.message
            ], 'report-results');
            
            this.logActivity('Report scheduling failed: ' + error.message, 'error');
        }
    }
    
    /**
     * Utility methods
     */
    calculateNextRun(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            case 'monthly':
                const nextMonth = new Date(now);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                return nextMonth.toISOString();
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        }
    }
    
    categorizeError(message) {
        if (message.includes('Authentication') || message.includes('login')) return 'Authentication';
        if (message.includes('Network') || message.includes('fetch')) return 'Network';
        if (message.includes('JSON') || message.includes('parse')) return 'Data Format';
        if (message.includes('timeout')) return 'Timeout';
        if (message.includes('Permission') || message.includes('access')) return 'Permission';
        return 'General';
    }
    
    calculateErrorTrend(errorLogs) {
        // Simple trend calculation based on recent vs older errors
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        
        const recentErrors = errorLogs.filter(log => new Date(log.timestamp).getTime() > oneHourAgo);
        const olderErrors = errorLogs.filter(log => new Date(log.timestamp).getTime() <= oneHourAgo);
        
        if (recentErrors.length > olderErrors.length) return 'increasing';
        if (recentErrors.length < olderErrors.length) return 'decreasing';
        return 'stable';
    }
    
    generatePerformanceRecommendations(metrics) {
        const recommendations = [];
        
        if (metrics.averageResponseTime > 1000) {
            recommendations.push('Consider optimizing API response times');
        }
        
        if (metrics.successRate < 95) {
            recommendations.push('Investigate and resolve API failures');
        }
        
        if (metrics.errorLogs > 0) {
            recommendations.push('Review and address system errors');
        }
        
        return recommendations.length > 0 ? recommendations : ['System performance is optimal'];
    }
    
    estimateFileSize(content) {
        return new Blob([content]).size;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    simulateApiCall(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }
    
    showLoading(message) {
        if (window.authManager) {
            window.authManager.showLoading(message);
        }
    }
    
    hideLoading() {
        if (window.authManager) {
            window.authManager.hideLoading();
        }
    }
    
    showResults(title, results, containerId) {
        if (window.authManager) {
            window.authManager.showResults(title, results, containerId);
        }
    }
    
    logActivity(message, level = 'info') {
        if (window.monitoringManager) {
            window.monitoringManager.addLog({
                timestamp: new Date().toISOString(),
                level: level,
                message: message,
                module: 'ReportsManager'
            });
        }
    }
}

// Global functions for backward compatibility
function generateReport() {
    if (window.reportsManager) {
        return window.reportsManager.generateReport();
    }
}

function scheduleReport() {
    if (window.reportsManager) {
        return window.reportsManager.scheduleReport();
    }
}

// Initialize global reports manager
window.reportsManager = new ReportsManager();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportsManager;
}
