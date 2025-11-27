/**
 * Mobile UX Enhancements
 * Advanced mobile interaction patterns and performance optimizations
 */

// Viewport and device detection
let isMobile = false;
let isTablet = false;
let isTouch = false;
let viewportWidth = 0;
let viewportHeight = 0;

// Performance optimization variables
let resizeTimer: number;
let scrollTimer: number;
let lastScrollY = 0;

// Touch interaction variables
let touchStartY = 0;
let touchStartX = 0;
let isScrolling = false;

export function initMobileUXEnhancements() {
    detectDevice();
    setupViewportHandling();
    setupTouchEnhancements();
    setupPerformanceOptimizations();
    setupAccessibilityEnhancements();
    setupAdvancedInteractions();
}

function detectDevice() {
    const userAgent = navigator.userAgent.toLowerCase();
    const width = window.innerWidth;
    
    isMobile = width <= 768;
    isTablet = width > 768 && width <= 1024;
    isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Add device classes to body
    document.body.classList.toggle('is-mobile', isMobile);
    document.body.classList.toggle('is-tablet', isTablet);
    document.body.classList.toggle('is-touch', isTouch);
    document.body.classList.toggle('is-desktop', !isMobile && !isTablet);
    
    // iOS specific detection
    const isIOS = /ipad|iphone|ipod/.test(userAgent);
    document.body.classList.toggle('is-ios', isIOS);
    
    // Android specific detection
    const isAndroid = /android/.test(userAgent);
    document.body.classList.toggle('is-android', isAndroid);
}

function setupViewportHandling() {
    // Handle viewport changes
    function updateViewport() {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        
        // Update CSS custom properties
        document.documentElement.style.setProperty('--viewport-width', `${viewportWidth}px`);
        document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
        
        // Re-detect device type on resize
        const wasMobile = isMobile;
        detectDevice();
        
        // Trigger layout adjustments if device type changed
        if (wasMobile !== isMobile) {
            adjustLayoutForDevice();
        }
    }
    
    // Debounced resize handler
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(updateViewport, 150);
    });
    
    // Initial viewport setup
    updateViewport();
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(updateViewport, 100);
    });
}

function setupTouchEnhancements() {
    if (!isTouch) return;
    
    // Improve touch scrolling performance
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Add touch feedback to interactive elements
    const interactiveElements = document.querySelectorAll(
        'button, .service-type-btn, .option-card, .facility-card, .schedule-card, .main-submit-btn, .secondary-btn'
    );
    
    interactiveElements.forEach(element => {
        element.addEventListener('touchstart', addTouchFeedback, { passive: true });
        element.addEventListener('touchend', removeTouchFeedback, { passive: true });
        element.addEventListener('touchcancel', removeTouchFeedback, { passive: true });
    });
}

function handleTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    isScrolling = false;
}

function handleTouchMove(e: TouchEvent) {
    if (!touchStartY || !touchStartX) return;
    
    const touchY = e.touches[0].clientY;
    const touchX = e.touches[0].clientX;
    const diffY = touchStartY - touchY;
    const diffX = touchStartX - touchX;
    
    // Determine if user is scrolling
    if (Math.abs(diffY) > Math.abs(diffX)) {
        isScrolling = true;
    }
    
    // Prevent overscroll on iOS
    if (document.body.classList.contains('is-ios')) {
        const target = e.target as Element;
        const scrollableParent = findScrollableParent(target);
        
        if (!scrollableParent || scrollableParent === document.body) {
            if ((diffY > 0 && window.scrollY === 0) || 
                (diffY < 0 && window.scrollY >= document.body.scrollHeight - window.innerHeight)) {
                e.preventDefault();
            }
        }
    }
}

function handleTouchEnd() {
    touchStartY = 0;
    touchStartX = 0;
    isScrolling = false;
}

function addTouchFeedback(e: Event) {
    const element = e.target as HTMLElement;
    element.classList.add('touch-active');
}

function removeTouchFeedback(e: Event) {
    const element = e.target as HTMLElement;
    setTimeout(() => {
        element.classList.remove('touch-active');
    }, 150);
}

function findScrollableParent(element: Element): Element | null {
    if (!element || element === document.body) return null;
    
    const style = window.getComputedStyle(element);
    const overflowY = style.overflowY;
    
    if (overflowY === 'scroll' || overflowY === 'auto') {
        return element;
    }
    
    return findScrollableParent(element.parentElement);
}

function setupPerformanceOptimizations() {
    // Optimize scroll performance
    let ticking = false;
    
    function updateScrollPosition() {
        const scrollY = window.scrollY;
        const scrollDirection = scrollY > lastScrollY ? 'down' : 'up';
        
        document.body.classList.toggle('scrolling-down', scrollDirection === 'down');
        document.body.classList.toggle('scrolling-up', scrollDirection === 'up');
        
        lastScrollY = scrollY;
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateScrollPosition);
            ticking = true;
        }
    }, { passive: true });
    
    // Optimize image loading
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // Preload critical resources
    if (isMobile) {
        preloadCriticalResources();
    }
}

