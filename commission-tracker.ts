// Commission Tracking System for VCANSHIP
// Track earnings from different shipping providers

import { type UnifiedShippingMethod } from './multi-api-shipping.js';

interface CommissionRecord {
    id: string;
    timestamp: Date;
    provider: string;
    carrierName: string;
    serviceName: string;
    customerPrice: number;
    commission: number;
    commissionPercentage: number;
    currency: string;
    shipmentId?: string;
    customerEmail?: string;
    route: string;
}

interface CommissionSummary {
    totalCommission: number;
    totalRevenue: number;
    averageMargin: number;
    transactionCount: number;
    byProvider: Record<string, {
        commission: number;
        revenue: number;
        count: number;
        averageCommission: number;
    }>;
    byCarrier: Record<string, {
        commission: number;
        revenue: number;
        count: number;
    }>;
    dailyTrends: Array<{
        date: string;
        commission: number;
        revenue: number;
        count: number;
    }>;
}

class CommissionTracker {
    private records: CommissionRecord[] = [];
    private storageKey = 'vcanship_commission_records';

    constructor() {
        this.loadRecords();
    }

    /**
     * Record a commission when a customer selects a shipping method
     */
    recordCommission(
        method: UnifiedShippingMethod,
        customerData?: {
            email?: string;
            shipmentId?: string;
            route?: string;
        }
    ): CommissionRecord {
        const record: CommissionRecord = {
            id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            provider: method.provider,
            carrierName: method.carrierName,
            serviceName: method.serviceName,
            customerPrice: method.price,
            commission: method.commission || 0,
            commissionPercentage: method.commission ? (method.commission / method.price) * 100 : 0,
            currency: method.currency,
            shipmentId: customerData?.shipmentId,
            customerEmail: customerData?.email,
            route: customerData?.route || 'Unknown'
        };

        this.records.push(record);
        this.saveRecords();

        console.log('💰 Commission recorded:', record);
        return record;
    }

    /**
     * Get commission summary for a date range
     */
    getSummary(
        startDate?: Date,
        endDate?: Date,
        provider?: string
    ): CommissionSummary {
        let filteredRecords = this.records;

        // Filter by date range
        if (startDate || endDate) {
            filteredRecords = filteredRecords.filter(record => {
                const recordDate = new Date(record.timestamp);
                if (startDate && recordDate < startDate) return false;
                if (endDate && recordDate > endDate) return false;
                return true;
            });
        }

        // Filter by provider
        if (provider) {
            filteredRecords = filteredRecords.filter(record => record.provider === provider);
        }

        const summary: CommissionSummary = {
            totalCommission: 0,
            totalRevenue: 0,
            averageMargin: 0,
            transactionCount: filteredRecords.length,
            byProvider: {},
            byCarrier: {},
            dailyTrends: []
        };

        // Calculate totals and group by provider/carrier
        filteredRecords.forEach(record => {
            summary.totalCommission += record.commission;
            summary.totalRevenue += record.customerPrice;

            // By provider
            if (!summary.byProvider[record.provider]) {
                summary.byProvider[record.provider] = {
                    commission: 0,
                    revenue: 0,
                    count: 0,
                    averageCommission: 0
                };
            }
            summary.byProvider[record.provider].commission += record.commission;
            summary.byProvider[record.provider].revenue += record.customerPrice;
            summary.byProvider[record.provider].count += 1;

            // By carrier
            if (!summary.byCarrier[record.carrierName]) {
                summary.byCarrier[record.carrierName] = {
                    commission: 0,
                    revenue: 0,
                    count: 0
                };
            }
            summary.byCarrier[record.carrierName].commission += record.commission;
            summary.byCarrier[record.carrierName].revenue += record.customerPrice;
            summary.byCarrier[record.carrierName].count += 1;
        });

        // Calculate averages
        Object.keys(summary.byProvider).forEach(provider => {
            const providerData = summary.byProvider[provider];
            providerData.averageCommission = providerData.commission / providerData.count;
        });

        summary.averageMargin = summary.totalRevenue > 0 
            ? (summary.totalCommission / summary.totalRevenue) * 100 
            : 0;

        // Generate daily trends
        summary.dailyTrends = this.generateDailyTrends(filteredRecords);

        return summary;
    }

