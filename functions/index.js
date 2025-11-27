// Firebase Cloud Functions entry point
// Implements:
//  - getParcelRates: calls Sendcloud for parcel quotes
//  - getFclRates: calls SeaRates for FCL quotes

const functions = require('firebase-functions');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Version: 1.0.3 - Fixed FCL mock rates and syntax

// --- INITIALIZE SERVICES ---
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();


// Get API keys from Firebase config OR environment variables (via dotenv)
const SENDCLOUD_PUBLIC_KEY = functions.config().sendcloud?.public_key || process.env.SENDCLOUD_PUBLIC_KEY;
const SENDCLOUD_SECRET_KEY = functions.config().sendcloud?.secret_key || process.env.SENDCLOUD_SECRET_KEY;
const SEARATES_API_KEY = functions.config().searates?.api_key || process.env.SEARATES_API_KEY;
const GEOAPIFY_KEY = (functions.config().geoapify && functions.config().geoapify.key) || process.env.GEOAPIFY_KEY;
const GEMINI_API_KEY = functions.config().gemini?.api_key || process.env.GEMINI_API_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || "mock-key");

/**
 * Checks if a user is authenticated. Throws an HttpsError if not.
 * @param {object} context - The context object from the callable function.
 */
const ensureAuthenticated = (context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to perform this action.'
    );
  }
};


// --- ADDRESS BOOK FUNCTIONS ---

/**
 * Gets the current user's saved addresses from Firestore.
 */
exports.getAddresses = functions.https.onCall(async (data, context) => {
  ensureAuthenticated(context);
  const userId = context.auth.uid;

  try {
    const snapshot = await db.collection('users').doc(userId).collection('addresses').orderBy('label').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting addresses:', error);
    throw new functions.https.HttpsError('internal', 'Could not retrieve addresses.');
  }
});

/**
 * Adds a new address to the user's Firestore collection.
 * Expected input: { address: object }
 */
exports.addAddress = functions.https.onCall(async (data, context) => {
  ensureAuthenticated(context);
  const userId = context.auth.uid;
  const { address } = data;

  // Basic validation
  if (!address || !address.label || !address.street || !address.city || !address.country) {
    throw new functions.https.HttpsError('invalid-argument', 'The address object is missing required fields.');
  }

  try {
    const docRef = await db.collection('users').doc(userId).collection('addresses').add(address);
    return { id: docRef.id, ...address };
  } catch (error) {
    console.error('Error adding address:', error);
    throw new functions.https.HttpsError('internal', 'Could not save the new address.');
  }
});

/**
 * Updates an existing address in the user's Firestore collection.
 * Expected input: { addressId: string, address: object }
 */
exports.updateAddress = functions.https.onCall(async (data, context) => {
  ensureAuthenticated(context);
  const userId = context.auth.uid;
  const { addressId, address } = data;

  if (!addressId || !address) {
    throw new functions.https.HttpsError('invalid-argument', 'addressId and address object are required.');
  }

  try {
    const docRef = db.collection('users').doc(userId).collection('addresses').doc(addressId);
    await docRef.update(address);
    return { id: addressId, ...address };
  } catch (error) {
    console.error('Error updating address:', error);
    throw new functions.https.HttpsError('internal', 'Could not update the address.');
  }
});

/**
 * Deletes an address from the user's Firestore collection.
 * Expected input: { addressId: string }
 */
exports.deleteAddress = functions.https.onCall(async (data, context) => {
  ensureAuthenticated(context);
  const userId = context.auth.uid;
  const { addressId } = data;

  if (!addressId) {
    throw new functions.https.HttpsError('invalid-argument', 'The addressId is required.');
  }

  try {
    await db.collection('users').doc(userId).collection('addresses').doc(addressId).delete();
    return { id: addressId }; // Return the ID of the deleted address
  } catch (error) {
    console.error('Error deleting address:', error);
    throw new functions.https.HttpsError('internal', 'Could not delete the address.');
  }
});


/**
 * Normalises errors into HttpsError for the client.
 */
function asHttpsError(error, defaultMessage) {
  const message =
    (error && error.message) ||
    (error && error.response && error.response.data && JSON.stringify(error.response.data)) ||
    defaultMessage;
  console.error(defaultMessage, error);
  return new functions.https.HttpsError('internal', message);
}

