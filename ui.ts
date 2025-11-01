// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, setState, type Page } from './state';
import { t } from './i18n';

/**
 * Updates the visual progress bar for service pages.
 * @param service The service to update the progress bar for (e.g., 'parcel', 'fcl').
 * @param currentStepIndex The current step index (0-based).
 */
export const updateProgressBar = (service: string, currentStepIndex: number) => {
    const progressBarContainer = document.getElementById(`progress-bar-${service}`);
    if (!progressBarContainer) return;

    const steps = progressBarContainer.querySelectorAll<HTMLElement>('.progress-step');
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < currentStepIndex) {
            step.classList.add('completed');
        } else if (index === currentStepIndex) {
            step.classList.add('active');
        }
    });
};


/**
 * Updates the active state of sidebar and header links based on the current page.
 */
function updateSidebarActiveState() {
    const activePage = State.currentPage;
    
    // --- Sidebar ---
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
        // Deactivate all buttons first
        sidebar.querySelectorAll('.sidebar-btn, .sidebar-btn-service').forEach(btn => {
            btn.classList.remove('active');
        });

        // Find the button to activate. A page can be a service or a static page.
        // Try matching on data-service first for service pages.
        let activeButton = sidebar.querySelector(`.sidebar-btn-service[data-service="${activePage}"]`);
        
        if (!activeButton) {
            // If not found, it might be a main static page link.
            activeButton = sidebar.querySelector(`.sidebar-btn.static-link[data-page="${activePage}"]`);
        }

        // Special case for landing page, its button is 'Services'
        if (activePage === 'landing') {
            activeButton = sidebar.querySelector(`.sidebar-btn.static-link[data-page="landing"]`);
        }

        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    // --- Header ---
    const header = document.querySelector('header');
    if(header) {
        header.querySelectorAll('.header-btn.static-link').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeHeaderButton = header.querySelector(`.header-btn.static-link[data-page="${activePage}"]`);
        if (activeHeaderButton) {
            activeHeaderButton.classList.add('active');
        }
    }
}


/**
 * Switches the visible page with a page-flipping animation.
 * @param newPage The ID of the page to switch to.
 */
export const switchPage = (newPage: Page) => {
    if (State.currentPage === newPage && newPage !== 'landing') return;

    const pageContainer = DOMElements.pageContainer;
    if (!pageContainer) return;

    const oldPageElement = pageContainer.querySelector('.page.active') as HTMLElement | null;
    const newPageElement = document.getElementById(`page-${newPage}`) as HTMLElement | null;

    if (!newPageElement) {
        console.error(`Page switch failed: Element for page '${newPage}' not found.`);
        if (State.currentPage !== 'landing') {
             switchPage('landing');
        }
        return;
    }

    if (pageContainer.querySelector('.page-flip-in, .page-flip-out')) {
        return;
    }
    
    if (oldPageElement && oldPageElement !== newPageElement) {
        oldPageElement.style.position = 'absolute';
        oldPageElement.style.width = '100%';
        oldPageElement.style.top = '0';
        oldPageElement.style.left = '0';
        oldPageElement.style.zIndex = '1';

        newPageElement.classList.add('active');
        newPageElement.style.zIndex = '2';

        oldPageElement.classList.add('page-flip-out');
        newPageElement.classList.add('page-flip-in');

        oldPageElement.addEventListener('animationend', () => {
            oldPageElement.classList.remove('active', 'page-flip-out');
            oldPageElement.style.position = '';
            oldPageElement.style.width = '';
            oldPageElement.style.top = '';
            oldPageElement.style.left = '';
            oldPageElement.style.zIndex = '';
        }, { once: true });
        
        newPageElement.addEventListener('animationend', () => {
            newPageElement.classList.remove('page-flip-in');
        }, { once: true });

    } else {
        if (oldPageElement) {
            oldPageElement.classList.remove('active');
        }
        newPageElement.classList.add('active');
    }

    setState({ currentPage: newPage });
    updateSidebarActiveState(); 
    window.scrollTo(0, 0); 
};


/**
 * Shows a toast notification with an updated design and new 'warning' type.
 * @param message The message to display.
 * @param type The type of toast (success, error, info, warning).
 * @param duration Duration in milliseconds.
 */
export function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const icons = {
        success: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        error: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`,
        info: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>`,
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-message">${message}</div>
    `;
    
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

/**
 * Toggles the loading overlay.
 * @param show True to show, false to hide.
 * @param text The text to display on the overlay.
 */
export const toggleLoading = (show: boolean, text: string = t('loading.default')) => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-progress-text');
    if (!loadingOverlay || !loadingText) return;

    loadingText.textContent = text;
    loadingOverlay.classList.toggle('active', show);
};

/**
 * Shows the authentication modal.
 */
export function showAuthModal() {
    DOMElements.authModal.classList.add('active');
}

/**
 * Hides the authentication modal.
 */
export function closeAuthModal() {
    DOMElements.authModal.classList.remove('active');
}

/**
 * Shows the pre-launch "coming soon" modal.
 */
export function showPrelaunchModal() {
    const modal = document.getElementById('prelaunch-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

/**
 * Hides the pre-launch "coming soon" modal.
 */
export function closePrelaunchModal() {
    const modal = document.getElementById('prelaunch-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Displays the usage limit modal with content based on user type.
 * @param userType The type of user who has hit their limit ('guest' or 'free').
 */
export function showUsageLimitModal(userType: 'guest' | 'free') {
    const modal = document.getElementById('usage-limit-modal');
    const title = document.getElementById('limit-modal-title');
    const message = document.getElementById('limit-modal-message');
    const actionBtn = document.getElementById('limit-modal-action-btn') as HTMLButtonElement;
    const closeBtn = document.getElementById('close-limit-modal-btn');

    if (!modal || !title || !message || !actionBtn || !closeBtn) return;

    if (userType === 'guest') {
        title.textContent = t('modals.usage_limit.guest_title');
        message.textContent = t('modals.usage_limit.guest_desc');
        actionBtn.textContent = t('modals.usage_limit.guest_cta');
        actionBtn.onclick = () => {
            closeUsageLimitModal();
            showAuthModal();
        };
    } else { // 'free' user
        title.textContent = t('modals.usage_limit.free_title');
        message.textContent = t('modals.usage_limit.free_desc');
        actionBtn.textContent = t('modals.usage_limit.free_cta');
        actionBtn.onclick = () => {
            showToast(t('toast.pro_coming_soon'), 'info');
        };
    }

    closeBtn.onclick = closeUsageLimitModal;
    modal.classList.add('active');
}

/**
 * Hides the usage limit modal.
 */
export function closeUsageLimitModal() {
    const modal = document.getElementById('usage-limit-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Updates the UI element that displays the number of remaining lookups.
 */
export function updateLookupCounterUI() {
    const counterEl = document.getElementById('lookup-counter');
    if (!counterEl) return;

    if (!State.isLoggedIn) {
        const guestLookups = parseInt(localStorage.getItem('vcanship_guest_lookups') || '2', 10);
        counterEl.textContent = t('lookup_counter.guest').replace('{count}', String(guestLookups));
        counterEl.style.display = 'block';
    } else if (State.subscriptionTier === 'free') {
        counterEl.textContent = t('lookup_counter.free').replace('{count}', String(State.aiLookupsRemaining));
        counterEl.style.display = 'block';
    } else {
        // Hide for Pro users or other cases
        counterEl.style.display = 'none';
    }
}