    /**
     * Get top performing providers/carriers
     */
    getTopPerformers(limit: number = 5): {
        topProviders: Array<{name: string; commission: number; count: number}>;
        topCarriers: Array<{name: string; commission: number; count: number}>;
    } {
        const summary = this.getSummary();

        const topProviders = Object.entries(summary.byProvider)
            .map(([name, data]) => ({
                name,
                commission: data.commission,
                count: data.count
            }))
            .sort((a, b) => b.commission - a.commission)
            .slice(0, limit);

        const topCarriers = Object.entries(summary.byCarrier)
            .map(([name, data]) => ({
                name,
                commission: data.commission,
                count: data.count
            }))
            .sort((a, b) => b.commission - a.commission)
            .slice(0, limit);

        return { topProviders, topCarriers };
    }

    /**
     * Export commission data for accounting
     */
    exportToCSV(startDate?: Date, endDate?: Date): string {
        const summary = this.getSummary(startDate, endDate);
        let filteredRecords = this.records;

        if (startDate || endDate) {
            filteredRecords = filteredRecords.filter(record => {
                const recordDate = new Date(record.timestamp);
                if (startDate && recordDate < startDate) return false;
                if (endDate && recordDate > endDate) return false;
                return true;
            });
        }

        const headers = [
            'Date',
            'Time',
            'Provider',
            'Carrier',
            'Service',
            'Customer Price',
            'Commission',
            'Commission %',
            'Currency',
            'Route',
            'Shipment ID',
            'Customer Email'
        ];

        const rows = filteredRecords.map(record => [
            new Date(record.timestamp).toLocaleDateString(),
            new Date(record.timestamp).toLocaleTimeString(),
            record.provider,
            record.carrierName,
            record.serviceName,
            record.customerPrice.toFixed(2),
            record.commission.toFixed(2),
            record.commissionPercentage.toFixed(2) + '%',
            record.currency,
            record.route,
            record.shipmentId || '',
            record.customerEmail || ''
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Get commission status - check if commissions are being tracked properly
     */
    getCommissionStatus(): {
        isTracking: boolean;
        totalRecords: number;
        lastRecord?: CommissionRecord;
        averageDailyCommission: number;
        status: 'healthy' | 'low' | 'none';
    } {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentSummary = this.getSummary(thirtyDaysAgo, now);

        const averageDailyCommission = recentSummary.totalCommission / 30;
        
        let status: 'healthy' | 'low' | 'none' = 'none';
        if (averageDailyCommission > 10) status = 'healthy';
        else if (averageDailyCommission > 1) status = 'low';

        return {
            isTracking: this.records.length > 0,
            totalRecords: this.records.length,
            lastRecord: this.records[this.records.length - 1],
            averageDailyCommission,
            status
        };
    }

    private generateDailyTrends(records: CommissionRecord[]): Array<{
        date: string;
        commission: number;
        revenue: number;
        count: number;
    }> {
        const dailyData: Record<string, {commission: number; revenue: number; count: number}> = {};

        records.forEach(record => {
            const date = new Date(record.timestamp).toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { commission: 0, revenue: 0, count: 0 };
            }
            dailyData[date].commission += record.commission;
            dailyData[date].revenue += record.customerPrice;
            dailyData[date].count += 1;
        });

        return Object.entries(dailyData)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    private loadRecords(): void {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.records = JSON.parse(stored).map((record: any) => ({
                    ...record,
                    timestamp: new Date(record.timestamp)
                }));
            }
        } catch (error) {
            console.warn('Failed to load commission records:', error);
            this.records = [];
        }
    }

    private saveRecords(): void {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.records));
        } catch (error) {
            console.warn('Failed to save commission records:', error);
        }
    }

    /**
     * Clear all records (use with caution)
     */
    clearRecords(): void {
        this.records = [];
        localStorage.removeItem(this.storageKey);
    }
}

