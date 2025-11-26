// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { mountService } from './router';
// FIX: Import 'showAuthModal' to handle login button clicks from the mobile menu.
import { switchPage, showToast, showPrelaunchModal, closePrelaunchModal, toggleLoading, showAuthModal } from './ui';
import { Page, Service, State, setState } from './state';
import { initializePaymentPage } from './payment';
import { initializeLocaleSwitcher } from './LocaleSwitcher';
import { initializeAuth, handleLogout, updateUIForAuthState, handleSignInWithEmailLink } from './auth';
import { initializeStaticPages, renderApiHubPage } from './static_pages';
import { initializeDashboard } from './dashboard';
import { initializeAccountPages }from './account';
import { initializeI18n, updateStaticUIText, t } from './i18n';
import { initializeSidebar, getAllServicesConfig } from './sidebar';
import { unmountPromotionBanner } from './promotions';
import { initializeSettings } from './settings';
import { makeDraggable } from './utils';
import { getChatbotResponse } from './api';

// --- Global state for chat ---
let conversationHistory: { role: 'user' | 'model', text: string }[] = [];

// --- Chat Window Helpers ---
function openChatWindow() {
    const chatWindow = document.getElementById('chat-window');
    const fabContainer = document.getElementById('multi-fab-container');
    const input = document.getElementById('chat-input') as HTMLInputElement;
    if (chatWindow && fabContainer && input) {
        chatWindow.classList.remove('hidden');
        fabContainer.classList.add('hidden');
        input.focus();
    }
}
function closeChatWindow() {
    const chatWindow = document.getElementById('chat-window');
    const fabContainer = document.getElementById('multi-fab-container');
    if (chatWindow && fabContainer) {
        chatWindow.classList.add('hidden');
        fabContainer.classList.remove('hidden');
    }
}

// --- Theme Management ---
function applyTheme(theme: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vcanship-theme', theme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('vcanship-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = (savedTheme || (prefersDark ? 'dark' : 'light')) as 'light' | 'dark';
    applyTheme(initialTheme);

    // Use event delegation on the body for theme switches in header AND mobile menu
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const themeSwitch = target.closest('.theme-switch');
        if (!themeSwitch) return;

        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        if (State.currentPage === 'api-hub') {
            renderApiHubPage(); // Re-render API hub to apply theme to Monaco editor
        }
    });
}

// --- Mobile Scroll Behavior for Header ---
function initializeHeaderScroll() {
    let lastScrollTop = 0;
    const delta = 5;
    const header = document.querySelector('header');

    window.addEventListener('scroll', () => {
        if (!header) return;
        if (window.innerWidth > 992) {
            header.classList.remove('header-hidden');
            return;
        }
        
        const scrollTop = window.scrollY;

        if (Math.abs(lastScrollTop - scrollTop) <= delta) return;

        if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight){
            header.classList.add('header-hidden');
        } else {
            if(scrollTop + window.innerHeight < document.documentElement.scrollHeight) {
                header.classList.remove('header-hidden');
            }
        }
        lastScrollTop = scrollTop;
    }, false);
}

