// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State, type Quote } from './state';

/**
 * Creates the HTML string for a single quote card.
 * @param quote The quote data object.
 * @returns An HTML string representing the quote card.
 */
export function createQuoteCard(quote: Quote): string {
    const companyName = quote.carrierName || 'Carrier';
    const logoUrl = `https://logo.clearbit.com/${companyName.toLowerCase().replace(/\s/g, '')}.com?size=80`;

    // FIX: Escape double quotes in the JSON string to safely embed it in the HTML data attribute.
    // This prevents "Unterminated string in JSON" errors if the quote data contains special characters.
    const safeQuoteData = JSON.stringify(quote).replace(/"/g, '&quot;');

    return `
        <div class="quote-card ${quote.isSpecialOffer ? 'quote-card-special' : ''}">
            ${quote.isSpecialOffer ? '<div class="special-offer-text">Vcanship Direct</div>' : ''}
            <div class="quote-card-header">
                <img src="${logoUrl}" alt="${companyName} logo" class="carrier-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="carrier-logo-fallback" style="display: none;">${companyName.charAt(0)}</div>
                <div class="carrier-info">
                    <span class="carrier-name">${companyName}</span>
                    <span class="carrier-type">${quote.carrierType}</span>
                </div>
                <div class="quote-provider-badge">via ${quote.serviceProvider}</div>
            </div>
            <div class="quote-card-body">
                 <div class="quote-card-details">
                    <div class="detail-item">
                        <span>Transit Time</span>
                        <strong>${quote.estimatedTransitTime || 'N/A'}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Chargeable Weight</span>
                        <strong>${quote.chargeableWeight} ${quote.chargeableWeightUnit}</strong>
                    </div>
                </div>
                <div class="quote-card-price">
                     <strong>${quote.totalCost ? `${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}` : 'N/A'}</strong>
                     <span>Total Cost</span>
                </div>
            </div>
            ${quote.notes ? `<div class="quote-card-notes">${quote.notes}</div>` : ''}
            <div class="quote-card-actions">
                 <button class="secondary-btn view-breakdown-btn" data-quote="${safeQuoteData}" ${!quote.costBreakdown ? 'disabled' : ''}>Breakdown</button>
                 <button class="main-submit-btn select-quote-btn" data-quote="${safeQuoteData}" ${!quote.totalCost ? 'disabled' : ''}>Select</button>
            </div>
        </div>
    `;
}