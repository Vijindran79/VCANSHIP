// Rate Comparison UI Enhancements for VCANSHIP
// Subtle UI improvements to highlight best deals for customers

import { type UnifiedShippingMethod } from './multi-api-shipping.js';

/**
 * Enhanced quote card renderer with best deal indicators
 */
export function renderEnhancedQuoteCard(
    method: UnifiedShippingMethod,
    index: number,
    totalMethods: number,
    savings?: number
): string {
    const badgeHtml = generateBadges(method, savings);
    const savingsHtml = method.isCheapest && savings && savings > 0 
        ? `<div class="savings-indicator">💰 Save ${method.currency} ${savings.toFixed(2)}</div>` 
        : '';

    return `
    <div class="quote-card ${method.isCheapest ? 'cheapest-deal' : ''} ${method.isFastest ? 'fastest-deal' : ''} ${method.isRecommended ? 'recommended-deal' : ''}" 
         data-quote-id="${method.id}" 
         data-provider="${method.provider}">
        
        ${badgeHtml}
        
        <div class="quote-header">
            <div class="carrier-info">
                <h3 class="carrier-name">${method.carrierName}</h3>
                <p class="service-name">${method.serviceName}</p>
                <small class="provider-tag">via ${method.provider}</small>
            </div>
            <div class="quote-price">
                <span class="price-amount">${method.currency} ${method.price.toFixed(2)}</span>
                ${method.isCheapest ? '<span class="best-price-tag">Best Price</span>' : ''}
            </div>
        </div>

        <div class="quote-details">
            <div class="delivery-info">
                <i class="fa-solid fa-clock"></i>
                <span>${method.estimatedDays} ${method.estimatedDays === 1 ? 'day' : 'days'}</span>
                ${method.estimatedDeliveryDate ? `<small>by ${formatDate(method.estimatedDeliveryDate)}</small>` : ''}
            </div>
            
            ${savingsHtml}
            
            <div class="quote-features">
                ${method.originalData?.properties?.track_and_trace ? '<span class="feature"><i class="fa-solid fa-location-dot"></i> Tracking</span>' : ''}
                ${method.originalData?.properties?.insurance ? '<span class="feature"><i class="fa-solid fa-shield"></i> Insurance</span>' : ''}
                ${method.originalData?.properties?.delivery_confirmation ? '<span class="feature"><i class="fa-solid fa-signature"></i> Signature</span>' : ''}
            </div>
        </div>

        <div class="quote-actions">
            <button class="select-quote-btn ${method.isCheapest ? 'primary-btn' : 'secondary-btn'}" 
                    data-quote-id="${method.id}">
                ${method.isCheapest ? '🎯 Choose Best Deal' : 'Select This Option'}
            </button>
        </div>
    </div>
    `;
}

/**
 * Generate badges for special deals
 */
function generateBadges(method: UnifiedShippingMethod, savings?: number): string {
    const badges = [];

    if (method.isCheapest) {
        badges.push(`
            <div class="deal-badge cheapest-badge">
                <i class="fa-solid fa-trophy"></i>
                <span>Cheapest</span>
            </div>
        `);
    }

    if (method.isFastest) {
        badges.push(`
            <div class="deal-badge fastest-badge">
                <i class="fa-solid fa-bolt"></i>
                <span>Fastest</span>
            </div>
        `);
    }

    if (method.isRecommended && !method.isCheapest && !method.isFastest) {
        badges.push(`
            <div class="deal-badge recommended-badge">
                <i class="fa-solid fa-star"></i>
                <span>Recommended</span>
            </div>
        `);
    }

    return badges.length > 0 ? `<div class="deal-badges">${badges.join('')}</div>` : '';
}

/**
 * Render comparison summary at the top of results
 */
