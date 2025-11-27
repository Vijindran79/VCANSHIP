// Multi-API Shipping Rate Comparison System for VCANSHIP
// Compares rates from multiple providers to give customers the best prices

import { SendCloudAPI, type SendCloudConfig, type ShippingMethod as SendCloudMethod } from './sendcloud-api.js';

// Shippo API Integration (excellent for rate comparison)
interface ShippoConfig {
    apiKey: string;
    baseUrl: string;
}

interface ShippoAddress {
    name: string;
    company?: string;
    street1: string;
    street2?: string;
    city: string;
    state?: string;
    zip: string;
    country: string;
    phone?: string;
    email?: string;
}

interface ShippoParcel {
    length: number;
    width: number;
    height: number;
    distance_unit: 'cm' | 'in';
    weight: number;
    mass_unit: 'kg' | 'lb';
}

interface ShippoRate {
    object_id: string;
    amount: string;
    currency: string;
    amount_local: string;
    currency_local: string;
    provider: string;
    servicelevel: {
        name: string;
        token: string;
    };
    estimated_days: number;
    duration_terms?: string;
}

// Unified shipping method interface for VCANSHIP
interface UnifiedShippingMethod {
    id: string;
    provider: 'sendcloud' | 'shippo' | 'easypost' | 'dhl' | 'fedex';
    carrierName: string;
    serviceName: string;
    price: number;
    currency: string;
    estimatedDays: number;
    estimatedDeliveryDate?: string;
    isRecommended?: boolean;
    isCheapest?: boolean;
    isFastest?: boolean;
    commission?: number;
    originalData: any;
}

// Commission configuration
interface CommissionConfig {
    sendcloud: {
        percentage: number;
        fixedFee: number;
    };
    shippo: {
        percentage: number;
        fixedFee: number;
    };
    default: {
        percentage: number;
        fixedFee: number;
    };
}

class ShippoAPI {
    private config: ShippoConfig;

    constructor(config: ShippoConfig) {
        this.config = {
            baseUrl: 'https://api.goshippo.com',
            ...config
        };
    }

