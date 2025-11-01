// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, setState } from './state';
import { switchPage, showToast } from './ui';
import { mountService } from './router';
import { t } from './i18n';

export function renderDashboard() {
    const page = DOMElements.pageDashboard;
    if (!page) return;

    if (!State.isLoggedIn) {
        page.innerHTML = `<div class="form-container" style="text-align: center;"><p>${t('errors.login_required_dashboard')}</p></div>`;
        return;
    }

    // --- Render E-commerce Hub UI from Screenshot ---
    page.innerHTML = `
        <div class="dashboard-ecom-hub">
            <h2 class="ecom-hub-title">${t('dashboard.title')}</h2>
            <div class="ecom-hub-actions">
                <button class="ecom-action-card" id="ecom-hub-dashboard-card">
                    <div class="ecom-action-card-icon">
                        <i class="fa-solid fa-table-columns"></i>
                    </div>
                    <span>${t('dashboard.card_dashboard')}</span>
                </button>
                <button class="ecom-action-card" id="ecom-hub-myproducts-card">
                    <div class="ecom-action-card-icon">
                       <i class="fa-solid fa-boxes-stacked"></i>
                    </div>
                    <span>${t('dashboard.card_my_products')}</span>
                </button>
                <button class="ecom-action-card" id="ecom-hub-addproduct-card">
                    <div class="ecom-action-card-icon">
                        <i class="fa-solid fa-circle-plus"></i>
                    </div>
                    <span>${t('dashboard.card_add_product')}</span>
                </button>
            </div>
            <div id="ecom-hub-content-view">
                <p>${t('dashboard.stats_placeholder')}</p>
            </div>
        </div>
    `;

    // Attach event listeners for the new action cards
    document.getElementById('ecom-hub-dashboard-card')?.addEventListener('click', () => {
        setState({ ecomInitialView: 'hub' });
        mountService('ecommerce');
    });
    
    document.getElementById('ecom-hub-myproducts-card')?.addEventListener('click', () => {
        setState({ ecomInitialView: 'my-products' });
        mountService('ecommerce');
    });

    document.getElementById('ecom-hub-addproduct-card')?.addEventListener('click', () => {
        setState({ ecomInitialView: 'add-product' });
        mountService('ecommerce');
    });
}


export function initializeDashboard() {
    const dashboardPageElement = DOMElements.pageDashboard;
    if (dashboardPageElement) {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as HTMLElement;
                    if (target.classList.contains('active')) {
                        renderDashboard();
                    }
                }
            }
        });
        observer.observe(dashboardPageElement, { attributes: true });
    }
}
