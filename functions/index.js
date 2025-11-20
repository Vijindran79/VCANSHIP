// Firebase Cloud Functions entry point
// Implements:
//  - getParcelRates: calls Sendcloud for parcel quotes
//  - getFclRates: calls SeaRates for FCL quotes

const functions = require('firebase-functions');
const axios = require('axios');

// Use Firebase config for secrets:
//   firebase functions:config:set sendcloud.public_key="YOUR_PUBLIC_KEY" sendcloud.secret_key="YOUR_SECRET_KEY"
//   firebase functions:config:set searates.api_key="YOUR_SEARATES_API_KEY"

// Use environment variables for secrets
// Set these using: firebase functions:secrets:set SENDCLOUD_PUBLIC_KEY
const SENDCLOUD_PUBLIC_KEY = process.env.SENDCLOUD_PUBLIC_KEY;
const SENDCLOUD_SECRET_KEY = process.env.SENDCLOUD_SECRET_KEY;
const SEARATES_API_KEY = process.env.SEARATES_API_KEY;

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
  if (!SENDCLOUD_PUBLIC_KEY || !SENDCLOUD_SECRET_KEY) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Sendcloud API keys are not configured. Set functions config sendcloud.public_key and sendcloud.secret_key.'
    );
  }

  const { originPostcode, destinationPostcode, weightKg, lengthCm, widthCm, heightCm } = data || {};

  if (!originPostcode || !destinationPostcode || !weightKg) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'originPostcode, destinationPostcode and weightKg are required.'
    );
  }

  try {
    // This example uses the Sendcloud shipping methods endpoint.
    // You may need to adapt the params to match your Sendcloud account and product setup.
    const response = await axios.get('https://panel.sendcloud.sc/api/v2/shipping_methods', {
      auth: {
        username: SENDCLOUD_PUBLIC_KEY,
        password: SENDCLOUD_SECRET_KEY,
      },
      // NOTE: adjust params to your Sendcloud contract (service points, carriers, etc.)
      params: {
        // Example: domestic UK shipping; you can tweak or extend this.
        from_country: 'GB',
        to_country: 'GB',
        weight: Math.round(weightKg * 1000), // grams
      },
    });

    const methods = response.data?.shipping_methods || [];

    // Transform Sendcloud shipping methods into frontend Quote[]
    const quotes = methods.map((m) => {
      const price = Number(m.price) || 0;
      return {
        carrierName: m.carrier || m.name || 'Unknown Carrier',
        carrierType: m.name || 'Standard Service',
        estimatedTransitTime: m.delivery_time || 'N/A',
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
        serviceProvider: 'Sendcloud',
      };
    });

    return { quotes };
  } catch (error) {
    throw asHttpsError(error, 'Failed to fetch Sendcloud parcel rates');
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
  if (!SEARATES_API_KEY) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'SeaRates API key is not configured. Set functions config searates.api_key.'
    );
  }

  const { originPort, destinationPort, containerType, totalWeightTon } = data || {};

  if (!originPort || !destinationPort || !containerType) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'originPort, destinationPort and containerType are required.'
    );
  }

  try {
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
      }
    );

    const rates = response.data?.rates || response.data || [];

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

    return { quotes, complianceReport };
  } catch (error) {
    throw asHttpsError(error, 'Failed to fetch SeaRates FCL rates');
  }
});