// --- Mobile Menu & FAB ---
function populateMobileMenu() {
    const contentContainer = document.getElementById('mobile-menu-content');
    if (!contentContainer) return;
    
    const { isLoggedIn, currentUser } = State;
    const services = getAllServicesConfig();

    let authSectionHtml = '';
    if (isLoggedIn && currentUser) {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        authSectionHtml = `
            <div class="mobile-menu-user">
                <div class="user-avatar">${initials}</div>
                <span>${currentUser.name}</span>
            </div>
            <button class="mobile-menu-nav-item static-link" data-page="dashboard"><i class="fa-solid fa-table-columns"></i> ${t('mobile_menu.dashboard')}</button>
            <button class="mobile-menu-nav-item static-link" data-page="address-book"><i class="fa-solid fa-address-book"></i> ${t('mobile_menu.address_book')}</button>
            <button class="mobile-menu-nav-item static-link" data-page="settings"><i class="fa-solid fa-gear"></i> ${t('mobile_menu.account_settings')}</button>
        `;
    }

    const servicesHtml = services.map(s => `
        <button class="mobile-menu-nav-item sidebar-btn-service" data-service="${s.id}"><i class="${s.icon}"></i> ${s.name}</button>
    `).join('');
    
    const staticLinksHtml = `
        <button class="mobile-menu-nav-item static-link" data-page="api-hub"><i class="fa-solid fa-code"></i> ${t('sidebar.apiHub')}</button>
        <button class="mobile-menu-nav-item static-link" data-page="help"><i class="fa-solid fa-question-circle"></i> ${t('sidebar.helpCenter')}</button>
    `;

    let loginLogoutHtml = '';
    if (isLoggedIn) {
        loginLogoutHtml = `<button class="mobile-menu-nav-item" id="mobile-logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('mobile_menu.logout')}</button>`;
    } else {
        loginLogoutHtml = `<button class="mobile-menu-nav-item" id="mobile-login-btn"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${t('mobile_menu.login')}</button>`;
    }

    contentContainer.innerHTML = `
        <div class="mobile-menu-header">
            <a href="#" class="logo static-link" data-page="landing"><strong>Vcan</strong><span>Ship</span></a>
            <button class="header-icon-btn" id="close-mobile-menu-btn" aria-label="Close menu" data-i18n-aria="aria.close_menu">
                <i class="fa-solid fa-times"></i>
            </button>
        </div>
        <nav class="mobile-menu-nav">
            ${authSectionHtml}
            ${isLoggedIn ? '<div class="mobile-menu-divider"></div>' : ''}
            <h4 class="mobile-menu-section-title">${t('mobile_menu.services')}</h4>
            ${servicesHtml}
            <div class="mobile-menu-divider"></div>
            ${staticLinksHtml}
        </nav>
        <div class="mobile-menu-footer">
            ${loginLogoutHtml}
            <div class="mobile-menu-settings-group">
                <button id="settings-language-btn" class="header-icon-btn" aria-label="Change region and language" data-i18n-aria="aria.change_locale">
                    <i class="fa-solid fa-globe"></i>
                </button>
                <button class="header-icon-btn theme-switch" aria-label="Toggle theme" data-i18n-aria="aria.toggle_theme">
                    <i class="fas fa-moon"></i>
                    <i class="fas fa-sun"></i>
                </button>
            </div>
        </div>
    `;

    // Attach listeners for dynamically added elements that aren't handled by delegation
    document.getElementById('mobile-login-btn')?.addEventListener('click', showAuthModal);
    document.getElementById('mobile-logout-btn')?.addEventListener('click', handleLogout);
}

function initializeMultiFabAndMobileMenu() {
    const fabContainer = document.getElementById('multi-fab-container') as HTMLElement;
    const mainToggle = document.getElementById('main-fab-toggle') as HTMLButtonElement;
    const menuBtn = document.getElementById('fab-menu-btn') as HTMLButtonElement;
    const chatBtn = document.getElementById('fab-chat-btn') as HTMLButtonElement;
    const overlay = document.getElementById('mobile-menu-overlay');

    if (!fabContainer || !mainToggle || !menuBtn || !chatBtn || !overlay) return;

    makeDraggable(fabContainer, 'vcanship_fab_pos');

    mainToggle.addEventListener('click', () => {
        fabContainer.classList.toggle('active');
    });
    
    const openMenu = () => {
        populateMobileMenu(); // Re-populate every time to reflect auth state
        overlay.classList.add('active');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    menuBtn.addEventListener('click', () => {
        openMenu();
        fabContainer.classList.remove('active'); // Close FAB menu after action
    });
    
    chatBtn.addEventListener('click', () => {
        openChatWindow();
        fabContainer.classList.remove('active'); // Close FAB menu after action
    });

    const closeMenu = () => {
        overlay.classList.remove('active');
        overlay.addEventListener('transitionend', () => {
            if (!overlay.classList.contains('active')) {
                overlay.classList.add('hidden');
            }
        }, { once: true });
        document.body.style.overflow = '';
    };

    overlay.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#close-mobile-menu-btn')) {
            closeMenu();
        }
        // Don't close menu for language button - let LocaleSwitcher handle it
        if (target.closest('.static-link, .sidebar-btn-service, #mobile-login-btn, #mobile-logout-btn')) {
            closeMenu();
        }
        // Handle language button separately - open modal and close menu
        if (target.closest('#settings-language-btn')) {
            closeMenu();
            // The LocaleSwitcher will handle opening the modal via its own event listener
        }
    });
}


