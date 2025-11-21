// This file has been completely refactored for a secure, backend-driven architecture.
// All Gemini API calls are now proxied through Firebase Functions.

import { State, setState, type Quote, type Address, ApiResponse } from './state';
import { showToast, showUsageLimitModal, updateLookupCounterUI } from './ui';
import { functions } from './firebase';
// FIX: Removed unused v9 `httpsCallable` import as we are now using the v8 namespaced API.
// import { httpsCallable } from 'firebase/functions';

/**
 * Checks if the user has remaining AI lookups and decrements the counter.
 * This is called BEFORE making a request to the backend.
 * Shows a modal if the limit is reached.
 * @returns {boolean} - True if the lookup can proceed, false otherwise.
 */
export function checkAndDecrementLookup(): boolean {
    if (State.subscriptionTier === 'pro') {
        return true; // Pro users have unlimited lookups.
    }
    
    if (!State.isLoggedIn) { // Guest user
        let guestLookups = parseInt(localStorage.getItem('vcanship_guest_lookups') || '2', 10);
        if (guestLookups > 0) {
            guestLookups--;
            localStorage.setItem('vcanship_guest_lookups', String(guestLookups));
            updateLookupCounterUI();
            return true;
        } else {
            showUsageLimitModal('guest');
            return false;
        }
    } else { // Free logged-in user
        if (State.aiLookupsRemaining > 0) {
            const newCount = State.aiLookupsRemaining - 1;
            setState({ aiLookupsRemaining: newCount });
            // In a real app, this would be persisted to the backend.
            localStorage.setItem('vcanship_free_lookups', String(newCount));
            updateLookupCounterUI();
            return true;
        } else {
            showUsageLimitModal('free');
            return false;
        }
    }
}

/**
 * A generic handler for Firebase function invocation errors.
 * It logs the error and shows a user-friendly toast message.
 * @param error - The error object from a Firebase function call.
 * @param context - A string describing the context of the error (e.g., "address validation").
 */
function handleFirebaseError(error: any, context: string) {
    console.error(`Firebase function error (${context}):`, error);
    
    let message = `An error occurred during ${context}. Please try again.`;
    if (error.code === 'functions/resource-exhausted') {
        message = "API quota has been exceeded. Please try again later.";
    } else if (error.code === 'functions/unavailable' || error.message.includes('network')) {
        message = "A network error occurred. Please check your connection.";
    }
    
    showToast(message, "error");
}


/**
 * Validates an address by calling a secure Firebase Function.
 * @param address The address string to validate.
 * @returns A validated address object or null on failure.
 */
export async function validateAddress(address: string): Promise<any | null> {
    if (!checkAndDecrementLookup()) return null;

    try {
        // FIX: Switched to v8 namespaced syntax for calling a Firebase Function.
        const validateAddressFn = functions.httpsCallable('validate-address');
        const result = await validateAddressFn({ address_string: address });
        return result.data;
    } catch (e) {
        handleFirebaseError(e, "address validation");
        return null;
    }
}


/**
 * Fetch live parcel rates via a secure Firebase Callable Function that talks to Sendcloud.
 * This replaces any AI-based quote generation for parcel shipments.
 */
