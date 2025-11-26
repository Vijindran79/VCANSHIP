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

    // --- Enhanced Dashboard UI with Graphics ---
    page.innerHTML = `
        <div class="dashboard-container">
            <div class="dashboard-header">
                <div class="dashboard-header-content">
                    <div class="dashboard-header-icon">
                        <i class="fa-solid fa-chart-line"></i>
                    </div>
                    <div>
                        <h1 class="dashboard-title">${t('dashboard.title')}</h1>
                        <p class="dashboard-subtitle">Manage your shipping operations and track your business</p>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-cards-grid">
                <button class="dashboard-card dashboard-card-primary" id="ecom-hub-dashboard-card">
                    <div class="dashboard-card-icon-wrapper dashboard-card-icon-blue">
                        <i class="fa-solid fa-table-columns"></i>
                    </div>
                    <div class="dashboard-card-content">
                        <h3 class="dashboard-card-title">${t('dashboard.card_dashboard')}</h3>
                        <p class="dashboard-card-description">View analytics and overview of your shipping activities</p>
                    </div>
                    <div class="dashboard-card-arrow">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>
                </button>
                
                <button class="dashboard-card dashboard-card-secondary" id="ecom-hub-myproducts-card">
                    <div class="dashboard-card-icon-wrapper dashboard-card-icon-green">
                        <i class="fa-solid fa-boxes-stacked"></i>
                    </div>
                    <div class="dashboard-card-content">
                        <h3 class="dashboard-card-title">${t('dashboard.card_my_products')}</h3>
                        <p class="dashboard-card-description">Manage and track all your products and inventory</p>
                    </div>
                    <div class="dashboard-card-arrow">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>
                </button>
                
                <button class="dashboard-card dashboard-card-accent" id="ecom-hub-addproduct-card">
                    <div class="dashboard-card-icon-wrapper dashboard-card-icon-orange">
                        <i class="fa-solid fa-circle-plus"></i>
                    </div>
                    <div class="dashboard-card-content">
                        <h3 class="dashboard-card-title">${t('dashboard.card_add_product')}</h3>
                        <p class="dashboard-card-description">Add new products to your catalog and start shipping</p>
                    </div>
                    <div class="dashboard-card-arrow">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>
                </button>
            </div>
            
            <div class="dashboard-stats-section" id="ecom-hub-content-view">
                <div class="dashboard-stats-placeholder">
                    <div class="dashboard-stats-icon">
                        <i class="fa-solid fa-chart-pie"></i>
                    </div>
                    <h3>Welcome to Your Dashboard</h3>
                    <p>${t('dashboard.stats_placeholder')}</p>
                </div>
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
