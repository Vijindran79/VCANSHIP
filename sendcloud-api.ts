// SendCloud API Integration for VCANSHIP
// This module handles all SendCloud API interactions for shipping rates and labels

interface SendCloudConfig {
    publicKey: string;
    secretKey: string;
    baseUrl: string;
    partnerId?: string;
}

interface ShippingAddress {
    name: string;
    company?: string;
    address: string;
    address_2?: string;
    city: string;
    postal_code: string;
    country: string; // ISO 2-letter country code
    telephone?: string;
    email?: string;
}

interface ParcelData {
    weight: number; // in kg
    length?: number; // in cm
    width?: number; // in cm
    height?: number; // in cm
    value?: number; // declared value
    description?: string;
}

interface ShippingPriceRequest {
    from_address: ShippingAddress;
    to_address: ShippingAddress;
    parcel: ParcelData;
    carrier?: string; // Optional: specific carrier to get prices for
    shipping_method_id?: number; // Optional: specific shipping method
}

interface ShippingPriceResponse {
    shipping_methods: ShippingMethod[];
    errors?: string[];
}

interface ShippingMethod {
    id: number;
    name: string;
    carrier: string;
    price: number;
    currency: string;
    estimated_delivery_date?: string;
    service_point_input?: string;
    countries: string[];
    properties: {
        delivery_confirmation?: boolean;
        track_and_trace?: boolean;
        insurance?: boolean;
    };
}

class SendCloudAPI {
    private config: SendCloudConfig;

    constructor(config: SendCloudConfig) {
        this.config = {
            baseUrl: 'https://panel.sendcloud.sc/api/v2',
            ...config
        };
    }

    /**
     * Get shipping prices from SendCloud
     * This is the method that will help debug your API integration issue
     */
    async getShippingPrices(request: ShippingPriceRequest): Promise<ShippingPriceResponse> {
        const url = `${this.config.baseUrl}/shipping-price`;
        
        // Log the exact request for debugging
        console.log('=== SendCloud API Request Debug Info ===');
        console.log('URL:', url);
        console.log('Request Body:', JSON.stringify(request, null, 2));
        console.log('Headers:', {
            'Authorization': `Basic ${btoa(`${this.config.publicKey}:${this.config.secretKey}`)}`,
            'Content-Type': 'application/json'
        });
        console.log('=========================================');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(`${this.config.publicKey}:${this.config.secretKey}`)}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'VCANSHIP/1.0'
                },
                body: JSON.stringify(request)
            });

            const responseData = await response.json();

            // Log the response for debugging
            console.log('=== SendCloud API Response Debug Info ===');
            console.log('Status:', response.status);
            console.log('Response:', JSON.stringify(responseData, null, 2));
            console.log('==========================================');

            if (!response.ok) {
                throw new Error(`SendCloud API Error: ${response.status} - ${JSON.stringify(responseData)}`);
            }

            return responseData;
        } catch (error) {
            console.error('SendCloud API Error:', error);
            throw error;
        }
    }

    /**
     * Get available carriers for your account
     */
    async getCarriers(): Promise<any> {
        const url = `${this.config.baseUrl}/shipping-methods`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${this.config.publicKey}:${this.config.secretKey}`)}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            console.log('=== Available Carriers ===');
            console.log(JSON.stringify(data, null, 2));
            console.log('===========================');

            return data;
        } catch (error) {
            console.error('Error fetching carriers:', error);
            throw error;
        }
    }

    /**
     * Test the API connection
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.config.baseUrl}/user`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(`${this.config.publicKey}:${this.config.secretKey}`)}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('=== SendCloud Connection Test ===');
            console.log('Status:', response.status);
            console.log('Connected:', response.ok);
            console.log('==================================');

            return response.ok;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }
}

// Example usage and test function
export function createSendCloudTestRequest(): ShippingPriceRequest {
    return {
        from_address: {
            name: "VCANSHIP Sender",
            company: "VCANSHIP Ltd",
            address: "123 Business Street",
            city: "London",
            postal_code: "SW1A 1AA",
            country: "GB", // UK
            telephone: "+44 20 1234 5678",
            email: "sender@vcanship.com"
        },
        to_address: {
            name: "Test Recipient",
            address: "456 Delivery Avenue",
            city: "Manchester",
            postal_code: "M1 1AA",
            country: "GB", // UK
            telephone: "+44 161 123 4567",
            email: "recipient@example.com"
        },
        parcel: {
            weight: 2.5, // 2.5 kg
            length: 30,  // 30 cm
            width: 20,   // 20 cm
            height: 15,  // 15 cm
            value: 100,  // £100
            description: "Electronics"
        }
        // Note: Not specifying carrier to get all available options
    };
}

// Integration with VCANSHIP parcel service
export async function getVCANSHIPShippingRates(
    senderData: any,
    recipientData: any,
    parcelData: any,
    sendCloudConfig: SendCloudConfig
): Promise<ShippingMethod[]> {
    
    const api = new SendCloudAPI(sendCloudConfig);
    
    // Test connection first
    const isConnected = await api.testConnection();
    if (!isConnected) {
        throw new Error('Failed to connect to SendCloud API');
    }

    // Get available carriers (for debugging)
    await api.getCarriers();

    // Prepare the shipping price request
    const request: ShippingPriceRequest = {
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

    try {
        const response = await api.getShippingPrices(request);
        return response.shipping_methods || [];
    } catch (error) {
        console.error('Failed to get shipping rates:', error);
        throw error;
    }
}

// Debug helper function - this will generate the exact request you can share with SendCloud support
export function generateDebugInfo(
    senderData: any,
    recipientData: any,
    parcelData: any,
    sendCloudConfig: SendCloudConfig
): string {
    
    const request: ShippingPriceRequest = {
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

    return `
=== SENDCLOUD API DEBUG INFORMATION ===
This is the exact information to share with SendCloud support:

API Endpoint: POST https://panel.sendcloud.sc/api/v2/shipping-price

Headers:
Authorization: Basic ${btoa(`${sendCloudConfig.publicKey}:${sendCloudConfig.secretKey}`)}
Content-Type: application/json
User-Agent: VCANSHIP/1.0

Request Body:
${JSON.stringify(request, null, 2)}

Account Details:
- Public Key: ${sendCloudConfig.publicKey}
- Using Sendcloud contracts (not direct carrier contracts)
- No pricing grid uploaded (as confirmed by support)

Issue: API returns no shipping methods/prices
Expected: Should return available shipping methods with prices

Please investigate why no prices are returned for this request.
=======================================
    `;
}

export { SendCloudAPI, type SendCloudConfig, type ShippingPriceRequest, type ShippingMethod };