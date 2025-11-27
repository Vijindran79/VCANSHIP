// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { t } from './i18n';
import { Service, State } from './state';
import { mountService } from './router';
import { makeDraggable } from './utils';

// DEFERRED INITIALIZATION: Converted from a constant to a function to prevent premature calls to the 't' function
// before translations are loaded, which was causing an initialization error due to a circular dependency with i18n.ts.
export const getAllServicesConfig = (): { id: Service, name: string, icon: string }[] => {
    return [
        { id: 'parcel', name: 'Parcel', icon: 'fa-solid fa-box' },
        { id: 'fcl', name: 'FCL Freight', icon: 'fa-solid fa-boxes-stacked' },
        { id: 'lcl', name: 'LCL Freight', icon: 'fa-solid fa-boxes-packing' },
        { id: 'airfreight', name: 'Air Freight', icon: 'fa-solid fa-plane-up' },
        { id: 'railway', name: t('sidebar.railway'), icon: 'fa-solid fa-train-subway' },
        { id: 'bulk', name: t('sidebar.bulk'), icon: 'fa-solid fa-anchor' },
        { id: 'schedules', name: t('sidebar.schedules'), icon: 'fa-solid fa-calendar-days' },
        { id: 'ecommerce', name: t('sidebar.ecommerce'), icon: 'fa-solid fa-store' },
        { id: 'secure-trade', name: 'Secure Trade', icon: 'fa-solid fa-shield-halved' },
        { id: 'service-provider-register', name: t('sidebar.partner'), icon: 'fa-solid fa-handshake' }
    ];
};


// --- DESKTOP SIDEBAR & HEADER NAVIGATION ---
export function initializeSidebar() {
    const ALL_SERVICES_CONFIG = getAllServicesConfig();
    const sidebarEl = document.getElementById('app-sidebar');
    if (sidebarEl) {
        const mainButtons = [
            { id: 'landing', name: t('sidebar.services'), icon: 'fa-solid fa-box-open', active: true },
            { id: 'api-hub', name: t('sidebar.apiHub'), icon: 'fa-solid fa-code' },
            { id: 'help', name: t('sidebar.helpCenter'), icon: 'fa-solid fa-question-circle' }
        ];
        const serviceButtons = ALL_SERVICES_CONFIG; // Show all services in sidebar

        const createMainButton = (btn: { id: string, name: string, icon: string, active?: boolean }) =>
            `<button class="sidebar-btn static-link ${btn.active ? 'active' : ''}" data-page="${btn.id}"><i class="${btn.icon}"></i> ${btn.name}</button>`;

        const createServiceButton = (btn: { id: Service, name: string, icon: string }) =>
            `<button class="sidebar-btn-service" data-service="${btn.id}"><i class="${btn.icon}"></i> ${btn.name}</button>`;

        // Function to update active states
        const updateActiveStates = () => {
            // Clear all service button active states first
            sidebarEl.querySelectorAll('.sidebar-btn-service').forEach(btn => {
                btn.classList.remove('active');
            });

            // Set active state for current service
            const currentService = State.currentService;
            if (currentService) {
                const activeBtn = sidebarEl.querySelector(`.sidebar-btn-service[data-service="${currentService}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
            }
        };

        sidebarEl.innerHTML = `
            <div class="sidebar-section">
                ${mainButtons.map(createMainButton).join('')}
            </div>
            <div class="sidebar-section">
                ${serviceButtons.map(createServiceButton).join('')}
            </div>
        `;

        // Call updateActiveStates after setting innerHTML
        updateActiveStates();
    }
}

// --- NEW: MOBILE SERVICES MODAL ---
export function initializeServicesModal() {
    // This function is now deprecated. The mobile menu is handled in index.tsx.
}