export function renderComparisonSummary(
    cheapest: UnifiedShippingMethod | null,
    fastest: UnifiedShippingMethod | null,
    recommended: UnifiedShippingMethod | null,
    totalRates: number,
    savings: number,
    totalCommission: number
): string {
    if (!cheapest) return '';

    return `
    <div class="comparison-summary">
        <div class="summary-header">
            <h3><i class="fa-solid fa-chart-line"></i> Rate Comparison Results</h3>
            <p class="summary-subtitle">We compared ${totalRates} rates from multiple providers to find you the best deals</p>
        </div>

        <div class="summary-highlights">
            <div class="highlight-card best-price">
                <div class="highlight-icon">🏆</div>
                <div class="highlight-content">
                    <h4>Best Price</h4>
                    <p class="highlight-value">${cheapest.currency} ${cheapest.price.toFixed(2)}</p>
                    <small>${cheapest.carrierName} • ${cheapest.estimatedDays} days</small>
                </div>
            </div>

            ${fastest && fastest.id !== cheapest.id ? `
            <div class="highlight-card fastest-delivery">
                <div class="highlight-icon">⚡</div>
                <div class="highlight-content">
                    <h4>Fastest Delivery</h4>
                    <p class="highlight-value">${fastest.estimatedDays} ${fastest.estimatedDays === 1 ? 'day' : 'days'}</p>
                    <small>${fastest.carrierName} • ${fastest.currency} ${fastest.price.toFixed(2)}</small>
                </div>
            </div>
            ` : ''}

            ${savings > 0 ? `
            <div class="highlight-card savings">
                <div class="highlight-icon">💰</div>
                <div class="highlight-content">
                    <h4>You Save</h4>
                    <p class="highlight-value">${cheapest.currency} ${savings.toFixed(2)}</p>
                    <small>vs most expensive option</small>
                </div>
            </div>
            ` : ''}
        </div>

        <div class="summary-actions">
            <button class="quick-select-btn" data-quote-id="${cheapest.id}">
                <i class="fa-solid fa-zap"></i> Choose Cheapest (${cheapest.currency} ${cheapest.price.toFixed(2)})
            </button>
            ${recommended && recommended.id !== cheapest.id ? `
            <button class="quick-select-btn secondary" data-quote-id="${recommended.id}">
                <i class="fa-solid fa-star"></i> Choose Recommended
            </button>
            ` : ''}
        </div>
    </div>
    `;
}

/**
 * Add loading state for rate comparison
 */
