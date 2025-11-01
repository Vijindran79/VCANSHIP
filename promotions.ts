// promotions.ts
import { State, setState, Service } from './state';
import { countryCodeToFlag } from './LocaleSwitcher';

// --- Type Definitions ---
export interface Promotion {
    id: string;
    service: Service | 'general';
    title: string;
    description: string;
    origin?: { city: string; countryCode: string; };
    destination?: { city: string; countryCode: string; };
    price?: string;
    urgencyText?: string;
    theme: string;
}

// --- Mock Data ---
const mockGlobalEvents = [
    { name: 'Diwali', month: 10, relevantCountries: ['IN', 'GB', 'US', 'CA', 'MY'], theme: 'family_parcel' },
    { name: 'Christmas', month: 11, relevantCountries: ['GB', 'US', 'DE', 'FR', 'AU'], theme: 'holiday_parcel' },
    { name: 'Chinese New Year', month: 1, relevantCountries: ['CN', 'SG', 'MY', 'US'], theme: 'cny_freight' },
    { name: 'African Festivals', month: 7, relevantCountries: ['NG', 'GH', 'GB'], theme: 'africa_home' }
];

const genericPromotions: Promotion[] = [
    { id: 'fcl1', service: 'fcl', title: 'FCL Hot Deal!', description: 'Limited slots available on our most popular trade lane.', origin: { city: 'Shanghai', countryCode: 'CN' }, destination: { city: 'Rotterdam', countryCode: 'NL' }, urgencyText: '3 slots left!', price: '$2,800', theme: 'generic_fcl' },
    { id: 'fcl2', service: 'fcl', title: 'Empty Leg FCL', description: 'Container repositioning special offer. Book now!', origin: { city: 'Los Angeles', countryCode: 'US' }, destination: { city: 'Singapore', countryCode: 'SG' }, urgencyText: 'Ends in 48h', price: '$1,950', theme: 'generic_fcl' },
    { id: 'lcl1', service: 'lcl', title: 'LCL Consolidation', description: 'Secure your spot in our weekly shared container.', origin: { city: 'Hamburg', countryCode: 'DE' }, destination: { city: 'New York', countryCode: 'US' }, urgencyText: 'Filling up fast!', price: '$95/cbm', theme: 'generic_lcl' },
    { id: 'air1', service: 'airfreight', title: 'Air Freight Capacity', description: 'Available capacity on our daily flights. Fast and reliable.', origin: { city: 'Hong Kong', countryCode: 'HK' }, destination: { city: 'Frankfurt', countryCode: 'DE' }, urgencyText: 'Daily Flights', price: '$4.50/kg', theme: 'generic_air' },
    { id: 'veh1', service: 'vehicle', title: 'RoRo Vehicle Special', description: 'Discounted rate for standard sedans on this route.', origin: { city: 'Yokohama', countryCode: 'JP' }, destination: { city: 'Bremerhaven', countryCode: 'DE' }, price: '$1,600', theme: 'generic_vehicle' },
];


// --- Logic ---
let allGeneratedPromotions: Promotion[] = [];

export function generatePromotions() {
    const userCountry = localStorage.getItem('vcanship_country') || 'GB';
    const currentMonth = new Date().getMonth(); // 0-indexed (Jan=0)
    let eventPromotions: Promotion[] = [];

    const upcomingEvents = mockGlobalEvents.filter(event => {
        const eventStartMonth = event.month;
        return event.relevantCountries.includes(userCountry) && 
               (currentMonth === eventStartMonth || currentMonth === eventStartMonth - 1);
    });

    for (const event of upcomingEvents) {
        if (event.theme === 'family_parcel') {
            eventPromotions.push({
                id: `promo_${event.name}_${userCountry}`,
                service: 'parcel',
                title: `Send ${event.name} Gifts!`,
                description: `Missing home? Send gifts and sweets to family for the festival.`,
                origin: { city: 'Mumbai', countryCode: 'IN' },
                destination: { city: userCountry === 'GB' ? 'London' : 'New York', countryCode: userCountry },
                theme: 'event_parcel'
            });
        }
        if (event.theme === 'cny_freight') {
             eventPromotions.push({
                id: 'promo_cny_fcl',
                service: 'fcl',
                title: 'Pre-CNY Rush!',
                description: 'Beat the holiday rush. Ship your containers before the factories close.',
                origin: { city: 'Qingdao', countryCode: 'CN' },
                destination: { city: 'Los Angeles', countryCode: 'US' },
                urgencyText: 'Book before peak season!',
                theme: 'event_freight'
            });
        }
        if (event.theme === 'africa_home') {
             eventPromotions.push({
                id: 'promo_africa_parcel',
                service: 'parcel',
                title: 'Bring Home Closer',
                description: 'Send personal effects, fabrics, and food items home for the festival season.',
                origin: { city: 'London', countryCode: 'GB' },
                destination: { city: 'Lagos', countryCode: 'NG' },
                theme: 'event_parcel'
            });
        }
    }

    allGeneratedPromotions = [...eventPromotions, ...genericPromotions];
    setState({ promotions: allGeneratedPromotions });
}