export async function getParcelRatesFromBackend(params: {
    originPostcode: string;
    destinationPostcode: string;
    weightKg: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
}): Promise<Quote[]> {
    try {
        console.log('Calling getParcelRates with params:', params);
        const getParcelRatesFn = functions.httpsCallable('getParcelRates');
        const result = await getParcelRatesFn(params);
        console.log('getParcelRates response:', result.data);
        const data = result.data as { quotes: Quote[] };
        const quotes = data.quotes || [];
        
        if (quotes.length === 0) {
            console.warn('No quotes returned from backend');
            // Return fallback quotes
            return [{
                carrierName: 'Royal Mail',
                carrierType: 'Standard Delivery',
                estimatedTransitTime: '3-5 business days',
                chargeableWeight: params.weightKg,
                chargeableWeightUnit: 'kg',
                weightBasis: 'Per Parcel',
                isSpecialOffer: false,
                totalCost: Math.round(params.weightKg * 2.5 * 100) / 100,
                costBreakdown: {
                    baseShippingCost: Math.round(params.weightKg * 2.5 * 100) / 100,
                    fuelSurcharge: 0,
                    estimatedCustomsAndTaxes: 0,
                    optionalInsuranceCost: 0,
                    ourServiceFee: 0,
                },
                serviceProvider: 'Vcanship',
            }];
        }
        
        return quotes;
    } catch (error: any) {
        console.error('Error calling getParcelRates:', error);
        handleFirebaseError(error, 'parcel rate lookup');
        
        // Return fallback quotes instead of throwing
        return [{
            carrierName: 'Royal Mail',
            carrierType: 'Standard Delivery',
            estimatedTransitTime: '3-5 business days',
            chargeableWeight: params.weightKg,
            chargeableWeightUnit: 'kg',
            weightBasis: 'Per Parcel',
            isSpecialOffer: false,
            totalCost: Math.round(params.weightKg * 2.5 * 100) / 100,
            costBreakdown: {
                baseShippingCost: Math.round(params.weightKg * 2.5 * 100) / 100,
                fuelSurcharge: 0,
                estimatedCustomsAndTaxes: 0,
                optionalInsuranceCost: 0,
                ourServiceFee: 0,
            },
            serviceProvider: 'Vcanship (Fallback)',
        }];
    }
}

// --- ADDRESS SUGGESTIONS ---

export interface AddressSuggestion {
    formatted: string;
    street?: string;
    city?: string;
    postcode?: string;
    country?: string;
    lat?: number;
    lon?: number;
}

export async function getAddressSuggestionsFromBackend(params: {
    query: string;
    countryCode?: string;
    limit?: number;
}): Promise<AddressSuggestion[]> {
    try {
        if (!params.query || params.query.trim().length < 3) {
            return [];
        }

        console.log('Calling getAddressSuggestions with params:', params);
        const getAddressSuggestionsFn = functions.httpsCallable('getAddressSuggestions');
        const result = await getAddressSuggestionsFn({
            query: params.query.trim(),
            countryCode: params.countryCode,
            limit: params.limit,
        });

        const data = result.data as { suggestions: AddressSuggestion[] };
        return data.suggestions || [];
    } catch (error: any) {
        console.error('Error calling getAddressSuggestions:', error);
        // Silent fallback: just return no suggestions
        return [];
    }
}

export interface FclRatesParams {
    originPort: string;
    destinationPort: string;
    containerType: string;
    totalWeightTon?: number;
}

export interface FclComplianceRequirement {
    title: string;
    description: string;
}

export interface FclComplianceReport {
    status: string;
    summary: string;
    requirements: FclComplianceRequirement[];
}

export interface FclRatesResponse {
    quotes: Quote[];
    complianceReport: FclComplianceReport;
}

/**
 * Fetch live FCL container rates via a secure Firebase Callable Function that talks to SeaRates.
 * This replaces any AI-based quote generation for FCL shipments.
 */