export function renderRateComparisonLoading(): string {
    return `
    <div class="rate-comparison-loading">
        <div class="loading-animation">
            <div class="loading-spinner"></div>
            <div class="loading-text">
                <h3>🔍 Finding the best rates for you...</h3>
                <p>Comparing prices from multiple shipping providers</p>
                <div class="loading-steps">
                    <div class="loading-step active">
                        <i class="fa-solid fa-search"></i> Searching SendCloud
                    </div>
                    <div class="loading-step">
                        <i class="fa-solid fa-search"></i> Searching Shippo
                    </div>
                    <div class="loading-step">
                        <i class="fa-solid fa-calculator"></i> Comparing rates
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

/**
 * Commission tracking display (admin view)
 */
export function renderCommissionSummary(
    rates: UnifiedShippingMethod[],
    isAdminView: boolean = false
): string {
    if (!isAdminView || rates.length === 0) return '';

    const totalCommission = rates.reduce((sum, rate) => sum + (rate.commission || 0), 0);
    const averageCommission = totalCommission / rates.length;
    const totalRevenue = rates.reduce((sum, rate) => sum + rate.price, 0);
    const marginPercentage = (totalCommission / totalRevenue) * 100;

    return `
    <div class="commission-summary admin-only">
        <h4><i class="fa-solid fa-chart-pie"></i> Commission Summary</h4>
        <div class="commission-stats">
            <div class="stat">
                <span class="stat-label">Total Commission:</span>
                <span class="stat-value">£${totalCommission.toFixed(2)}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Average per Rate:</span>
                <span class="stat-value">£${averageCommission.toFixed(2)}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Margin:</span>
                <span class="stat-value">${marginPercentage.toFixed(1)}%</span>
            </div>
        </div>
    </div>
    `;
}

/**
 * Enhanced CSS for rate comparison UI
 */
export function injectRateComparisonCSS(): void {
    const css = `
    /* Rate Comparison Enhancements */
    .comparison-summary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }

    .summary-header h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
    }

    .summary-subtitle {
        opacity: 0.9;
        margin: 0 0 1.5rem 0;
    }

    .summary-highlights {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .highlight-card {
        background: rgba(255,255,255,0.15);
        backdrop-filter: blur(10px);
        padding: 1rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .highlight-icon {
        font-size: 2rem;
        opacity: 0.9;
    }

    .highlight-content h4 {
        margin: 0 0 0.25rem 0;
        font-size: 0.9rem;
        opacity: 0.8;
    }

    .highlight-value {
        font-size: 1.25rem;
        font-weight: bold;
        margin: 0 0 0.25rem 0;
    }

    .highlight-content small {
        opacity: 0.7;
        font-size: 0.8rem;
    }

    .summary-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
    }

    .quick-select-btn {
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
    }

    .quick-select-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: translateY(-2px);
    }

    .quick-select-btn.secondary {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.5);
    }

    /* Enhanced Quote Cards */
    .quote-card {
        position: relative;
        border: 2px solid transparent;
        transition: all 0.3s ease;
    }

    .quote-card.cheapest-deal {
        border-color: #10b981;
        box-shadow: 0 4px 20px rgba(16, 185, 129, 0.2);
    }

    .quote-card.fastest-deal {
        border-color: #f59e0b;
        box-shadow: 0 4px 20px rgba(245, 158, 11, 0.2);
    }

    .quote-card.recommended-deal {
        border-color: #8b5cf6;
        box-shadow: 0 4px 20px rgba(139, 92, 246, 0.2);
    }

    .deal-badges {
        position: absolute;
        top: -8px;
        right: 1rem;
        display: flex;
        gap: 0.5rem;
        z-index: 10;
    }

    .deal-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .deal-badge.cheapest-badge {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .deal-badge.fastest-badge {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }

    .deal-badge.recommended-badge {
        background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    }

    .savings-indicator {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        margin: 0.5rem 0;
        text-align: center;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
    }

    .best-price-tag {
        background: #10b981;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        margin-left: 0.5rem;
    }

    .provider-tag {
        background: #f3f4f6;
        color: #6b7280;
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 500;
    }

    .select-quote-btn.primary-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .select-quote-btn.primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
    }

    /* Rate Comparison Loading */
    .rate-comparison-loading {
        text-align: center;
        padding: 3rem 2rem;
    }

    .loading-animation {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
    }

    .loading-spinner {
        width: 60px;
        height: 60px;
        border: 4px solid #f3f4f6;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    .loading-steps {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .loading-step {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        opacity: 0.5;
        transition: opacity 0.3s ease;
    }

    .loading-step.active {
        opacity: 1;
        color: #667eea;
    }

    /* Commission Summary (Admin) */
    .commission-summary {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
    }

    .commission-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
    }

    .stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .stat-value {
        font-weight: 600;
        color: #059669;
    }

    /* Mobile Responsiveness */
    @media (max-width: 768px) {
        .comparison-summary {
            padding: 1.5rem;
        }
        
        .summary-highlights {
            grid-template-columns: 1fr;
        }
        
        .summary-actions {
            flex-direction: column;
        }
        
        .quick-select-btn {
            width: 100%;
        }
        
        .deal-badges {
            position: static;
            justify-content: center;
            margin-bottom: 1rem;
        }
    }
    `;

    const styleElement = document.createElement('style');
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
}

/**
 * Utility function to format dates
 */
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Auto-inject CSS when module loads
if (typeof document !== 'undefined') {
    injectRateComparisonCSS();
}

export {
    generateBadges,
    formatDate
};