/**
 * Callable function to get address suggestions from Geoapify.
 *
 * Expected input:
 * {
 *   query: string;        // Free text (postcode, street, city, etc.)
 *   countryCode?: string; // Optional ISO 2-letter country code, e.g. "GB", "US"
 *   limit?: number;       // Optional max suggestions (default 5)
 * }
 *
 * Returns:
 * {
 *   suggestions: {
 *     formatted: string;
 *     street?: string;
 *     city?: string;
 *     postcode?: string;
 *     country?: string;
 *     lat?: number;
 *     lon?: number;
 *   }[]
 * }
 */
exports.getAddressSuggestions = functions.https.onCall(async (data, context) => {
  const { query, countryCode, limit } = data || {};

  if (!query || typeof query !== 'string' || query.trim().length < 3) {
    return { suggestions: [] };
  }

  if (!GEOAPIFY_KEY) {
    console.error('GEOAPIFY_KEY is missing');
    return { suggestions: [] };
  }

  try {
    const params = {
      text: query.trim(),
      apiKey: GEOAPIFY_KEY,
      limit: typeof limit === 'number' && limit > 0 && limit <= 10 ? limit : 5,
    };

    if (countryCode && typeof countryCode === 'string' && countryCode.trim().length === 2) {
      params.filter = `countrycode:${countryCode.trim().toLowerCase()}`;
    }

    const response = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
      params,
      timeout: 10000,
    });

    const features = (response.data && response.data.features) || [];

    const suggestions = features.map((f) => {
      const p = f.properties || {};
      return {
        formatted: p.formatted || p.address_line1 || '',
        street: p.street || p.address_line1 || '',
        city: p.city || p.town || p.village || '',
        postcode: p.postcode || '',
        country: p.country || '',
        lat: typeof p.lat === 'number' ? p.lat : undefined,
        lon: typeof p.lon === 'number' ? p.lon : undefined,
      };
    });

    return { suggestions };
  } catch (error) {
    console.error('Geoapify error:', error.message);
    return { suggestions: [] };
  }
});

/**
 * Callable function to get live parcel rates from Shippo.
 * Shippo aggregates rates from multiple carriers (USPS, UPS, FedEx, DHL, etc.)
 *
 * Expected input:
 * {
 *   originPostcode: string,
 *   destinationPostcode: string,
 *   weightKg: number,
 *   lengthCm?: number,
 *   widthCm?: number,
 *   heightCm?: number,
 *   originCountry?: string,
 *   destinationCountry?: string
 * }
 *
 * Returns:
 * { quotes: Quote[] } where Quote matches the frontend `Quote` type.
 */