    async getRates(fromAddress: ShippoAddress, toAddress: ShippoAddress, parcel: ShippoParcel): Promise<ShippoRate[]> {
        const shipmentData = {
            address_from: fromAddress,
            address_to: toAddress,
            parcels: [parcel],
            async: false
        };

        console.log('🚢 Fetching Shippo rates...');
        console.log('Request:', JSON.stringify(shipmentData, null, 2));

        try {
            const response = await fetch(`${this.config.baseUrl}/shipments/`, {
                method: 'POST',
                headers: {
                    'Authorization': `ShippoToken ${this.config.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(shipmentData)
            });

            const data = await response.json();
            console.log('Shippo response:', data);

            if (!response.ok) {
                throw new Error(`Shippo API Error: ${response.status} - ${JSON.stringify(data)}`);
            }

            return data.rates || [];
        } catch (error) {
            console.error('Shippo API Error:', error);
            return [];
        }
    }
}

class MultiAPIShippingService {
    private sendCloudAPI: SendCloudAPI;
    private shippoAPI: ShippoAPI;
    private commissionConfig: CommissionConfig;

    constructor(
        sendCloudConfig: SendCloudConfig,
        shippoConfig: ShippoConfig,
        commissionConfig: CommissionConfig
    ) {
        this.sendCloudAPI = new SendCloudAPI(sendCloudConfig);
        this.shippoAPI = new ShippoAPI(shippoConfig);
        this.commissionConfig = commissionConfig;
    }

    /**
     * Get rates from all providers and return the best options for customers
     */
    async getBestRates(
        senderData: any,
        recipientData: any,
        parcelData: any
    ): Promise<{
        cheapest: UnifiedShippingMethod | null;
        fastest: UnifiedShippingMethod | null;
        recommended: UnifiedShippingMethod | null;
        allRates: UnifiedShippingMethod[];
        savings: number;
        totalCommission: number;
    }> {
        console.log('🔍 Starting multi-API rate comparison...');

        const allRates: UnifiedShippingMethod[] = [];

        // Fetch SendCloud rates
        try {
            const sendCloudRates = await this.getSendCloudRates(senderData, recipientData, parcelData);
            allRates.push(...sendCloudRates);
            console.log(`✅ SendCloud: ${sendCloudRates.length} rates`);
        } catch (error) {
            console.warn('⚠️ SendCloud rates failed:', error);
        }

        // Fetch Shippo rates
        try {
            const shippoRates = await this.getShippoRates(senderData, recipientData, parcelData);
            allRates.push(...shippoRates);
            console.log(`✅ Shippo: ${shippoRates.length} rates`);
        } catch (error) {
            console.warn('⚠️ Shippo rates failed:', error);
        }

        // Analyze and categorize rates
        const analysis = this.analyzeRates(allRates);
        
        console.log(`🎯 Analysis complete: ${allRates.length} total rates`);
        console.log(`💰 Cheapest: ${analysis.cheapest?.carrierName} - ${analysis.cheapest?.price}`);
        console.log(`⚡ Fastest: ${analysis.fastest?.carrierName} - ${analysis.fastest?.estimatedDays} days`);
        console.log(`💡 Recommended: ${analysis.recommended?.carrierName}`);
        console.log(`💵 Total commission: ${analysis.totalCommission}`);

        return analysis;
    }

    private async getSendCloudRates(senderData: any, recipientData: any, parcelData: any): Promise<UnifiedShippingMethod[]> {
        const request = {
            from_address: {
                name: senderData.name,
                address: senderData.address,
                city: senderData.city,
                postal_code: senderData.postcode,
                country: senderData.country,
                telephone: senderData.phone,
                email: senderData.email
            },
            to_address: {
                name: recipientData.name,
                address: recipientData.address,
                city: recipientData.city,
                postal_code: recipientData.postcode,
                country: recipientData.country,
                telephone: recipientData.phone,
                email: recipientData.email
            },
            parcel: {
                weight: parseFloat(parcelData.weight),
                length: parcelData.length ? parseInt(parcelData.length) : undefined,
                width: parcelData.width ? parseInt(parcelData.width) : undefined,
                height: parcelData.height ? parseInt(parcelData.height) : undefined,
                value: parseFloat(parcelData.value),
                description: parcelData.description
            }
        };

        const response = await this.sendCloudAPI.getShippingPrices(request);
        
        return (response.shipping_methods || []).map(method => ({
            id: `sendcloud_${method.id}`,
            provider: 'sendcloud' as const,
            carrierName: method.carrier,
            serviceName: method.name,
            price: method.price,
            currency: method.currency,
            estimatedDays: this.parseEstimatedDays(method.estimated_delivery_date),
            estimatedDeliveryDate: method.estimated_delivery_date,
            commission: this.calculateCommission(method.price, 'sendcloud'),
            originalData: method
        }));
    }

    private async getShippoRates(senderData: any, recipientData: any, parcelData: any): Promise<UnifiedShippingMethod[]> {
        const fromAddress: ShippoAddress = {
            name: senderData.name,
            street1: senderData.address,
            city: senderData.city,
            zip: senderData.postcode,
            country: senderData.country,
            phone: senderData.phone,
            email: senderData.email
        };

        const toAddress: ShippoAddress = {
            name: recipientData.name,
            street1: recipientData.address,
            city: recipientData.city,
            zip: recipientData.postcode,
            country: recipientData.country,
            phone: recipientData.phone,
            email: recipientData.email
        };

        const parcel: ShippoParcel = {
            length: parcelData.length || 30,
            width: parcelData.width || 20,
            height: parcelData.height || 15,
            distance_unit: 'cm',
            weight: parseFloat(parcelData.weight),
            mass_unit: 'kg'
        };

        const rates = await this.shippoAPI.getRates(fromAddress, toAddress, parcel);
        
        return rates.map(rate => ({
            id: `shippo_${rate.object_id}`,
            provider: 'shippo' as const,
            carrierName: rate.provider,
            serviceName: rate.servicelevel.name,
            price: parseFloat(rate.amount),
            currency: rate.currency,
            estimatedDays: rate.estimated_days,
            commission: this.calculateCommission(parseFloat(rate.amount), 'shippo'),
            originalData: rate
        }));
    }

    private analyzeRates(rates: UnifiedShippingMethod[]) {
        if (rates.length === 0) {
            return {
                cheapest: null,
                fastest: null,
                recommended: null,
                allRates: [],
                savings: 0,
                totalCommission: 0
            };
        }

        // Sort by price (cheapest first)
        const sortedByPrice = [...rates].sort((a, b) => a.price - b.price);
        const cheapest = sortedByPrice[0];
        
        // Sort by speed (fastest first)
        const sortedBySpeed = [...rates].sort((a, b) => a.estimatedDays - b.estimatedDays);
        const fastest = sortedBySpeed[0];

        // Find recommended (best balance of price and speed)
        const recommended = this.findRecommended(rates);

        // Calculate savings compared to most expensive
        const mostExpensive = sortedByPrice[sortedByPrice.length - 1];
        const savings = mostExpensive.price - cheapest.price;

        // Mark special rates
        rates.forEach(rate => {
            rate.isCheapest = rate.id === cheapest.id;
            rate.isFastest = rate.id === fastest.id;
            rate.isRecommended = rate.id === recommended.id;
        });

        // Calculate total commission
        const totalCommission = rates.reduce((sum, rate) => sum + (rate.commission || 0), 0);

        return {
            cheapest,
            fastest,
            recommended,
            allRates: sortedByPrice, // Return sorted by price for customer benefit
            savings,
            totalCommission
        };
    }

    private findRecommended(rates: UnifiedShippingMethod[]): UnifiedShippingMethod {
        // Score each rate based on price and speed (lower is better)
        const scoredRates = rates.map(rate => {
            const priceScore = rate.price;
            const speedScore = rate.estimatedDays * 10; // Weight speed less than price
            const totalScore = priceScore + speedScore;
            
            return { rate, score: totalScore };
        });

        // Return the rate with the best (lowest) score
        scoredRates.sort((a, b) => a.score - b.score);
        return scoredRates[0].rate;
    }

    private calculateCommission(price: number, provider: keyof CommissionConfig): number {
        const config = this.commissionConfig[provider] || this.commissionConfig.default;
        return (price * config.percentage / 100) + config.fixedFee;
    }

    private parseEstimatedDays(deliveryDate?: string): number {
        if (!deliveryDate) return 3; // Default estimate
        
        const date = new Date(deliveryDate);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(1, diffDays);
    }

    /**
     * Get commission summary for tracking
     */
    getCommissionSummary(rates: UnifiedShippingMethod[]) {
        const summary = {
            total: 0,
            byProvider: {} as Record<string, number>,
            averageMargin: 0
        };

        rates.forEach(rate => {
            const commission = rate.commission || 0;
            summary.total += commission;
            summary.byProvider[rate.provider] = (summary.byProvider[rate.provider] || 0) + commission;
        });

        if (rates.length > 0) {
            const totalRevenue = rates.reduce((sum, rate) => sum + rate.price, 0);
            summary.averageMargin = (summary.total / totalRevenue) * 100;
        }

        return summary;
    }
}

// Configuration for VCANSHIP
export const VCANSHIP_SHIPPING_CONFIG = {
    sendcloud: {
        publicKey: 'YOUR_SENDCLOUD_PUBLIC_KEY',
        secretKey: 'YOUR_SENDCLOUD_SECRET_KEY',
        baseUrl: 'https://panel.sendcloud.sc/api/v2'
    },
    shippo: {
        apiKey: 'YOUR_SHIPPO_API_KEY',
        baseUrl: 'https://api.goshippo.com'
    },
    commission: {
        sendcloud: {
            percentage: 5.0, // 5% commission
            fixedFee: 0.50   // £0.50 fixed fee
        },
        shippo: {
            percentage: 4.5, // 4.5% commission
            fixedFee: 0.30   // £0.30 fixed fee
        },
        default: {
            percentage: 5.0,
            fixedFee: 0.50
        }
    }
};

// Main export for VCANSHIP integration
export async function getVCANSHIPBestRates(
    senderData: any,
    recipientData: any,
    parcelData: any
) {
    const service = new MultiAPIShippingService(
        VCANSHIP_SHIPPING_CONFIG.sendcloud,
        VCANSHIP_SHIPPING_CONFIG.shippo,
        VCANSHIP_SHIPPING_CONFIG.commission
    );

    return await service.getBestRates(senderData, recipientData, parcelData);
}

export { MultiAPIShippingService, type UnifiedShippingMethod, type CommissionConfig };