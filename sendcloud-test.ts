// SendCloud API Test & Debug Tool
// Use this to generate the exact API request details for SendCloud support

import { 
    SendCloudAPI, 
    createSendCloudTestRequest, 
    generateDebugInfo,
    getVCANSHIPShippingRates,
    type SendCloudConfig 
} from './sendcloud-api.js';

// IMPORTANT: Replace these with your actual SendCloud credentials
const SENDCLOUD_CONFIG: SendCloudConfig = {
    publicKey: 'YOUR_SENDCLOUD_PUBLIC_KEY', // Replace with your actual public key
    secretKey: 'YOUR_SENDCLOUD_SECRET_KEY', // Replace with your actual secret key
    baseUrl: 'https://panel.sendcloud.sc/api/v2'
};

// Test data that matches your VCANSHIP form structure
const TEST_SENDER = {
    name: 'VCANSHIP Test Sender',
    address: '123 Business Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    country: 'GB', // UK - 2-letter ISO code
    phone: '+44 20 1234 5678',
    email: 'sender@vcanship.com'
};

const TEST_RECIPIENT = {
    name: 'Test Recipient',
    address: '456 Delivery Avenue',
    city: 'Manchester',
    postcode: 'M1 1AA',
    country: 'GB', // UK - 2-letter ISO code
    phone: '+44 161 123 4567',
    email: 'recipient@example.com'
};

const TEST_PARCEL = {
    weight: '2.5',      // 2.5 kg
    length: '30',       // 30 cm
    width: '20',        // 20 cm
    height: '15',       // 15 cm
    value: '100',       // £100
    description: 'Electronics'
};

/**
 * Main test function - run this to debug your SendCloud integration
 */
export async function testSendCloudIntegration() {
    console.log('🚀 Starting SendCloud API Integration Test...\n');

    try {
        // Step 1: Test basic connection
        console.log('📡 Testing SendCloud API connection...');
        const api = new SendCloudAPI(SENDCLOUD_CONFIG);
        const isConnected = await api.testConnection();
        
        if (!isConnected) {
            console.error('❌ Failed to connect to SendCloud API');
            console.log('Please check your API credentials and try again.');
            return;
        }
        
        console.log('✅ Successfully connected to SendCloud API\n');

        // Step 2: Get available carriers
        console.log('📦 Fetching available carriers...');
        await api.getCarriers();
        console.log('');

        // Step 3: Test shipping price request
        console.log('💰 Testing shipping price request...');
        const shippingMethods = await getVCANSHIPShippingRates(
            TEST_SENDER,
            TEST_RECIPIENT,
            TEST_PARCEL,
            SENDCLOUD_CONFIG
        );

        if (shippingMethods.length === 0) {
            console.log('⚠️  NO SHIPPING METHODS RETURNED - This is the issue!');
            console.log('');
            
            // Generate debug info for SendCloud support
            const debugInfo = generateDebugInfo(
                TEST_SENDER,
                TEST_RECIPIENT,
                TEST_PARCEL,
                SENDCLOUD_CONFIG
            );
            
            console.log('📋 DEBUG INFO FOR SENDCLOUD SUPPORT:');
            console.log(debugInfo);
            
        } else {
            console.log(`✅ Found ${shippingMethods.length} shipping methods:`);
            shippingMethods.forEach((method, index) => {
                console.log(`${index + 1}. ${method.name} (${method.carrier}) - ${method.price} ${method.currency}`);
            });
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        
        // Still generate debug info even if there's an error
        console.log('\n📋 DEBUG INFO FOR SENDCLOUD SUPPORT:');
        const debugInfo = generateDebugInfo(
            TEST_SENDER,
            TEST_RECIPIENT,
            TEST_PARCEL,
            SENDCLOUD_CONFIG
        );
        console.log(debugInfo);
    }
}

/**
 * Generate debug information specifically for SendCloud support ticket
 */
export function generateSendCloudSupportInfo(): string {
    const debugInfo = generateDebugInfo(
        TEST_SENDER,
        TEST_RECIPIENT,
        TEST_PARCEL,
        SENDCLOUD_CONFIG
    );

    return `
Dear SendCloud Support,

I am experiencing an issue with the /shipping-price API endpoint returning no prices.
As requested, here are the details:

${debugInfo}

CARRIER INFORMATION:
- I am NOT using direct carrier contracts
- I am using SendCloud's contracts (as confirmed by your support team)
- No pricing grid has been uploaded (as advised by your team)
- I need to know which specific carriers are available for my account

EXPECTED BEHAVIOR:
The API should return available shipping methods with prices for the UK domestic route shown above.

ACTUAL BEHAVIOR:
The API returns an empty shipping_methods array or no prices.

Please investigate why no shipping methods are being returned for this request.

Best regards,
Vijindran Subramaniam
VCANSHIP Platform
    `;
}

/**
 * Quick test function you can call from browser console
 */
export function quickTest() {
    console.log('🔧 Quick SendCloud Test');
    console.log('Copy this information and send it to SendCloud support:');
    console.log(generateSendCloudSupportInfo());
}

// Auto-run test if this file is executed directly
if (typeof window !== 'undefined') {
    // Browser environment - add to global scope for easy testing
    (window as any).testSendCloud = testSendCloudIntegration;
    (window as any).sendCloudDebug = generateSendCloudSupportInfo;
    (window as any).quickSendCloudTest = quickTest;
    
    console.log('🔧 SendCloud test functions available:');
    console.log('- testSendCloud() - Run full integration test');
    console.log('- sendCloudDebug() - Generate debug info for support');
    console.log('- quickSendCloudTest() - Quick debug info');
}