exports.getParcelRates = functions.https.onCall(async (data, context) => {
  console.log('getParcelRates called with data:', JSON.stringify(data));

  const SHIPPO_API_KEY = functions.config().shippo?.api_key || process.env.SHIPPO_API_KEY;

  console.log('Checking Shippo API Key:', {
    configured: !!SHIPPO_API_KEY,
    keyPreview: SHIPPO_API_KEY ? SHIPPO_API_KEY.substring(0, 15) + '...' : 'MISSING'
  });

  const { originPostcode, destinationPostcode, weightKg, lengthCm, widthCm, heightCm, originCountry, destinationCountry } = data || {};

  // Strict validation
  if (!originPostcode || typeof originPostcode !== 'string' || originPostcode.trim().length === 0) {
    console.error('Invalid originPostcode:', originPostcode);
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid originPostcode: ${originPostcode}. Must be a non-empty string.`
    );
  }

  if (!destinationPostcode || typeof destinationPostcode !== 'string' || destinationPostcode.trim().length === 0) {
    console.error('Invalid destinationPostcode:', destinationPostcode);
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid destinationPostcode: ${destinationPostcode}. Must be a non-empty string.`
    );
  }

  if (!weightKg || typeof weightKg !== 'number' || isNaN(weightKg) || weightKg <= 0 || weightKg > 1000) {
    console.error('Invalid weightKg:', weightKg);
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid weightKg: ${weightKg}. Must be a number between 0.1 and 1000.`
    );
  }

  if (!SHIPPO_API_KEY) {
    console.warn('Shippo API key not configured');
    throw new functions.https.HttpsError('failed-precondition', 'Shippo API key not configured.');
  }

  try {
    console.log('Calling Shippo API with params:', {
      originPostcode,
      destinationPostcode,
      weightKg,
      lengthCm,
      widthCm,
      heightCm,
      originCountry,
      destinationCountry
    });

    // Helper to extract country code
    const getCountryCode = (postcode, country) => {
      if (country && country.length === 2) {
        return country.toUpperCase();
      }
      // Try to determine from postcode pattern
      const trimmed = postcode.trim().toUpperCase();
      if (/^[A-Z]{1,2}\d/.test(trimmed)) return 'GB'; // UK
      if (/^\d{5}(-\d{4})?$/.test(trimmed)) return 'US'; // US
      if (/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/.test(trimmed)) return 'CA'; // Canada
      return 'GB'; // Default
    };

    const fromCountry = getCountryCode(originPostcode, originCountry);
    const toCountry = getCountryCode(destinationPostcode, destinationCountry);

    console.log('Extracted countries:', { fromCountry, toCountry });

    // Prepare Shippo shipment request
    const shipmentData = {
      address_from: {
        zip: originPostcode.trim(),
        country: fromCountry
      },
      address_to: {
        zip: destinationPostcode.trim(),
        country: toCountry
      },
      parcels: [{
        length: lengthCm ? (lengthCm / 2.54).toFixed(2) : '12', // Convert cm to inches
        width: widthCm ? (widthCm / 2.54).toFixed(2) : '12',
        height: heightCm ? (heightCm / 2.54).toFixed(2) : '6',
        distance_unit: 'in',
        weight: (weightKg * 2.20462).toFixed(2), // Convert kg to lbs
        mass_unit: 'lb'
      }],
      async: false // Get rates synchronously
    };

    console.log('Shippo request data:', JSON.stringify(shipmentData));

    // Call Shippo API
    const response = await axios.post('https://api.goshippo.com/shipments/', shipmentData, {
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });

    console.log('Shippo API response status:', response.status);
    const rates = response.data?.rates || [];
    console.log(`Received ${rates.length} rates from Shippo`);

    if (rates.length === 0) {
      console.warn('No rates returned from Shippo');
      return { quotes: [] };
    }

    // Transform Shippo rates into frontend Quote format
    const quotes = rates
      .filter(rate => rate.amount && parseFloat(rate.amount) > 0)
      .map(rate => {
        const price = parseFloat(rate.amount) || 0;
        const carrierName = rate.provider || 'Unknown Carrier';
        const serviceName = rate.servicelevel?.name || rate.servicelevel_name || 'Standard Service';
        const transitTime = rate.estimated_days ? `${rate.estimated_days} days` : rate.duration_terms || 'N/A';

        return {
          carrierName: carrierName.toUpperCase(),
          carrierType: serviceName,
          estimatedTransitTime: transitTime,
          chargeableWeight: weightKg,
          chargeableWeightUnit: 'kg',
          weightBasis: 'Per Parcel',
          isSpecialOffer: false,
          totalCost: price,
          costBreakdown: {
            baseShippingCost: price,
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'Shippo',
          shippoRateId: rate.object_id // Store for booking later
        };
      });

    console.log(`Returning ${quotes.length} live quotes from Shippo`);
    return { quotes };

  } catch (error) {
    console.error('Shippo API error:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: JSON.stringify(error.response?.data),
      config: error.config?.url
    });

    if (error.response?.status === 401) {
      console.error('Shippo API authentication failed. Please check your API key.');
      throw new functions.https.HttpsError('unauthenticated', 'Shippo API authentication failed. Please check your API key.');
    }

    throw new functions.https.HttpsError('internal', `Shippo API error: ${error.message}`);
  }
});

/**
 * Callable function to get live FCL rates from SeaRates.
 *
 * Expected input:
 * {
 *   originPort: string,        // e.g. "CNSHA"
 *   destinationPort: string,   // e.g. "USLAX"
 *   containerType: string,     // e.g. "20GP", "40HC"
 *   totalWeightTon?: number
 * }
 *
 * Returns:
 * {
 *   quotes: Quote[],
 *   complianceReport: {
 *     status: string,
 *     summary: string,
 *     requirements: { title: string, description: string }[]
 *   }
 * }
 */
exports.getFclRates = functions.https.onCall(async (data, context) => {
  const { originPort, destinationPort, containerType, totalWeightTon } = data || {};

  if (!originPort || !destinationPort || !containerType) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'originPort, destinationPort and containerType are required.'
    );
  }

  const PLATFORM_ID = functions.config().searates?.platform_id || process.env.SEARATES_PLATFORM_ID || '29979';

  console.log('getFclRates called with:', { originPort, destinationPort, containerType, totalWeightTon });
  console.log('SeaRates config:', {
    hasApiKey: !!SEARATES_API_KEY,
    platformId: PLATFORM_ID,
    keyPreview: SEARATES_API_KEY ? SEARATES_API_KEY.substring(0, 6) + '...' : 'MISSING'
  });

  // Try multiple SeaRates API endpoints
  if (SEARATES_API_KEY && SEARATES_API_KEY.length > 10) {

    // Attempt 1: GraphQL endpoint
    try {
      console.log('Attempting SeaRates GraphQL API...');
      const graphqlResponse = await axios.post(
        'https://www.searates.com/graphql_rates',
        {
          query: `
            query {
              landFCLRates(
                origin: "${originPort}"
                destination: "${destinationPort}"
                containerType: "${containerType}"
              ) {
                carrier
                price
                transitDays
                currency
              }
            }
          `
        },
        {
          headers: {
            'Authorization': `Bearer ${SEARATES_API_KEY}`,
            'Content-Type': 'application/json',
            'X-Platform-ID': PLATFORM_ID
          },
          timeout: 15000
        }
      );

      const graphqlRates = graphqlResponse.data?.data?.landFCLRates || [];
      if (graphqlRates.length > 0) {
        console.log(`SeaRates GraphQL returned ${graphqlRates.length} rates`);
        const quotes = graphqlRates.map(r => ({
          carrierName: r.carrier || 'Unknown Carrier',
          carrierType: `${containerType} FCL`,
          estimatedTransitTime: r.transitDays ? `${r.transitDays} days` : 'N/A',
          chargeableWeight: (totalWeightTon || 10) * 1000,
          chargeableWeightUnit: 'KG',
          weightBasis: 'Per Container',
          isSpecialOffer: false,
          totalCost: r.price || 0,
          costBreakdown: {
            baseShippingCost: r.price || 0,
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'SeaRates',
        }));

        return {
          quotes,
          complianceReport: generateFclComplianceReport()
        };
      }
    } catch (graphqlError) {
      console.log('SeaRates GraphQL failed:', graphqlError.message);
    }

    // Attempt 2: Original REST endpoint
    try {
      console.log('Attempting SeaRates REST API...');
      const restResponse = await axios.post(
        'https://api.searates.com/fcl/rates',
        {
          origin: originPort,
          destination: destinationPort,
          container_type: containerType,
          weight: totalWeightTon || 1,
        },
        {
          headers: {
            'Authorization': `Bearer ${SEARATES_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const restRates = restResponse.data?.rates || restResponse.data || [];
      if (restRates.length > 0) {
        console.log(`SeaRates REST returned ${restRates.length} rates`);
        const quotes = restRates.map((r) => ({
          carrierName: r.carrier || r.line || 'Unknown Carrier',
          carrierType: `${containerType} FCL`,
          estimatedTransitTime: r.transit_time ? `${r.transit_time} days` : 'N/A',
          chargeableWeight: (totalWeightTon || 10) * 1000,
          chargeableWeightUnit: 'KG',
          weightBasis: 'Per Container',
          isSpecialOffer: false,
          totalCost: Number(r.total || r.price || 0),
          costBreakdown: {
            baseShippingCost: Number(r.total || r.price || 0),
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'SeaRates',
        }));

        return {
          quotes,
          complianceReport: generateFclComplianceReport()
        };
      }
    } catch (restError) {
      console.log('SeaRates REST failed:', restError.message);
    }
  }

  // Fallback: Enhanced realistic mock data
  console.log('Returning enhanced mock FCL rates');
  return generateEnhancedFclMockRates(originPort, destinationPort, containerType, totalWeightTon);
});