function renderPromotion(promotion: Promotion): string {
    return `
        <div class="deal-card">
            <div class="deal-card-header">
                <h4>${promotion.title}</h4>
                <span class="service-badge">${promotion.service.toUpperCase()}</span>
            </div>
            ${promotion.origin && promotion.destination ? `
            <p class="deal-card-route">
                <span class="flag-icon">${countryCodeToFlag(promotion.origin.countryCode)}</span> ${promotion.origin.city} &rarr; 
                <span class="flag-icon">${countryCodeToFlag(promotion.destination.countryCode)}</span> ${promotion.destination.city}
            </p>` : ''}
            <p class="deal-card-desc">${promotion.description}</p>
            <div class="deal-card-bottom">
                ${promotion.price ? `<p class="deal-card-price">${promotion.price} <small>Est.</small></p>` : ''}
                ${promotion.urgencyText ? `<span class="urgency-badge">${promotion.urgencyText}</span>` : ''}
            </div>
        </div>
    `;
}

export function startPromotionsRotator(containerId: string) {
    if (State.activePromotionInterval) {
        clearInterval(State.activePromotionInterval);
    }
    const container = document.getElementById(containerId);
    if (!container) return;

    let currentIndex = 0;
    const promotions = State.promotions;
    
    // Function to render the next set of promotions
    const renderNext = () => {
        if (promotions.length === 0) return;
        
        container.style.opacity = '0';
        
        setTimeout(() => {
            container.innerHTML = ''; 

            const promotionsToShow: Promotion[] = [];
            for (let i = 0; i < 4; i++) {
                if (promotions.length > 0) {
                    promotionsToShow.push(promotions[(currentIndex + i) % promotions.length]);
                }
            }
            
            container.innerHTML = promotionsToShow.map(renderPromotion).join('');
            container.style.opacity = '1';
            
            currentIndex = (currentIndex + 4) % (promotions.length || 1);
        }, 300); // Wait for fade out
    };
    
    // FIX: Use window.setInterval to ensure the return type is 'number' for browser environments.
    const interval = window.setInterval(renderNext, 5000);
    setState({ activePromotionInterval: interval });
    
    // Initial render
    renderNext();
}


let bannerInterval: number | null = null;
export function mountPromotionBanner(service: Service) {
    const pageContainer = document.getElementById('page-container');
    if (!pageContainer) return;

    unmountPromotionBanner(); 

    const banner = document.createElement('div');
    banner.id = 'service-promo-banner';
    banner.className = 'service-promo-banner';
    
    const pageHeader = pageContainer.querySelector('.service-page-header');
    if (pageHeader) {
        pageHeader.insertAdjacentElement('afterend', banner);
    } else {
        pageContainer.prepend(banner);
    }

    const relevantPromos = State.promotions.filter(p => p.service === service || p.service === 'general');
    if (relevantPromos.length === 0) {
        unmountPromotionBanner();
        return;
    }

    let currentIndex = 0;
    
    const renderBannerContent = () => {
        const promo = relevantPromos[currentIndex];
        banner.innerHTML = `
            <div class="promo-banner-content">
                <i class="fa-solid fa-tags promo-icon"></i>
                <div class="promo-text">
                    <strong>${promo.title}</strong>
                    <span>${promo.description} ${promo.origin ? `${promo.origin.city} -> ${promo.destination!.city}` : ''}</span>
                </div>
                ${promo.urgencyText ? `<span class="urgency-badge">${promo.urgencyText}</span>` : ''}
            </div>
        `;
        banner.style.opacity = '1';
    }

    renderBannerContent(); 

    if (relevantPromos.length > 1) {
        // FIX: Use window.setInterval to ensure the return type is 'number' for browser environments.
        bannerInterval = window.setInterval(() => {
            banner.style.opacity = '0';
            setTimeout(() => {
                currentIndex = (currentIndex + 1) % relevantPromos.length;
                renderBannerContent();
            }, 300); 
        }, 5000);
    }
}

export function unmountPromotionBanner() {
    if (bannerInterval) {
        clearInterval(bannerInterval);
        bannerInterval = null;
    }
    const banner = document.getElementById('service-promo-banner');
    if (banner) {
        banner.remove();
    }
}