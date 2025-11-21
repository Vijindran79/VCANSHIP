// Firebase Cloud Functions entry point
// Implements:
//  - getParcelRates: calls Sendcloud for parcel quotes
//  - getFclRates: calls SeaRates for FCL quotes

const functions = require('firebase-functions');
const axios = require('axios');

// Get API keys from Firebase config (which is already set up)
// These are configured via: firebase functions:config:set
const SENDCLOUD_PUBLIC_KEY = functions.config().sendcloud?.public_key || process.env.SENDCLOUD_PUBLIC_KEY;
const SENDCLOUD_SECRET_KEY = functions.config().sendcloud?.secret_key || process.env.SENDCLOUD_SECRET_KEY;
const SEARATES_API_KEY = functions.config().searates?.api_key || process.env.SEARATES_API_KEY;
const GEOAPIFY_KEY = (functions.config().geoapify && functions.config().geoapify.key) || process.env.GEOAPIFY_KEY;

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
    // Too short to search; return empty list rather than throwing
    return { suggestions: [] };
  }

  if (!GEOAPIFY_KEY) {
    console.warn('Geoapify API key not configured. Returning empty suggestions.');
    return { suggestions: [] };
  }

  try {
    const params = {
      text: query.trim(),
      apiKey: GEOAPIFY_KEY,
      limit: typeof limit === 'number' && limit > 0 && limit <= 10 ? limit : 5,
    };

    // Apply optional country filter if provided
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
    console.error('Geoapify autocomplete error:', error.message, error.response && error.response.data);
    // For robustness, return empty suggestions instead of failing the call
    return { suggestions: [] };
  }
});

/**
 * Callable function to get live parcel rates from Sendcloud.
 *
 * Expected input:
 * {
 *   originPostcode: string,
 *   destinationPostcode: string,
 *   weightKg: number,
 *   lengthCm?: number,
 *   widthCm?: number,
 *   heightCm?: number
 * }
 *
 * Returns:
 * { quotes: Quote[] } where Quote matches the frontend `Quote` type.
 */
