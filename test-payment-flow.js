// Test script to verify payment flow is working
// Run this in browser console to test the parcel -> payment flow

console.log('🧪 Testing VCANSHIP Payment Flow...');

// Test 1: Check if payment page exists
const paymentPage = document.getElementById('page-payment');
console.log('✅ Payment page exists:', !!paymentPage);

// Test 2: Check if switchPage function is available
console.log('✅ switchPage function available:', typeof switchPage !== 'undefined');

// Test 3: Test switching to payment page
if (typeof switchPage !== 'undefined') {
    console.log('🔄 Testing page switch to payment...');
    try {
        switchPage('payment');
        console.log('✅ Successfully switched to payment page');
        
        // Check if payment page is now active
        const isActive = paymentPage && paymentPage.classList.contains('active');
        console.log('✅ Payment page is active:', isActive);
        
        // Switch back to parcel for testing
        setTimeout(() => {
            switchPage('parcel');
            console.log('🔄 Switched back to parcel page');
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error switching to payment page:', error);
    }
} else {
    console.error('❌ switchPage function not found - check if ui.ts is loaded');
}

// Test 4: Check if quote selection buttons exist
const quoteButtons = document.querySelectorAll('.select-quote-btn');
console.log('✅ Quote selection buttons found:', quoteButtons.length);

// Test 5: Check if parcel form data is being collected
if (typeof formData !== 'undefined') {
    console.log('✅ Form data available:', Object.keys(formData).length > 0);
} else {
    console.log('⚠️ Form data not available - may need to fill out parcel form first');
}

// Test 6: Check if multi-API functions are loaded
console.log('✅ Multi-API functions loaded:', {
    getVCANSHIPBestRates: typeof getVCANSHIPBestRates !== 'undefined',
    commissionTracker: typeof commissionTracker !== 'undefined',
    renderEnhancedQuoteCard: typeof renderEnhancedQuoteCard !== 'undefined'
});

// Test 7: Simulate quote selection (if quotes exist)
const testQuoteSelection = () => {
    const firstQuoteButton = document.querySelector('.select-quote-btn');
    if (firstQuoteButton) {
        console.log('🔄 Testing quote selection...');
        
        // Check if button has quote data
        const hasQuoteData = firstQuoteButton.dataset.quote;
        console.log('✅ Quote button has data:', !!hasQuoteData);
        
        if (hasQuoteData) {
            console.log('🎯 Quote data preview:', hasQuoteData.substring(0, 100) + '...');
        }
        
        // Don't actually click to avoid disrupting user flow
        console.log('💡 To test quote selection, click any "Select & Proceed" button');
    } else {
        console.log('⚠️ No quote buttons found - get quotes first by filling out parcel form');
    }
};

testQuoteSelection();

console.log(`
🎯 PAYMENT FLOW TEST SUMMARY:
- Payment page: ${!!paymentPage ? '✅' : '❌'}
- switchPage function: ${typeof switchPage !== 'undefined' ? '✅' : '❌'}
- Quote buttons: ${document.querySelectorAll('.select-quote-btn').length > 0 ? '✅' : '⚠️'}
- Multi-API system: ${typeof getVCANSHIPBestRates !== 'undefined' ? '✅' : '⚠️'}

💡 TROUBLESHOOTING STEPS:
1. Make sure you've filled out the parcel form completely
2. Click "Get Quotes" to see available shipping options
3. Click "Select & Proceed" on any quote to test payment flow
4. Check browser console for any JavaScript errors

🚀 If payment flow isn't working:
1. Run the deployment script: deploy-multi-api-system.bat
2. Clear browser cache and reload
3. Check that all new files are loaded in Network tab
`);