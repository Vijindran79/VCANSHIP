/**
 * Mobile Navigation Drawer - Deliveroo-style slide-in menu
 * Replaces the FAB menu with a burger icon and slide-in drawer from the left
 */

import { mountService } from './router';
import { State } from './state';

let isDrawerOpen = false;
let isDragging = false;
let startX = 0;
let currentX = 0;

export function initMobileNav() {
    createMobileNavDrawer();
    setupBurgerButton();
    setupDrawerInteractions();
}

function createMobileNavDrawer() {
    // Create the slide-in drawer HTML
    const drawerHTML = `
        <div id="mobile-nav-drawer" class="mobile-nav-drawer">
            <div class="mobile-nav-header">
                <div class="mobile-nav-logo">
                    <strong>Vcan</strong><span>Ship</span>
                </div>
                <button id="close-drawer-btn" class="close-drawer-btn" aria-label="Close menu">
                    <i class="fa-solid fa-times"></i>
                </button>
            </div>
            
            <div class="mobile-nav-content">
                <div class="mobile-nav-section">
                    <h4 class="mobile-nav-section-title" data-i18n="mobile_menu.shipping_services">Shipping Services</h4>
                    <button class="mobile-nav-item" data-page="parcel">
                        <i class="fa-solid fa-box"></i>
                        <span data-i18n="sidebar.parcel">Send a Parcel</span>
                    </button>
                    <button class="mobile-nav-item" data-page="baggage">
                        <i class="fa-solid fa-suitcase-rolling"></i>
                        <span data-i18n="sidebar.baggage">Baggage Shipping</span>
                    </button>
                    <button class="mobile-nav-item" data-page="fcl">
                        <i class="fa-solid fa-ship"></i>
                        <span data-i18n="sidebar.fcl">FCL (Full Container)</span>
                    </button>
                    <button class="mobile-nav-item" data-page="lcl">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        <span data-i18n="sidebar.lcl">LCL (Less than Container)</span>
                    </button>
                    <button class="mobile-nav-item" data-page="airfreight">
                        <i class="fa-solid fa-plane"></i>
                        <span data-i18n="sidebar.airfreight">Air Freight</span>
                    </button>
                    <button class="mobile-nav-item" data-page="vehicle">
                        <i class="fa-solid fa-car"></i>
                        <span data-i18n="sidebar.vehicle">Vehicle Shipping</span>
                    </button>
                </div>
                
                <div class="mobile-nav-section">
                    <h4 class="mobile-nav-section-title" data-i18n="mobile_menu.specialized">Specialized Services</h4>
                    <button class="mobile-nav-item" data-page="railway">
                        <i class="fa-solid fa-train"></i>
                        <span data-i18n="sidebar.railway">Railway Transport</span>
                    </button>
                    <button class="mobile-nav-item" data-page="inland">
                        <i class="fa-solid fa-truck"></i>
                        <span data-i18n="sidebar.inland">Inland Transport</span>
                    </button>
                    <button class="mobile-nav-item" data-page="bulk">
                        <i class="fa-solid fa-industry"></i>
                        <span data-i18n="sidebar.bulk">Bulk Cargo</span>
                    </button>
                    <button class="mobile-nav-item" data-page="rivertug">
                        <i class="fa-solid fa-anchor"></i>
                        <span data-i18n="sidebar.rivertug">River \u0026 Tug Services</span>
                    </button>
                    <button class="mobile-nav-item" data-page="warehouse">
                        <i class="fa-solid fa-warehouse"></i>
                        <span data-i18n="sidebar.warehouse">Warehousing</span>
                    </button>
                </div>
                
                <div class="mobile-nav-section">
                    <h4 class="mobile-nav-section-title" data-i18n="mobile_menu.tools">Tools \u0026 Resources</h4>
                    <button class="mobile-nav-item" data-page="schedules">
                        <i class="fa-solid fa-calendar-days"></i>
                        <span data-i18n="sidebar.schedules">Shipping Schedules</span>
                    </button>
                    <button class="mobile-nav-item" data-page="ecommerce">
                        <i class="fa-solid fa-store"></i>
                        <span data-i18n="sidebar.ecommerce">E-commerce Integration</span>
                    </button>
                    <button class="mobile-nav-item" id="mobile-chat-btn">
                        <i class="fa-solid fa-comments"></i>
                        <span data-i18n="fab.chat">Chat with Us</span>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="mobile-nav-overlay" class="mobile-nav-overlay"></div>
    `;

    // Insert drawer into the page
    document.body.insertAdjacentHTML('beforeend', drawerHTML);
}

