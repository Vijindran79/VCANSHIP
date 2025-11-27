/**
 * Secure Trade Magic - Advanced UX Enhancements
 * Adds delightful micro-interactions and smooth animations
 */

export function initSecureTradeMagic() {
    // Initialize when secure trade page is active
    if (document.getElementById('page-secure-trade')) {
        setupMagicalInteractions();
        setupProgressBarAnimations();
        setupFormEnhancements();
        setupParticleEffects();
        setupSoundEffects();
    }
}

function setupMagicalInteractions() {
    // Add magical hover effects to buttons
    const buttons = document.querySelectorAll('#page-secure-trade .main-submit-btn, #page-secure-trade .secondary-btn');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', createRippleEffect);
        button.addEventListener('click', createClickEffect);
    });
    
    // Add floating animation to cards
    const cards = document.querySelectorAll('#page-secure-trade .service-step, #page-secure-trade .payment-overview');
    cards.forEach((card, index) => {
        (card as HTMLElement).style.animationDelay = `${index * 0.2}s`;
        card.classList.add('float-animation');
    });
    
    // Add typewriter effect to titles
    const titles = document.querySelectorAll('#page-secure-trade h2, #page-secure-trade h3');
    titles.forEach(title => {
        if (title.textContent) {
            createTypewriterEffect(title as HTMLElement, title.textContent);
        }
    });
}