// Singleton instance
export const commissionTracker = new CommissionTracker();

/**
 * Render commission dashboard for admin view
 */
export function renderCommissionDashboard(): string {
    const status = commissionTracker.getCommissionStatus();
    const summary = commissionTracker.getSummary();
    const performers = commissionTracker.getTopPerformers();

    return `
    <div class="commission-dashboard">
        <div class="dashboard-header">
            <h2><i class="fa-solid fa-chart-line"></i> Commission Dashboard</h2>
            <div class="dashboard-actions">
                <button id="export-commission-csv" class="secondary-btn">
                    <i class="fa-solid fa-download"></i> Export CSV
                </button>
                <button id="refresh-commission-data" class="secondary-btn">
                    <i class="fa-solid fa-refresh"></i> Refresh
                </button>
            </div>
        </div>

        <div class="commission-status">
            <div class="status-card ${status.status}">
                <div class="status-icon">
                    ${status.status === 'healthy' ? '✅' : status.status === 'low' ? '⚠️' : '❌'}
                </div>
                <div class="status-content">
                    <h3>Commission Status: ${status.status.toUpperCase()}</h3>
                    <p>Average daily commission: £${status.averageDailyCommission.toFixed(2)}</p>
                    <small>Total records: ${status.totalRecords}</small>
                </div>
            </div>
        </div>

        <div class="commission-summary-grid">
            <div class="summary-card">
                <h4>Total Commission</h4>
                <div class="summary-value">£${summary.totalCommission.toFixed(2)}</div>
                <small>From ${summary.transactionCount} transactions</small>
            </div>
            
            <div class="summary-card">
                <h4>Total Revenue</h4>
                <div class="summary-value">£${summary.totalRevenue.toFixed(2)}</div>
                <small>Customer payments</small>
            </div>
            
            <div class="summary-card">
                <h4>Average Margin</h4>
                <div class="summary-value">${summary.averageMargin.toFixed(1)}%</div>
                <small>Commission percentage</small>
            </div>
        </div>

        <div class="performance-charts">
            <div class="chart-section">
                <h4>Top Providers</h4>
                <div class="provider-list">
                    ${performers.topProviders.map(provider => `
                        <div class="provider-item">
                            <span class="provider-name">${provider.name}</span>
                            <span class="provider-commission">£${provider.commission.toFixed(2)}</span>
                            <small>${provider.count} transactions</small>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="chart-section">
                <h4>Top Carriers</h4>
                <div class="carrier-list">
                    ${performers.topCarriers.map(carrier => `
                        <div class="carrier-item">
                            <span class="carrier-name">${carrier.name}</span>
                            <span class="carrier-commission">£${carrier.commission.toFixed(2)}</span>
                            <small>${carrier.count} shipments</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        ${status.lastRecord ? `
        <div class="recent-activity">
            <h4>Latest Commission</h4>
            <div class="activity-item">
                <div class="activity-details">
                    <strong>${status.lastRecord.carrierName}</strong> - ${status.lastRecord.serviceName}
                    <br>
                    <small>${new Date(status.lastRecord.timestamp).toLocaleString()}</small>
                </div>
                <div class="activity-commission">
                    £${status.lastRecord.commission.toFixed(2)}
                </div>
            </div>
        </div>
        ` : ''}
    </div>
    `;
}

/**
 * Initialize commission tracking event listeners
 */
export function initializeCommissionTracking(): void {
    // Export CSV functionality
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        if (target.id === 'export-commission-csv') {
            const csv = commissionTracker.exportToCSV();
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vcanship-commissions-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        
        if (target.id === 'refresh-commission-data') {
            // Refresh the dashboard
            const dashboard = document.querySelector('.commission-dashboard');
            if (dashboard) {
                dashboard.innerHTML = renderCommissionDashboard();
            }
        }
    });
}

export { CommissionTracker, type CommissionRecord, type CommissionSummary };