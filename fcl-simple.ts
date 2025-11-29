import { t } from './i18n';
import { State, setState } from './state';
import { showToast, toggleLoading } from './ui';

// Simple FCL implementation that matches working services
export function startFcl() {
    setState({ currentService: 'fcl' });
    renderFclPage();
}

export function renderFclPage() {
    const page = document.getElementById('page-fcl');
    if (!page) {
        console.error('page-fcl element not found');
        return;
    }

    page.innerHTML = `
        <div class="fcl-premium-container">
            <!-- Hero Header with Gradient Background -->
            <div class="fcl-hero-header">
                <div class="fcl-hero-content">
                    <div class="fcl-hero-icon">
                        <div class="icon-wrapper">
                            <i class="fas fa-ship"></i>
                            <div class="icon-glow"></div>
                        </div>
                    </div>
                    <div class="fcl-hero-text">
                        <h1 class="fcl-title">
                            <span class="title-main">FCL Sea Freight</span>
                            <span class="title-badge">Premium Service</span>
                        </h1>
                        <p class="fcl-subtitle">Book exclusive container usage for large volume shipments with AI-powered compliance analysis</p>
                        <div class="fcl-features">
                            <span class="feature-tag"><i class="fas fa-shield-alt"></i> Secure</span>
                            <span class="feature-tag"><i class="fas fa-clock"></i> Fast</span>
                            <span class="feature-tag"><i class="fas fa-globe"></i> Global</span>
                        </div>
                    </div>
                </div>
                <div class="fcl-hero-decoration">
                    <div class="wave-pattern"></div>
                </div>
            </div>

            <!-- Progress Steps -->
            <div class="fcl-progress-container">
                <div class="progress-steps">
                    <div class="progress-step active">
                        <div class="step-circle">
                            <i class="fas fa-edit"></i>
                        </div>
                        <span class="step-label">Details</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step">
                        <div class="step-circle">
                            <i class="fas fa-calculator"></i>
                        </div>
                        <span class="step-label">Quote</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step">
                        <div class="step-circle">
                            <i class="fas fa-file-signature"></i>
                        </div>
                        <span class="step-label">Agreement</span>
                    </div>
                    <div class="progress-line"></div>
                    <div class="progress-step">
                        <div class="step-circle">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <span class="step-label">Confirm</span>
                    </div>
                </div>
            </div>

            <form id="fcl-form" class="fcl-premium-form">
                <!-- Service Type Selection with Cards -->
                <div class="fcl-form-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fas fa-route section-icon"></i>
                            Choose Your Service Type
                        </h3>
                        <p class="section-subtitle">Select the service that best fits your shipping needs</p>
                    </div>
                    
                    <div class="service-type-premium-grid">
                        <div class="service-card selected" data-service-type="port-to-port">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-anchor"></i>
                                </div>
                                <div class="card-badge">Most Popular</div>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">Port-to-Port</h4>
                                <p class="card-description">You handle transport to/from ports.</p>
                                <div class="card-features">
                                    <span class="feature-item"><i class="fas fa-dollar-sign"></i> Most economical</span>
                                    <span class="feature-item"><i class="fas fa-clock"></i> Standard timing</span>
                                </div>
                            </div>
                            <div class="card-selection-indicator">
                                <i class="fas fa-check-circle"></i>
                            </div>
                        </div>

                        <div class="service-card" data-service-type="door-to-port">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-home"></i>
                                </div>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">Door-to-Port</h4>
                                <p class="card-description">We pick up from your door.</p>
                                <div class="card-features">
                                    <span class="feature-item"><i class="fas fa-truck"></i> Pickup included</span>
                                    <span class="feature-item"><i class="fas fa-handshake"></i> Convenient</span>
                                </div>
                            </div>
                            <div class="card-selection-indicator">
                                <i class="fas fa-check-circle"></i>
                            </div>
                        </div>

                        <div class="service-card" data-service-type="port-to-door">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-truck"></i>
                                </div>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">Port-to-Door</h4>
                                <p class="card-description">We deliver to their door.</p>
                                <div class="card-features">
                                    <span class="feature-item"><i class="fas fa-shipping-fast"></i> Delivery included</span>
                                    <span class="feature-item"><i class="fas fa-map-marker-alt"></i> Door delivery</span>
                                </div>
                            </div>
                            <div class="card-selection-indicator">
                                <i class="fas fa-check-circle"></i>
                            </div>
                        </div>

                        <div class="service-card premium-card" data-service-type="door-to-door">
                            <div class="card-header">
                                <div class="card-icon">
                                    <i class="fas fa-handshake"></i>
                                </div>
                                <div class="card-badge premium">Premium</div>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">Door-to-Door</h4>
                                <p class="card-description">We handle the entire journey.</p>
                                <div class="card-features">
                                    <span class="feature-item"><i class="fas fa-crown"></i> Full service</span>
                                    <span class="feature-item"><i class="fas fa-shield-alt"></i> Complete care</span>
                                </div>
                            </div>
                            <div class="card-selection-indicator">
                                <i class="fas fa-check-circle"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Route Configuration with Modern Design -->
                <div class="fcl-form-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fas fa-map-marker-alt section-icon"></i>
                            Route Configuration
                        </h3>
                        <p class="section-subtitle">Define your shipping route with precision</p>
                    </div>
                    
                    <div class="route-premium-grid">
                        <div class="route-card origin-card">
                            <div class="route-card-header">
                                <div class="route-icon">
                                    <i class="fas fa-play-circle"></i>
                                </div>
                                <h4 class="route-title">Origin</h4>
                            </div>
                            <div class="premium-input-wrapper">
                                <label for="origin-port" class="premium-label">Port of Loading</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-anchor input-icon"></i>
                                    <input type="text" id="origin-port" class="premium-input" placeholder="e.g., Shanghai or CNSHA" required>
                                </div>
                                <small class="input-hint">Enter UN/LOCODE or port name</small>
                            </div>
                        </div>

                        <div class="route-arrow">
                            <div class="arrow-container">
                                <i class="fas fa-arrow-right"></i>
                                <div class="arrow-line"></div>
                            </div>
                        </div>

                        <div class="route-card destination-card">
                            <div class="route-card-header">
                                <div class="route-icon">
                                    <i class="fas fa-flag-checkered"></i>
                                </div>
                                <h4 class="route-title">Destination</h4>
                            </div>
                            <div class="premium-input-wrapper">
                                <label for="destination-port" class="premium-label">Port of Discharge</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-map-marker-alt input-icon"></i>
                                    <input type="text" id="destination-port" class="premium-input" placeholder="e.g., Los Angeles or USLAX" required>
                                </div>
                                <small class="input-hint">Enter UN/LOCODE or port name</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cargo & Container Details with Enhanced UI -->
                <div class="fcl-form-section">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fas fa-boxes-stacked section-icon"></i>
                            Cargo & Container Specifications
                        </h3>
                        <p class="section-subtitle">Provide detailed information about your cargo and container requirements</p>
                    </div>
                    
                    <div class="cargo-details-card">
                        <div class="premium-input-wrapper">
                            <label for="cargo-description" class="premium-label">
                                <i class="fas fa-clipboard-list"></i>
                                Cargo Description
                            </label>
                            <textarea id="cargo-description" class="premium-textarea" placeholder="e.g., 15 pallets of consumer electronics, smartphones and tablets for retail distribution" rows="4" required></textarea>
                            <small class="input-hint">Detailed description helps our AI suggest accurate compliance requirements</small>
                        </div>
                    </div>
                    
                    <div class="container-config-premium">
                        <h4 class="config-title">
                            <i class="fas fa-cube"></i>
                            Container Configuration
                        </h4>
                        <div class="container-grid">
                            <div class="premium-input-wrapper">
                                <label for="container-type" class="premium-label">Container Type</label>
                                <div class="select-wrapper">
                                    <select id="container-type" class="premium-select" required>
                                        <option value="20GP">20GP - 20ft General Purpose</option>
                                        <option value="40GP">40GP - 40ft General Purpose</option>
                                        <option value="40HC">40HC - 40ft High Cube</option>
                                    </select>
                                    <i class="fas fa-chevron-down select-arrow"></i>
                                </div>
                            </div>
                            
                            <div class="premium-input-wrapper">
                                <label for="quantity" class="premium-label">Quantity</label>
                                <div class="input-with-controls">
                                    <button type="button" class="quantity-btn minus" data-target="quantity">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <input type="number" id="quantity" class="premium-input quantity-input" value="1" min="1" max="50" required>
                                    <button type="button" class="quantity-btn plus" data-target="quantity">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="premium-input-wrapper">
                                <label for="weight" class="premium-label">Weight</label>
                                <div class="input-with-icon">
                                    <i class="fas fa-weight-hanging input-icon"></i>
                                    <input type="number" id="weight" class="premium-input" value="1000" min="1" step="0.1" required>
                                </div>
                            </div>
                            
                            <div class="premium-input-wrapper">
                                <label for="weight-unit" class="premium-label">Unit</label>
                                <div class="select-wrapper">
                                    <select id="weight-unit" class="premium-select" required>
                                        <option value="KG">KG - Kilograms</option>
                                        <option value="TON">TON - Metric Tons</option>
                                    </select>
                                    <i class="fas fa-chevron-down select-arrow"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Premium Submit Section -->
                <div class="fcl-submit-section">
                    <div class="submit-card">
                        <div class="submit-content">
                            <h4 class="submit-title">Ready to Get Your Quote?</h4>
                            <p class="submit-description">Our AI will analyze your requirements and provide instant compliance recommendations</p>
                            <div class="submit-features">
                                <span class="submit-feature"><i class="fas fa-robot"></i> AI-Powered Analysis</span>
                                <span class="submit-feature"><i class="fas fa-lightning-bolt"></i> Instant Results</span>
                                <span class="submit-feature"><i class="fas fa-shield-check"></i> Compliance Ready</span>
                            </div>
                        </div>
                        <button type="submit" class="fcl-premium-submit-btn">
                            <span class="btn-content">
                                <i class="fas fa-magic btn-icon"></i>
                                <span class="btn-text">Get AI-Powered Quote & Compliance</span>
                            </span>
                            <div class="btn-glow"></div>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    `;

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Service type selection with premium cards
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            
            // Remove selected class from all cards
            document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
            
            // Add selected class to clicked card
            target.classList.add('selected');
            
            // Add animation effect
            target.style.transform = 'scale(0.98)';
            setTimeout(() => {
                target.style.transform = 'scale(1)';
            }, 150);
        });

        // Add hover effects
        card.addEventListener('mouseenter', (e) => {
            const target = e.currentTarget as HTMLElement;
            if (!target.classList.contains('selected')) {
                target.style.transform = 'translateY(-5px)';
            }
        });

        card.addEventListener('mouseleave', (e) => {
            const target = e.currentTarget as HTMLElement;
            if (!target.classList.contains('selected')) {
                target.style.transform = 'translateY(0)';
            }
        });
    });

    // Quantity controls
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget as HTMLElement;
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId!) as HTMLInputElement;
            const isPlus = button.classList.contains('plus');
            
            let currentValue = parseInt(input.value) || 1;
            
            if (isPlus && currentValue < 50) {
                currentValue++;
            } else if (!isPlus && currentValue > 1) {
                currentValue--;
            }
            
            input.value = currentValue.toString();
            
            // Add button animation
            button.style.transform = 'scale(0.9)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 100);
        });
    });

    // Premium input focus effects
    document.querySelectorAll('.premium-input, .premium-textarea, .premium-select').forEach(input => {
        input.addEventListener('focus', (e) => {
            const target = e.currentTarget as HTMLElement;
            const wrapper = target.closest('.premium-input-wrapper');
            if (wrapper) {
                wrapper.classList.add('focused');
            }
        });

        input.addEventListener('blur', (e) => {
            const target = e.currentTarget as HTMLElement;
            const wrapper = target.closest('.premium-input-wrapper');
            if (wrapper) {
                wrapper.classList.remove('focused');
            }
        });
    });

    // Form submission with enhanced animation
    const form = document.getElementById('fcl-form');
    const submitBtn = document.querySelector('.fcl-premium-submit-btn') as HTMLElement;
    
    if (form && submitBtn) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Add loading animation
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = `
                <span class="btn-content">
                    <i class="fas fa-spinner fa-spin btn-icon"></i>
                    <span class="btn-text">Processing...</span>
                </span>
                <div class="btn-glow"></div>
            `;
            
            // Simulate processing
            setTimeout(() => {
                handleFormSubmit();
                
                // Reset button
                submitBtn.classList.remove('loading');
                submitBtn.innerHTML = `
                    <span class="btn-content">
                        <i class="fas fa-magic btn-icon"></i>
                        <span class="btn-text">Get AI-Powered Quote & Compliance</span>
                    </span>
                    <div class="btn-glow"></div>
                `;
            }, 2000);
        });

        // Submit button hover effects
        submitBtn.addEventListener('mouseenter', () => {
            submitBtn.style.transform = 'translateY(-2px)';
        });

        submitBtn.addEventListener('mouseleave', () => {
            submitBtn.style.transform = 'translateY(0)';
        });
    }
}

function handleFormSubmit() {
    showToast('FCL quote request submitted successfully!', 'success');
    console.log('FCL form submitted');
}