// --- Chatbot ---
function initializeChatbot() {
    const chatWindow = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat-btn');
    const form = document.getElementById('chat-form') as HTMLFormElement;
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const history = document.getElementById('chat-history');
    const suggestionsContainer = document.getElementById('chat-suggestions');

    if (!chatWindow || !closeBtn || !form || !history || !suggestionsContainer) return;

    closeBtn.addEventListener('click', closeChatWindow);
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        input.disabled = true;

        // Display user message
        const userMessageEl = document.createElement('div');
        userMessageEl.className = 'chat-message user-message';
        userMessageEl.textContent = message;
        history.appendChild(userMessageEl);
        
        conversationHistory.push({ role: 'user', text: message });
        
        // Hide suggestions
        suggestionsContainer.style.display = 'none';
        
        // Display thinking indicator
        const thinkingIndicator = document.createElement('div');
        thinkingIndicator.className = 'chat-message bot-message thinking-indicator';
        thinkingIndicator.innerHTML = `<span>${t('chatbot.thinking')}</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
        history.appendChild(thinkingIndicator);
        history.scrollTop = history.scrollHeight;
        
        try {
            const responseText = await getChatbotResponse(message, conversationHistory);
            
            conversationHistory.push({ role: 'model', text: responseText });

            const botMessageEl = document.createElement('div');
            botMessageEl.className = 'chat-message bot-message';
            botMessageEl.textContent = responseText;
            history.appendChild(botMessageEl);
        } catch (error) {
            console.error('Chatbot error:', error);
            const errorMessageEl = document.createElement('div');
            errorMessageEl.className = 'chat-message bot-message error';
            errorMessageEl.textContent = t('chatbot.error');
            history.appendChild(errorMessageEl);
        } finally {
            thinkingIndicator.remove();
            input.disabled = false;
            input.focus();
            history.scrollTop = history.scrollHeight;
        }
    });

    suggestionsContainer.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        if (target.classList.contains('suggestion-btn')) {
            input.value = target.textContent || '';
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
    });
}

// --- Main App Initialization ---
async function initializeApp() {
    // Check for magic link sign-in first
    const signedIn = await handleSignInWithEmailLink();
    if (signedIn) {
      // If sign-in was handled, wait a moment for auth state to propagate before initializing everything else
      // This avoids race conditions with UI updates.
      setTimeout(() => initializeCoreApp(), 500);
    } else {
      await initializeCoreApp();
    }
}

async function initializeCoreApp() {
    initializeTheme();
    initializeHeaderScroll();
    initializeAuth();
    
    // CRITICAL FIX: Await the initialization of i18n to ensure translations are loaded
    // before any other UI component tries to access them. This prevents race conditions.
    await initializeI18n();

    // Initialize locale switcher (language/currency/country selector)
    await initializeLocaleSwitcher();

    // Now that translations are ready, initialize the rest of the app.
    initializeStaticPages();
    initializeSidebar();
    initializeMultiFabAndMobileMenu(); // New consolidated FAB and menu handler
    initializeSettings(); // Keep for potential non-mobile settings functionality
    initializeDashboard();
    initializeAccountPages();
    initializePaymentPage();
    initializeChatbot();

    // Attach listeners to static links
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const staticLink = target.closest<HTMLElement>('.static-link');
        const serviceLink = target.closest<HTMLElement>('.sidebar-btn-service, .service-promo-card, .service-grid-item');

        if (staticLink?.dataset.page) {
            e.preventDefault();
            const page = staticLink.dataset.page as Page;
            if (page === State.currentPage) return;
            mountService(page);
        } else if (serviceLink?.dataset.service) {
             e.preventDefault();
            const service = serviceLink.dataset.service as Service;
            mountService(service);
        }
    });

    // Tracking modal trigger
    DOMElements.trackBtn.addEventListener('click', () => {
        DOMElements.trackingModal.classList.add('active');
    });
    DOMElements.closeTrackingModalBtn.addEventListener('click', () => {
        DOMElements.trackingModal.classList.remove('active');
    });
    DOMElements.trackingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const trackingId = DOMElements.trackingIdInput.value;
        showToast(t('toast.tracking_not_implemented').replace('{id}', trackingId), 'info');
        DOMElements.trackingModal.classList.remove('active');
    });

    // Inspector modal trigger
    const inspectorBtn = document.getElementById('compliance-btn');
    inspectorBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        DOMElements.inspectorModal.classList.add('active');
    });
    DOMElements.closeInspectorModalBtn.addEventListener('click', () => {
        DOMElements.inspectorModal.classList.remove('active');
    });
}

// --- App Start ---
initializeApp();