function setupBurgerButton() {
    // Create burger button (replaces FAB on mobile)
    const burgerHTML = `
        <button id="mobile-burger-btn" class="mobile-burger-btn" aria-label="Open menu">
            <i class="fa-solid fa-bars"></i>
        </button>
    `;

    // Insert burger button
    document.body.insertAdjacentHTML('beforeend', burgerHTML);

    // Add click listener
    const burgerBtn = document.getElementById('mobile-burger-btn');
    burgerBtn?.addEventListener('click', toggleDrawer);
}

function setupDrawerInteractions() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const overlay = document.getElementById('mobile-nav-overlay');
    const closeBtn = document.getElementById('close-drawer-btn');

    // Close button
    closeBtn?.addEventListener('click', closeDrawer);

    // Overlay click
    overlay?.addEventListener('click', closeDrawer);

    // Navigation items
    const navItems = document.querySelectorAll('.mobile-nav-item[data-page]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const page = (e.currentTarget as HTMLElement).getAttribute('data-page');
            if (page) {
                mountService(page as any);
                closeDrawer();
            }
        });
    });

    // Chat button
    const chatBtn = document.getElementById('mobile-chat-btn');
    chatBtn?.addEventListener('click', () => {
        const chatWindow = document.getElementById('chat-window');
        chatWindow?.classList.remove('hidden');
        closeDrawer();
    });

    // Swipe to close
    drawer?.addEventListener('touchstart', handleTouchStart, { passive: true });
    drawer?.addEventListener('touchmove', handleTouchMove, { passive: false });
    drawer?.addEventListener('touchend', handleTouchEnd);
}

function toggleDrawer() {
    if (isDrawerOpen) {
        closeDrawer();
    } else {
        openDrawer();
    }
}

function openDrawer() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const overlay = document.getElementById('mobile-nav-overlay');

    drawer?.classList.add('open');
    overlay?.classList.add('visible');
    document.body.style.overflow = 'hidden';
    isDrawerOpen = true;
}

function closeDrawer() {
    const drawer = document.getElementById('mobile-nav-drawer');
    const overlay = document.getElementById('mobile-nav-overlay');

    drawer?.classList.remove('open');
    overlay?.classList.remove('visible');
    document.body.style.overflow = '';
    isDrawerOpen = false;
}

// Touch swipe handlers
function handleTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX;
    isDragging = true;
}

function handleTouchMove(e: TouchEvent) {
    if (!isDragging) return;

    currentX = e.touches[0].clientX;
    const diff = currentX - startX;

    // Only allow swiping left to close
    if (diff < 0) {
        const drawer = document.getElementById('mobile-nav-drawer');
        if (drawer) {
            drawer.style.transform = `translateX(${diff}px)`;
        }
    }
}

function handleTouchEnd() {
    if (!isDragging) return;

    const diff = currentX - startX;
    const drawer = document.getElementById('mobile-nav-drawer');

    // If swiped more than 100px left, close the drawer
    if (diff < -100) {
        closeDrawer();
    }

    // Reset transform
    if (drawer) {
        drawer.style.transform = '';
    }

    isDragging = false;
    startX = 0;
    currentX = 0;
}

// Hide FAB on mobile, show burger instead
export function updateMobileNavVisibility() {
    const isMobile = window.innerWidth <= 768;
    const fab = document.getElementById('multi-fab-container');
    const burger = document.getElementById('mobile-burger-btn');

    if (isMobile) {
        fab?.classList.add('hidden');
        burger?.classList.remove('hidden');
    } else {
        fab?.classList.remove('hidden');
        burger?.classList.add('hidden');
    }
}

// Initialize on window resize
window.addEventListener('resize', updateMobileNavVisibility);