// Helper function to generate compliance report
function generateFclComplianceReport() {
  return {
    status: 'info',
    summary: 'FCL container shipping requires proper documentation. Please prepare the following documents for customs clearance.',
    requirements: [
      {
        title: 'Commercial Invoice',
        description: 'Detailed invoice including shipper and consignee details, incoterms, and HS codes.',
      },
      {
        title: 'Packing List',
        description: 'List of all items in the shipment including number of packages, weights, and dimensions.',
      },
      {
        title: 'Bill of Lading Instructions',
        description: 'Full shipper/consignee and notify party details plus cargo description for the carrier B/L.',
      },
      {
        title: 'Certificate of Origin',
        description: 'Document certifying the country where goods were manufactured (may be required for certain routes).',
      },
    ],
  };
}

// Helper function to generate enhanced mock rates
function generateEnhancedFclMockRates(originPort, destinationPort, containerType, totalWeightTon) {
  // Base prices by container type (Lowered to be more realistic for fallback)
  const basePrices = {
    '20GP': 1200,
    '20ST': 1200,
    '40GP': 2100,
    '40HC': 2400,
    '40HQ': 2400,
    '45HC': 2800,
  };

  const basePrice = basePrices[containerType] || basePrices['20GP'];

  // Route multipliers (based on common trade lanes)
  const routeMultiplier = calculateRouteMultiplier(originPort, destinationPort);

  // Generate 3-5 realistic carrier quotes
  const carriers = [
    { name: 'Maersk Line', reliability: 0.92, priceVariance: 1.0 },
    { name: 'MSC', reliability: 0.88, priceVariance: 0.95 },
    { name: 'CMA CGM', reliability: 0.85, priceVariance: 0.98 },
    { name: 'COSCO Shipping', reliability: 0.87, priceVariance: 0.93 },
    { name: 'Hapag-Lloyd', reliability: 0.90, priceVariance: 1.02 },
  ];

  const quotes = carriers.slice(0, 3 + Math.floor(Math.random() * 2)).map((carrier, index) => {
    const finalPrice = Math.round(basePrice * routeMultiplier * carrier.priceVariance);
    const transitDays = calculateTransitDays(originPort, destinationPort);

    return {
      carrierName: carrier.name,
      carrierType: `${containerType} FCL`,
      estimatedTransitTime: `${transitDays}-${transitDays + 5} days`,
      chargeableWeight: (totalWeightTon || 10) * 1000,
      chargeableWeightUnit: 'KG',
      weightBasis: 'Per Container',
      isSpecialOffer: index === 1, // Mark second quote as special offer
      totalCost: finalPrice,
      costBreakdown: {
        baseShippingCost: Math.round(finalPrice * 0.85),
        fuelSurcharge: Math.round(finalPrice * 0.12),
        estimatedCustomsAndTaxes: 0,
        optionalInsuranceCost: 0,
        ourServiceFee: Math.round(finalPrice * 0.03),
      },
      serviceProvider: 'SeaRates (Estimated)',
      reliability: carrier.reliability,
    };
  });

  return {
    quotes,
    complianceReport: {
      ...generateFclComplianceReport(),
      summary: 'These are estimated FCL rates based on current market conditions. Contact us for confirmed quotes with real-time pricing.',
    }
  };
}