function createRippleEffect(e: Event) {
    const button = e.target as HTMLElement;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        width: ${size}px;
        height: ${size}px;
        left: ${(e as MouseEvent).clientX - rect.left - size / 2}px;
        top: ${(e as MouseEvent).clientY - rect.top - size / 2}px;
        pointer-events: none;
    `;
    
    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function createClickEffect(e: Event) {
    const button = e.target as HTMLElement;
    
    // Create success particles
    for (let i = 0; i < 6; i++) {
        createParticle(button, i);
    }
    
    // Add button success animation
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

function createParticle(parent: HTMLElement, index: number) {
    const particle = document.createElement('div');
    const rect = parent.getBoundingClientRect();
    
    particle.style.cssText = `
        position: fixed;
        width: 6px;
        height: 6px;
        background: linear-gradient(45deg, #F97316, #FF6B35);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
    `;
    
    document.body.appendChild(particle);
    
    const angle = (index * 60) * (Math.PI / 180);
    const velocity = 100 + Math.random() * 50;
    const gravity = 0.5;
    let vx = Math.cos(angle) * velocity;
    let vy = Math.sin(angle) * velocity;
    let x = rect.left + rect.width / 2;
    let y = rect.top + rect.height / 2;
    
    function animateParticle() {
        x += vx * 0.016;
        y += vy * 0.016;
        vy += gravity;
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.opacity = String(Math.max(0, 1 - (Date.now() - startTime) / 1000));
        
        if (Date.now() - startTime < 1000) {
            requestAnimationFrame(animateParticle);
        } else {
            particle.remove();
        }
    }
    
    const startTime = Date.now();
    requestAnimationFrame(animateParticle);
}

function setupProgressBarAnimations() {
    const progressSteps = document.querySelectorAll('#page-secure-trade .progress-step');
    
    // Animate progress steps with staggered delays
    progressSteps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('animate-in');
        }, index * 200);
    });
    
    // Add click handlers for progress steps
    progressSteps.forEach((step, index) => {
        step.addEventListener('click', () => {
            createProgressRipple(step as HTMLElement);
        });
    });
}

function createProgressRipple(element: HTMLElement) {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(249, 115, 22, 0.3);
        transform: scale(0);
        animation: progressRipple 0.8s ease-out;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 800);
}

function setupFormEnhancements() {
    const inputs = document.querySelectorAll('#page-secure-trade input, #page-secure-trade textarea, #page-secure-trade select');
    
    inputs.forEach(input => {
        // Add floating label effect
        setupFloatingLabel(input as HTMLInputElement);
        
        // Add input validation animations
        input.addEventListener('blur', validateInput);
        input.addEventListener('input', clearValidationState);
        
        // Add focus animations
        input.addEventListener('focus', (e) => {
            const element = e.target as HTMLElement;
            element.style.transform = 'translateY(-2px)';
            createInputGlow(element);
        });
        
        input.addEventListener('blur', (e) => {
            const element = e.target as HTMLElement;
            element.style.transform = '';
        });
    });
}

function setupFloatingLabel(input: HTMLInputElement) {
    const wrapper = input.closest('.input-wrapper');
    if (!wrapper) return;
    
    const label = wrapper.querySelector('label');
    if (!label) return;
    
    // Create floating label
    const floatingLabel = document.createElement('span');
    floatingLabel.textContent = label.textContent;
    floatingLabel.className = 'floating-label';
    floatingLabel.style.cssText = `
        position: absolute;
        left: 1.5rem;
        top: 50%;
        transform: translateY(-50%);
        color: var(--medium-gray);
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: var(--background-color);
        padding: 0 0.5rem;
        font-size: 1rem;
        z-index: 1;
    `;
    
    (wrapper as HTMLElement).style.position = 'relative';
    wrapper.appendChild(floatingLabel);
    
    function updateFloatingLabel() {
        if (input.value || input === document.activeElement) {
            floatingLabel.style.top = '0';
            floatingLabel.style.fontSize = '0.875rem';
            floatingLabel.style.color = 'var(--primary-orange)';
        } else {
            floatingLabel.style.top = '50%';
            floatingLabel.style.fontSize = '1rem';
            floatingLabel.style.color = 'var(--medium-gray)';
        }
    }
    
    input.addEventListener('focus', updateFloatingLabel);
    input.addEventListener('blur', updateFloatingLabel);
    input.addEventListener('input', updateFloatingLabel);
    
    // Initial state
    updateFloatingLabel();
}

function validateInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const wrapper = input.closest('.input-wrapper');
    if (!wrapper) return;
    
    if (input.checkValidity()) {
        wrapper.classList.remove('has-error');
        wrapper.classList.add('has-success');
        createSuccessCheckmark(input);
    } else {
        wrapper.classList.remove('has-success');
        wrapper.classList.add('has-error');
        createErrorShake(input);
    }
}

function clearValidationState(e: Event) {
    const input = e.target as HTMLInputElement;
    const wrapper = input.closest('.input-wrapper');
    if (!wrapper) return;
    
    wrapper.classList.remove('has-error', 'has-success');
}

function createInputGlow(element: HTMLElement) {
    const glow = document.createElement('div');
    glow.style.cssText = `
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, var(--primary-orange), #FF6B35, var(--primary-orange));
        border-radius: 18px;
        z-index: -1;
        opacity: 0;
        animation: inputGlow 0.3s ease-out forwards;
    `;
    
    (element.parentElement as HTMLElement)!.style.position = 'relative';
    element.parentElement!.appendChild(glow);
    
    setTimeout(() => {
        glow.remove();
    }, 300);
}

function createSuccessCheckmark(input: HTMLInputElement) {
    const checkmark = document.createElement('div');
    checkmark.innerHTML = '✓';
    checkmark.style.cssText = `
        position: absolute;
        right: 1rem;
        top: 50%;
        transform: translateY(-50%) scale(0);
        color: var(--success-color);
        font-weight: bold;
        font-size: 1.2rem;
        animation: checkmarkPop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    `;
    
    (input.parentElement as HTMLElement)!.appendChild(checkmark);
    
    setTimeout(() => {
        checkmark.remove();
    }, 2000);
}

function createErrorShake(input: HTMLInputElement) {
    input.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        input.style.animation = '';
    }, 500);
}

function setupParticleEffects() {
    // Create floating particles in the background
    createFloatingParticles();
    
    // Add particle effects to successful actions
    document.addEventListener('secureTradeSuccess', createCelebrationParticles);
}

function createFloatingParticles() {
    const container = document.getElementById('page-secure-trade');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            createFloatingParticle(container);
        }, i * 500);
    }
}

function createFloatingParticle(container: HTMLElement) {
    const particle = document.createElement('div');
    particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: linear-gradient(45deg, var(--primary-orange), #FF6B35);
        border-radius: 50%;
        opacity: 0.6;
        pointer-events: none;
        z-index: 1;
    `;
    
    const startX = Math.random() * container.offsetWidth;
    const startY = container.offsetHeight + 10;
    const endY = -10;
    const drift = (Math.random() - 0.5) * 100;
    
    particle.style.left = startX + 'px';
    particle.style.top = startY + 'px';
    
    container.appendChild(particle);
    
    const animation = particle.animate([
        { 
            transform: `translate(0, 0) scale(1)`,
            opacity: 0.6 
        },
        { 
            transform: `translate(${drift}px, ${endY - startY}px) scale(0.5)`,
            opacity: 0 
        }
    ], {
        duration: 8000 + Math.random() * 4000,
        easing: 'linear'
    });
    
    animation.onfinish = () => {
        particle.remove();
        // Create a new particle to maintain the effect
        setTimeout(() => {
            createFloatingParticle(container);
        }, Math.random() * 2000);
    };
}

function createCelebrationParticles() {
    const colors = ['#F97316', '#FF6B35', '#10B981', '#3B82F6', '#8B5CF6'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
                left: 50%;
                top: 50%;
            `;
            
            document.body.appendChild(particle);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = 200 + Math.random() * 200;
            const gravity = 0.8;
            let vx = Math.cos(angle) * velocity;
            let vy = Math.sin(angle) * velocity;
            let x = window.innerWidth / 2;
            let y = window.innerHeight / 2;
            
            function animate() {
                x += vx * 0.016;
                y += vy * 0.016;
                vy += gravity;
                
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                particle.style.opacity = String(Math.max(0, 1 - (Date.now() - startTime) / 3000));
                
                if (Date.now() - startTime < 3000 && y < window.innerHeight + 100) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            }
            
            const startTime = Date.now();
            requestAnimationFrame(animate);
        }, i * 20);
    }
}

function createTypewriterEffect(element: HTMLElement, text: string) {
    element.textContent = '';
    let index = 0;
    
    function typeChar() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(typeChar, 50 + Math.random() * 50);
        }
    }
    
    // Start typing after a short delay
    setTimeout(typeChar, 500);
}

function setupSoundEffects() {
    // Create audio context for sound effects (optional)
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Success sound
        function playSuccessSound() {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        }
        
        // Add sound to successful actions
        document.addEventListener('secureTradeSuccess', playSuccessSound);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes progressRipple {
        to {
            transform: scale(2);
            opacity: 0;
        }
    }
    
    @keyframes inputGlow {
        to {
            opacity: 0.3;
        }
    }
    
    @keyframes checkmarkPop {
        to {
            transform: translateY(-50%) scale(1);
        }
    }
    
    @keyframes float-animation {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
    
    .float-animation {
        animation: float-animation 6s ease-in-out infinite;
    }
    
    .animate-in {
        animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

document.head.appendChild(style);

// Export for use in other modules
export { createCelebrationParticles };