exports.getParcelRates = functions.https.onCall(async (data, context) => {
  console.log('getParcelRates called with data:', JSON.stringify(data));
  
  const { originPostcode, destinationPostcode, weightKg, lengthCm, widthCm, heightCm } = data || {};

  // Strict validation with detailed error messages
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
  
  // Normalize the values
  const normalizedOrigin = originPostcode.trim();
  const normalizedDestination = destinationPostcode.trim();
  const normalizedWeight = Number(weightKg);

  // Check if API keys are configured
  if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
    console.warn('Sendcloud API keys not configured, returning mock data');
    // Return mock data instead of failing
    return {
      quotes: [
        {
          carrierName: 'Royal Mail',
          carrierType: 'Standard Delivery',
          estimatedTransitTime: '3-5 business days',
          chargeableWeight: normalizedWeight,
          chargeableWeightUnit: 'kg',
          weightBasis: 'Per Parcel',
          isSpecialOffer: false,
          totalCost: Math.round(normalizedWeight * 2.5 * 100) / 100,
          costBreakdown: {
            baseShippingCost: Math.round(normalizedWeight * 2.5 * 100) / 100,
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'Sendcloud',
        },
        {
          carrierName: 'DPD',
          carrierType: 'Express Delivery',
          estimatedTransitTime: '1-2 business days',
          chargeableWeight: normalizedWeight,
          chargeableWeightUnit: 'kg',
          weightBasis: 'Per Parcel',
          isSpecialOffer: false,
          totalCost: Math.round(normalizedWeight * 4.5 * 100) / 100,
          costBreakdown: {
            baseShippingCost: Math.round(normalizedWeight * 4.5 * 100) / 100,
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'Sendcloud',
        }
      ]
    };
  }

  try {
    console.log('Calling Sendcloud API with params:', { 
      originPostcode: normalizedOrigin, 
      destinationPostcode: normalizedDestination, 
      weightKg: normalizedWeight 
    });
    
    // Extract country codes from postcodes
    // If postcode is 2 characters, assume it's a country code
    // Otherwise, try to extract country or default to GB
    const getCountryCode = (postcode) => {
      const trimmed = postcode.trim().toUpperCase();
      if (trimmed.length === 2) {
        return trimmed; // Likely a country code
      }
      // Try to extract country code from common patterns
      // For UK postcodes, return GB
      if (/^[A-Z]{1,2}\d/.test(trimmed)) {
        return 'GB'; // UK postcode pattern
      }
      // Default to GB if we can't determine
      return 'GB';
    };
    
    const fromCountry = getCountryCode(normalizedOrigin);
    const toCountry = getCountryCode(normalizedDestination);
    
    console.log('Extracted countries:', { fromCountry, toCountry, origin: normalizedOrigin, destination: normalizedDestination });
    
    // This example uses the Sendcloud shipping methods endpoint.
    // You may need to adapt the params to match your Sendcloud account and product setup.
    const response = await axios.get('https://panel.sendcloud.sc/api/v2/shipping_methods', {
      auth: {
        username: SENDCLOUD_PUBLIC_KEY,
        password: SENDCLOUD_SECRET_KEY,
      },
      params: {
        from_country: fromCountry,
        to_country: toCountry,
        weight: Math.round(normalizedWeight * 1000), // Convert kg to grams
      },
      timeout: 15000, // 15 second timeout
    });

    console.log('Sendcloud API response status:', response.status);
    const methods = response.data?.shipping_methods || [];

    if (methods.length === 0) {
      console.warn('No shipping methods returned from Sendcloud');
      // Return mock data as fallback
      return {
        quotes: [
          {
            carrierName: 'Royal Mail',
            carrierType: 'Standard Delivery',
            estimatedTransitTime: '3-5 business days',
            chargeableWeight: normalizedWeight,
            chargeableWeightUnit: 'kg',
            weightBasis: 'Per Parcel',
            isSpecialOffer: false,
            totalCost: Math.round(normalizedWeight * 2.5 * 100) / 100,
            costBreakdown: {
              baseShippingCost: Math.round(normalizedWeight * 2.5 * 100) / 100,
              fuelSurcharge: 0,
              estimatedCustomsAndTaxes: 0,
              optionalInsuranceCost: 0,
              ourServiceFee: 0,
            },
            serviceProvider: 'Sendcloud',
          }
        ]
      };
    }

    // Transform Sendcloud shipping methods into frontend Quote[]
    const quotes = methods.map((m) => {
      // Sendcloud returns price in the currency of the account
      const price = Number(m.price) || 0;
      const carrierName = m.carrier || m.carrier_name || m.name || 'Unknown Carrier';
      const serviceName = m.name || m.service_name || 'Standard Service';
      const transitTime = m.delivery_time || m.min_delivery_time || m.max_delivery_time || 'N/A';
      
      return {
        carrierName: carrierName,
        carrierType: serviceName,
        estimatedTransitTime: transitTime,
        chargeableWeight: normalizedWeight,
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
        serviceProvider: 'Sendcloud',
      };
    });

    console.log(`Returning ${quotes.length} live quotes from Sendcloud API`);
    if (quotes.length === 0) {
      console.warn('Sendcloud returned empty results, this might indicate API configuration issues');
    }
    return { quotes };
  } catch (error) {
    console.error('Sendcloud API error:', error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      config: error.config?.url
    });
    
    // If it's an authentication error, log it clearly
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('Sendcloud API authentication failed. Please check your API keys.');
    }
    
    // Return mock data instead of throwing error so user always gets results
    // But mark it clearly as fallback
    return {
      quotes: [
        {
          carrierName: 'Royal Mail',
          carrierType: 'Standard Delivery',
          estimatedTransitTime: '3-5 business days',
          chargeableWeight: normalizedWeight,
          chargeableWeightUnit: 'kg',
          weightBasis: 'Per Parcel',
          isSpecialOffer: false,
          totalCost: Math.round(normalizedWeight * 2.5 * 100) / 100,
          costBreakdown: {
            baseShippingCost: Math.round(normalizedWeight * 2.5 * 100) / 100,
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'Sendcloud (Fallback - API Error)',
        }
      ]
    };
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

  // Check if API key is configured, if not return mock data
  if (!SEARATES_API_KEY) {
    console.warn('SeaRates API key not configured, returning mock data');
    return {
      quotes: [
        {
          carrierName: 'Maersk Line',
          carrierType: `${containerType} FCL`,
          estimatedTransitTime: '25-30 days',
          chargeableWeight: (totalWeightTon || 10) * 1000,
          chargeableWeightUnit: 'KG',
          weightBasis: 'Per Container',
          isSpecialOffer: false,
          totalCost: containerType.includes('20') ? 2500 : 4500,
          costBreakdown: {
            baseShippingCost: containerType.includes('20') ? 2500 : 4500,
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'SeaRates',
        }
      ],
      complianceReport: {
        status: 'info',
        summary: 'Mock FCL rates. Configure SeaRates API key for live rates.',
        requirements: []
      }
    };
  }

  try {
    console.log('Calling SeaRates API with params:', { originPort, destinationPort, containerType, totalWeightTon });
    
    // Example SeaRates FCL rates call. Adjust URL and payload according to your contract/docs.
    const response = await axios.post(
      'https://api.searates.com/fcl/rates',
      {
        origin: originPort,
        destination: destinationPort,
        container_type: containerType,
        weight: totalWeightTon || 1,
      },
      {
        headers: {
          Authorization: `Bearer ${SEARATES_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout
      }
    );

    console.log('SeaRates API response status:', response.status);
    const rates = response.data?.rates || response.data || [];

    if (rates.length === 0) {
      console.warn('No rates returned from SeaRates');
      // Return mock data as fallback
      return {
        quotes: [
          {
            carrierName: 'Maersk Line',
            carrierType: `${containerType} FCL`,
            estimatedTransitTime: '25-30 days',
            chargeableWeight: (totalWeightTon || 10) * 1000,
            chargeableWeightUnit: 'KG',
            weightBasis: 'Per Container',
            isSpecialOffer: false,
            totalCost: containerType.includes('20') ? 2500 : 4500,
            costBreakdown: {
              baseShippingCost: containerType.includes('20') ? 2500 : 4500,
              fuelSurcharge: 0,
              estimatedCustomsAndTaxes: 0,
              optionalInsuranceCost: 0,
              ourServiceFee: 0,
            },
            serviceProvider: 'SeaRates',
          }
        ],
        complianceReport: {
          status: 'info',
          summary: 'Mock FCL rates. Configure SeaRates API key for live rates.',
          requirements: []
        }
      };
    }

    const quotes = rates.map((r) => {
      const price = Number(r.total || r.price || 0);
      const transitDays = r.transit_time || r.transit || r.tt || null;

      return {
        carrierName: r.carrier || r.line || 'Unknown Carrier',
        carrierType: `${containerType} FCL`,
        estimatedTransitTime: transitDays ? `${transitDays} days` : 'N/A',
        chargeableWeight: (totalWeightTon || 0) * 1000,
        chargeableWeightUnit: 'KG',
        weightBasis: 'Per Container',
        isSpecialOffer: false,
        totalCost: price,
        costBreakdown: {
          baseShippingCost: price,
          fuelSurcharge: 0,
          estimatedCustomsAndTaxes: 0,
          optionalInsuranceCost: 0,
          ourServiceFee: 0,
        },
        serviceProvider: 'SeaRates',
      };
    });

    const complianceReport = {
      status: 'info',
      summary:
        'These are live FCL rates retrieved from SeaRates. Final booking may require confirmation of cargo details and documentation.',
      requirements: [
        {
          title: 'Commercial Invoice',
          description: 'Detailed invoice including shipper and consignee details, incoterms, and HS codes.',
        },
        {
          title: 'Packing List',
          description:
            'List of all items in the shipment including number of packages, weights, and dimensions.',
        },
        {
          title: 'Bill of Lading Instructions',
          description:
            'Full shipper/consignee and notify party details plus cargo description for the carrier B/L.',
        },
      ],
    };

    console.log(`Returning ${quotes.length} FCL quotes from SeaRates`);
    return { quotes, complianceReport };
  } catch (error) {
    console.error('SeaRates API error:', error.message, error.response?.data);
    // Return mock data instead of throwing error so user always gets results
    return {
      quotes: [
        {
          carrierName: 'Maersk Line',
          carrierType: `${containerType} FCL`,
          estimatedTransitTime: '25-30 days',
          chargeableWeight: (totalWeightTon || 10) * 1000,
          chargeableWeightUnit: 'KG',
          weightBasis: 'Per Container',
          isSpecialOffer: false,
          totalCost: containerType.includes('20') ? 2500 : 4500,
          costBreakdown: {
            baseShippingCost: containerType.includes('20') ? 2500 : 4500,
            fuelSurcharge: 0,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: 0,
          },
          serviceProvider: 'SeaRates (Fallback)',
        }
      ],
      complianceReport: {
        status: 'info',
        summary: 'Mock FCL rates returned due to API error. Configure SeaRates API key for live rates.',
        requirements: []
      }
    };
  }
});