// Calculate route multiplier based on origin/destination
function calculateRouteMultiplier(origin, dest) {
  const o = origin.toUpperCase();
  const d = dest.toUpperCase();

  // Major trade lanes
  if ((o.includes('CN') || o.includes('SHA') || o.includes('SHE')) &&
    (d.includes('US') || d.includes('LAX') || d.includes('NYC'))) {
    return 1.1; // Trans-Pacific
  }
  if ((o.includes('CN') || o.includes('SHA')) &&
    (d.includes('EU') || d.includes('RTM') || d.includes('HAM'))) {
    return 1.3; // Asia-Europe
  }
  if ((o.includes('US') || o.includes('LAX')) &&
    (d.includes('EU') || d.includes('GB'))) {
    return 1.2; // Trans-Atlantic
  }
  if ((o.includes('SG') || o.includes('MY')) &&
    (d.includes('IN') || d.includes('PK'))) {
    return 0.8; // Intra-Asia
  }

  return 1.0; // Default
}

// Calculate transit days based on route
function calculateTransitDays(origin, dest) {
  const o = origin.toUpperCase();
  const d = dest.toUpperCase();

  // Trans-Pacific: 18-25 days
  if ((o.includes('CN') || o.includes('SHA')) &&
    (d.includes('US') || d.includes('LAX'))) {
    return 18 + Math.floor(Math.random() * 7);
  }
  // Asia-Europe: 25-35 days
  if ((o.includes('CN') || o.includes('SHA')) &&
    (d.includes('EU') || d.includes('RTM'))) {
    return 25 + Math.floor(Math.random() * 10);
  }
  // Trans-Atlantic: 10-15 days
  if ((o.includes('US')) && (d.includes('EU') || d.includes('GB'))) {
    return 10 + Math.floor(Math.random() * 5);
  }
  // Intra-Asia: 5-12 days
  if ((o.includes('SG') || o.includes('CN')) &&
    (d.includes('IN') || d.includes('MY') || d.includes('TH'))) {
    return 5 + Math.floor(Math.random() * 7);
  }

  return 20 + Math.floor(Math.random() * 10); // Default 20-30 days
}