function preloadCriticalResources() {
    // Preload critical CSS for mobile
    const criticalCSS = [
        './main.css',
        './mobile-desktop-enhancements.css'
    ];
    
    criticalCSS.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
    });
}

function setupAccessibilityEnhancements() {
    // Enhanced focus management for mobile
    let focusedElement: HTMLElement | null = null;
    
    document.addEventListener('focusin', (e) => {
        focusedElement = e.target as HTMLElement;
        
        // Ensure focused element is visible on mobile
        if (isMobile && focusedElement) {
            setTimeout(() => {
                focusedElement?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    });
    
    // Improve keyboard navigation on mobile
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && isMobile) {
            document.body.classList.add('keyboard-navigation');
        }
    });
    
    document.addEventListener('touchstart', () => {
        document.body.classList.remove('keyboard-navigation');
    }, { passive: true });
    
    // Screen reader announcements for dynamic content
    setupScreenReaderAnnouncements();
}

function setupScreenReaderAnnouncements() {
    // Create announcement region
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    `;
    document.body.appendChild(announcer);
    
    // Export function for other modules to use
    (window as any).announceToScreenReader = (message: string) => {
        announcer.textContent = message;
        setTimeout(() => {
            announcer.textContent = '';
        }, 1000);
    };
}

function setupAdvancedInteractions() {
    // Smart form enhancements
    setupSmartForms();
    
    // Advanced modal handling
    setupAdvancedModals();
    
    // Gesture support
    if (isTouch) {
        setupGestureSupport();
    }
    
    // Progressive enhancement for animations
    setupProgressiveAnimations();
}

function setupSmartForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        // Auto-save form data on mobile
        if (isMobile) {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('input', debounce(() => {
                    saveFormData(form as HTMLFormElement);
                }, 500));
            });
        }
        
        // Enhanced validation feedback
        form.addEventListener('submit', (e) => {
            const invalidInputs = form.querySelectorAll(':invalid');
            if (invalidInputs.length > 0) {
                e.preventDefault();
                
                // Focus first invalid input and scroll to it
                const firstInvalid = invalidInputs[0] as HTMLElement;
                firstInvalid.focus();
                firstInvalid.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                
                // Announce error to screen readers
                if ((window as any).announceToScreenReader) {
                    (window as any).announceToScreenReader('Please correct the errors in the form');
                }
            }
        });
    });
}

function saveFormData(form: HTMLFormElement) {
    const formData = new FormData(form);
    const data: Record<string, string> = {};
    
    formData.forEach((value, key) => {
        data[key] = value.toString();
    });
    
    const formId = form.id || form.className || 'anonymous-form';
    localStorage.setItem(`form-data-${formId}`, JSON.stringify(data));
}

function setupAdvancedModals() {
    // Enhanced modal focus management
    const modals = document.querySelectorAll('.modal-overlay');
    
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal as HTMLElement);
            }
        });
        
        // Trap focus within modal
        modal.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModal(modal as HTMLElement);
            }
            
            if (e.key === 'Tab') {
                trapFocus(e, modal as HTMLElement);
            }
        });
    });
}

function closeModal(modal: HTMLElement) {
    modal.classList.remove('active');
    
    // Return focus to trigger element
    const trigger = document.querySelector('[data-modal-trigger]') as HTMLElement;
    if (trigger) {
        trigger.focus();
    }
}

function trapFocus(e: KeyboardEvent, container: HTMLElement) {
    const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    if (e.shiftKey) {
        if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        }
    } else {
        if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }
    }
}

function setupGestureSupport() {
    // Simple swipe detection for mobile
    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;
    
    document.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;
        
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const diffX = startX - endX;
        const diffY = startY - endY;
        const minSwipeDistance = 50;
        
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
            if (diffX > 0) {
                // Swipe left
                document.dispatchEvent(new CustomEvent('swipeleft'));
            } else {
                // Swipe right
                document.dispatchEvent(new CustomEvent('swiperight'));
            }
        }
    }
}

function setupProgressiveAnimations() {
    // Reduce animations on low-end devices
    const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                          (navigator as any).deviceMemory <= 2;
    
    if (isLowEndDevice) {
        document.body.classList.add('reduce-animations');
    }
    
    // Intersection Observer for scroll animations
    if ('IntersectionObserver' in window) {
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            animationObserver.observe(el);
        });
    }
}

function adjustLayoutForDevice() {
    // Adjust layout when device type changes (e.g., rotation)
    const event = new CustomEvent('deviceTypeChanged', {
        detail: { isMobile, isTablet, isTouch }
    });
    document.dispatchEvent(event);
}

// Utility functions
function debounce(func: Function, wait: number) {
    let timeout: number;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = window.setTimeout(later, wait);
    };
}

// Export for use in other modules
export {
    isMobile,
    isTablet,
    isTouch,
    viewportWidth,
    viewportHeight
};