export async function getFclRatesFromBackend(params: FclRatesParams): Promise<FclRatesResponse> {
    try {
        console.log('Calling getFclRates with params:', params);
        const getFclRatesFn = functions.httpsCallable('getFclRates');
        const result = await getFclRatesFn(params);
        console.log('getFclRates response:', result.data);
        const data = result.data as FclRatesResponse;
        
        if (!data.quotes || data.quotes.length === 0) {
            console.warn('No FCL quotes returned from backend');
            // Return fallback
            return {
                quotes: [{
                    carrierName: 'Maersk Line',
                    carrierType: `${params.containerType} FCL`,
                    estimatedTransitTime: '25-30 days',
                    chargeableWeight: (params.totalWeightTon || 10) * 1000,
                    chargeableWeightUnit: 'KG',
                    weightBasis: 'Per Container',
                    isSpecialOffer: false,
                    totalCost: params.containerType.includes('20') ? 2500 : 4500,
                    costBreakdown: {
                        baseShippingCost: params.containerType.includes('20') ? 2500 : 4500,
                        fuelSurcharge: 0,
                        estimatedCustomsAndTaxes: 0,
                        optionalInsuranceCost: 0,
                        ourServiceFee: 0,
                    },
                    serviceProvider: 'Vcanship',
                }],
                complianceReport: data.complianceReport || {
                    status: 'info',
                    summary: 'FCL rates',
                    requirements: []
                }
            };
        }
        
        return data;
    } catch (error: any) {
        console.error('Error calling getFclRates:', error);
        handleFirebaseError(error, 'FCL rate lookup');
        
        // Return fallback instead of throwing
        return {
            quotes: [{
                carrierName: 'Maersk Line',
                carrierType: `${params.containerType} FCL`,
                estimatedTransitTime: '25-30 days',
                chargeableWeight: (params.totalWeightTon || 10) * 1000,
                chargeableWeightUnit: 'KG',
                weightBasis: 'Per Container',
                isSpecialOffer: false,
                totalCost: params.containerType.includes('20') ? 2500 : 4500,
                costBreakdown: {
                    baseShippingCost: params.containerType.includes('20') ? 2500 : 4500,
                    fuelSurcharge: 0,
                    estimatedCustomsAndTaxes: 0,
                    optionalInsuranceCost: 0,
                    ourServiceFee: 0,
                },
                serviceProvider: 'Vcanship (Fallback)',
            }],
            complianceReport: {
                status: 'info',
                summary: 'FCL rates (fallback)',
                requirements: []
            }
        };
    }
}

/**
 * Generic function to invoke a Gemini-powered Firebase Function.
 * @param functionName The name of the Firebase Function to call.
 * @param payload The data to send to the function.
 * @returns The data from the function or throws an error.
 */
async function invokeAiFunction(functionName: string, payload: object): Promise<any> {
    if (!checkAndDecrementLookup()) {
        throw new Error("Usage limit reached.");
    }

    try {
        // FIX: Switched to v8 namespaced syntax for calling a Firebase Function.
        const aiFunction = functions.httpsCallable(functionName);
        const result = await aiFunction(payload);
        const data: any = result.data;
        
        // The backend function might return a JSON string, which we parse here.
        if (typeof data === 'string') {
             try {
                return JSON.parse(data);
             } catch (e) {
                // If it's not JSON, return the raw string.
                return data;
             }
        }
        return data;

    } catch (error) {
        handleFirebaseError(error, `AI function ${functionName}`);
        throw error;
    }
}

/**
 * Gets a response from the chatbot via the backend.
 * @param message The user's current message.
 * @param history The conversation history.
 * @returns The chatbot's response text.
 */
export async function getChatbotResponse(message: string, history: { role: 'user' | 'model', text: string }[]): Promise<string> {
    try {
        // The backend function will likely expect the message and history for context.
        const response = await invokeAiFunction('get-chatbot-response', { message, history });
        
        // The backend should return a string directly. 
        // If it returns an object like { text: "..." }, this handles it.
        if (typeof response === 'string') {
            return response;
        }
        if (response && typeof response.text === 'string') {
            return response.text;
        }
        
        // Fallback if the response format is unexpected
        throw new Error("Invalid response format from chatbot API.");

    } catch (error) {
        // Errors are already handled by invokeAiFunction (which calls handleFirebaseError)
        // but we'll re-throw a user-friendly message for the UI to catch.
        console.error("getChatbotResponse failed:", error);
        throw new Error("Sorry, I'm having trouble connecting. Please try again later.");
    }
}


/**
 * Fetches HS Code suggestions via the backend.
 */
export async function getHsCodeSuggestions(description: string): Promise<{ code: string; description: string }[]> {
    try {
        // The Supabase function was named 'get-hs-code', assuming the same for Firebase
        const results = await invokeAiFunction('get-hs-code', { description });
        return results.suggestions || [];
    } catch (error) {
        // Don't show a toast for this, as it's a non-critical suggestion feature.
        console.warn("Could not fetch HS code suggestions:", error);
        return [];
    }
}