/**
 * Validates an address using Geoapify.
 * Expected input: { address_string: string }
 */
exports.validateAddress = functions.https.onCall(async (data, context) => {
  const { address_string } = data || {};
  if (!address_string) {
    throw new functions.https.HttpsError('invalid-argument', 'Address string is required');
  }

  if (!GEOAPIFY_KEY) {
    console.warn('Geoapify API key missing for validation');
    return { valid: true, formatted: address_string, details: {} };
  }

  try {
    const response = await axios.get('https://api.geoapify.com/v1/geocode/search', {
      params: {
        text: address_string,
        apiKey: GEOAPIFY_KEY,
        limit: 1
      }
    });

    const feature = response.data.features?.[0];
    if (feature) {
      return {
        valid: true,
        formatted: feature.properties.formatted,
        details: feature.properties
      };
    } else {
      return { valid: false };
    }
  } catch (error) {
    console.error('Address validation error:', error);
    // Fallback to valid to prevent blocking user
    return { valid: true, formatted: address_string };
  }
});

/**
 * Chatbot response using Gemini.
 * Expected input: { message: string, history: Array }
 */
exports.getChatbotResponse = functions.https.onCall(async (data, context) => {
  const { message, history } = data || {};

  if (!GEMINI_API_KEY) {
    return "I'm sorry, I can't connect to my brain right now (API key missing).";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Convert history to Gemini format if needed, or just use the last message
    // For simplicity in this v1, we'll just send the prompt with some context
    const chat = model.startChat({
      history: (history || []).map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini chatbot error:', error);
    return "I'm having trouble thinking right now. Please try again later.";
  }
});

/**
 * HS Code suggestion using Gemini.
 * Expected input: { description: string }
 */
exports.getHsCode = functions.https.onCall(async (data, context) => {
  const { description } = data || {};

  if (!description) {
    throw new functions.https.HttpsError('invalid-argument', 'Description is required');
  }

  if (!GEMINI_API_KEY) {
    return { suggestions: [] };
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Suggest 3 HS codes for the following cargo description. Return ONLY a JSON array of objects with 'code' and 'description' fields. Description: ${description}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return { suggestions };
    }
    return { suggestions: [] };
  } catch (error) {
    console.error('HS Code error:', error);
    return { suggestions: [] };
  }
});

/**
 * Creates a Stripe Payment Intent.
 * Expected input: { amount: number, currency: string, description?: string }
 */
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  const { amount, currency, description } = data || {};

  const STRIPE_SECRET_KEY = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;

  if (!STRIPE_SECRET_KEY) {
    console.warn('Stripe Secret Key missing');
    throw new functions.https.HttpsError('failed-precondition', 'Stripe not configured on server.');
  }

  const stripe = require('stripe')(STRIPE_SECRET_KEY);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      description,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    console.error('Stripe error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});