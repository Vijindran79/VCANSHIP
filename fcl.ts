import { t } from './i18n';
import { State, setState } from './state';
import { showToast, toggleLoading, switchPage } from './ui';
import { checkAndDecrementLookup, getChatbotResponse } from './api';
import { MARKUP_CONFIG } from './pricing';

// --- TYPES ---
interface FclDetails {
    serviceType: 'port-to-port' | 'door-to-port' | 'port-to-door' | 'door-to-door';
    pickupType: 'address' | 'port';
    deliveryType: 'address' | 'port';
    pickupAddress: { name: string; country: string } | null;
    pickupPort: string | null;
    deliveryAddress: { name: string; country: string } | null;
    deliveryPort: string | null;
    containers: Array<{
        id: number;
        type: '20GP' | '40GP' | '40HC';
        quantity: number;
        weight: number;
        unit: 'KG' | 'TON';
    }>;
    cargoDescription: string;
    hsCode: string;
}

interface FclQuote {
    id: string;
    carrierName: string;
    baseCost: number;
    markup: number;
    totalCost: number;
    transitTime: string;
    route: string;
    breakdown: {
        oceanFreight: number;
        bunkerSurcharge: number;
        documentation: number;
        handling: number;
    };
}

interface ComplianceDocument {
    id: string;
    name: string;
    description: string;
    required: boolean;
    uploaded: boolean;
    category: 'customs' | 'shipping' | 'cargo' | 'regulatory';
}

// --- STATE ---
let currentView: 'form' | 'quote' | 'agreement' | 'confirmation' = 'form';
let currentStep: number = 1;
const totalSteps: number = 4;

let fclDetails: FclDetails = {
    serviceType: 'port-to-port',
    pickupType: 'port',
    deliveryType: 'port',
    pickupAddress: null,
    pickupPort: null,
    deliveryAddress: null,
    deliveryPort: null,
    containers: [],
    cargoDescription: '',
    hsCode: ''
};

let fclQuote: FclQuote | null = null;
let complianceDocuments: ComplianceDocument[] = [];
let digitalSignature: string = '';
let bookingId: string = '';

// --- MAIN RENDERING ---
function renderCurrentView() {
    const page = document.getElementById('page-fcl');
    if (!page) {
        console.error('page-fcl element not found');
        return;
    }

    // Clear and prepare page
    page.innerHTML = '';
    page.style.display = 'block';
    page.style.visibility = 'visible';
    page.style.opacity = '1';

    setTimeout(() => {
        switch (currentView) {
            case 'form':
                page.innerHTML = renderFormView();
                setupFormEventListeners();
                break;
            case 'quote':
                page.innerHTML = renderQuoteView();
                setupQuoteEventListeners();
                break;
            case 'agreement':
                page.innerHTML = renderAgreementView();
                setupAgreementEventListeners();
                break;
            case 'confirmation':
                page.innerHTML = renderConfirmationView();
                setupConfirmationEventListeners();
                break;
        }
        page.style.opacity = '1';
    }, 50);
}

// --- STEP 1: FORM VIEW ---
function renderFormView(): string {
    return `
        <div class="fcl-container">
            <div class="fcl-header">
                <div class="service-icon">
                    <i class="fas fa-ship"></i>
                </div>
                <div class="service-info">
                    <h1>FCL Sea Freight</h1>
                    <p>Book exclusive container usage for large volume shipments</p>
                </div>
            </div>

            <!-- Enhanced Progress Bar -->
            <div class="progress-container">
                <div class="progress-bar" data-step="${currentStep}">
                    ${Array.from({length: totalSteps}, (_, i) => `
                        <div class="progress-step ${i < currentStep ? 'completed' : i === currentStep - 1 ? 'active' : ''}">
                            <div class="step-number">${i + 1}</div>
                            <div class="step-content">
                                <div class="step-label">${getStepLabel(i + 1)}</div>
                                <div class="step-description">${getStepDescription(i + 1)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <form id="fcl-form" class="fcl-form">
                <!-- Service Type Selection -->
                <div class="form-section">
                    <h3><i class="fas fa-route"></i> Service Type</h3>
                    <div class="service-type-grid">
                        ${renderServiceTypeOptions()}
                    </div>
                </div>

                <!-- Route Configuration -->
                <div class="form-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Route Details</h3>
                    <div class="route-grid">
                        <div class="route-column">
                            <h4>Pickup</h4>
                            <div id="pickup-fields">
                                ${renderPickupFields()}
                            </div>
                        </div>
                        <div class="route-column">
                            <h4>Delivery</h4>
                            <div id="delivery-fields">
                                ${renderDeliveryFields()}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Container Configuration -->
                <div class="form-section">
                    <h3><i class="fas fa-boxes-stacked"></i> Container Configuration</h3>
                    <div id="container-list">
                        ${renderContainerList()}
                    </div>
                    <button type="button" id="add-container-btn" class="secondary-btn">
                        <i class="fas fa-plus"></i> Add Container
                    </button>
                </div>

                <!-- Cargo Description -->
                <div class="form-section">
                    <h3><i class="fas fa-clipboard-list"></i> Cargo Details</h3>
                    <div class="input-wrapper">
                        <label for="cargo-description">Cargo Description *</label>
                        <textarea 
                            id="cargo-description" 
                            placeholder="e.g., 15 pallets of consumer electronics, smartphones and tablets"
                            rows="3"
                            required
                        >${fclDetails.cargoDescription}</textarea>
                        <small>Detailed description helps our AI suggest accurate compliance requirements</small>
                    </div>
                    
                    <div class="input-wrapper">
                        <label for="hs-code">HS Code (Optional)</label>
                        <div class="hs-code-input">
                            <input 
                                type="text" 
                                id="hs-code" 
                                placeholder="e.g., 8517.12"
                                value="${fclDetails.hsCode}"
                            >
                            <button type="button" id="suggest-hs-btn" class="secondary-btn">
                                <i class="fas fa-magic"></i> AI Suggest
                            </button>
                        </div>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 2rem; padding: 1rem 0; display: flex; justify-content: center;">
                    <button type="submit" class="main-submit-btn" style="display: block !important; visibility: visible !important; opacity: 1 !important;">
                        <i class="fas fa-search"></i> Get AI-Powered Quote & Compliance Analysis
                    </button>
                </div>
            </form>
        </div>
    `;
}

function getStepLabel(step: number): string {
    switch (step) {
        case 1: return 'Shipment Details';
        case 2: return 'Quote & Compliance';
        case 3: return 'Agreement';
        case 4: return 'Confirmation';
        default: return '';
    }
}

function getStepDescription(step: number): string {
    switch (step) {
        case 1: return 'Enter your cargo and route information';
        case 2: return 'Get quotes and review compliance requirements';
        case 3: return 'Review terms and sign shipping agreement';
        case 4: return 'Booking confirmed and ready to ship';
        default: return '';
    }
}

function renderServiceTypeOptions(): string {
    const options = [
        { value: 'port-to-port', label: 'Port to Port', icon: 'fas fa-anchor', desc: 'Most economical option' },
        { value: 'door-to-port', label: 'Door to Port', icon: 'fas fa-home', desc: 'Pickup from your location' },
        { value: 'port-to-door', label: 'Port to Door', icon: 'fas fa-truck', desc: 'Delivery to destination' },
        { value: 'door-to-door', label: 'Door to Door', icon: 'fas fa-handshake', desc: 'Complete service' }
    ];

    return options.map(option => `
        <div class="service-type-option ${fclDetails.serviceType === option.value ? 'selected' : ''}" 
             data-service-type="${option.value}">
            <i class="${option.icon}"></i>
            <h4>${option.label}</h4>
            <p>${option.desc}</p>
        </div>
    `).join('');
}

function renderPickupFields(): string {
    if (fclDetails.pickupType === 'address') {
        return `
            <div class="input-wrapper">
                <label for="pickup-name">Company/Location Name *</label>
                <input type="text" id="pickup-name" value="${fclDetails.pickupAddress?.name || ''}" required>
            </div>
            <div class="input-wrapper">
                <label for="pickup-country">Country *</label>
                <select id="pickup-country" required>
                    <option value="">Select Country</option>
                    <option value="CN" ${fclDetails.pickupAddress?.country === 'CN' ? 'selected' : ''}>China</option>
                    <option value="US" ${fclDetails.pickupAddress?.country === 'US' ? 'selected' : ''}>United States</option>
                    <option value="DE" ${fclDetails.pickupAddress?.country === 'DE' ? 'selected' : ''}>Germany</option>
                    <option value="GB" ${fclDetails.pickupAddress?.country === 'GB' ? 'selected' : ''}>United Kingdom</option>
                    <option value="JP" ${fclDetails.pickupAddress?.country === 'JP' ? 'selected' : ''}>Japan</option>
                </select>
            </div>
        `;
    } else {
        return `
            <div class="input-wrapper">
                <label for="pickup-port">Port Code/Name *</label>
                <input 
                    type="text" 
                    id="pickup-port" 
                    placeholder="e.g., Shanghai / CNSHA"
                    value="${fclDetails.pickupPort || ''}"
                    required
                >
                <small>Enter UN/LOCODE or port name</small>
            </div>
        `;
    }
}

function renderDeliveryFields(): string {
    if (fclDetails.deliveryType === 'address') {
        return `
            <div class="input-wrapper">
                <label for="delivery-name">Company/Location Name *</label>
                <input type="text" id="delivery-name" value="${fclDetails.deliveryAddress?.name || ''}" required>
            </div>
            <div class="input-wrapper">
                <label for="delivery-country">Country *</label>
                <select id="delivery-country" required>
                    <option value="">Select Country</option>
                    <option value="CN" ${fclDetails.deliveryAddress?.country === 'CN' ? 'selected' : ''}>China</option>
                    <option value="US" ${fclDetails.deliveryAddress?.country === 'US' ? 'selected' : ''}>United States</option>
                    <option value="DE" ${fclDetails.deliveryAddress?.country === 'DE' ? 'selected' : ''}>Germany</option>
                    <option value="GB" ${fclDetails.deliveryAddress?.country === 'GB' ? 'selected' : ''}>United Kingdom</option>
                    <option value="JP" ${fclDetails.deliveryAddress?.country === 'JP' ? 'selected' : ''}>Japan</option>
                </select>
            </div>
        `;
    } else {
        return `
            <div class="input-wrapper">
                <label for="delivery-port">Port Code/Name *</label>
                <input 
                    type="text" 
                    id="delivery-port" 
                    placeholder="e.g., Los Angeles / USLAX"
                    value="${fclDetails.deliveryPort || ''}"
                    required
                >
                <small>Enter UN/LOCODE or port name</small>
            </div>
        `;
    }
}

function renderContainerList(): string {
    if (fclDetails.containers.length === 0) {
        return `
            <div class="empty-container-list">
                <i class="fas fa-boxes-stacked"></i>
                <p>No containers added yet. Click "Add Container" to start.</p>
            </div>
        `;
    }

    return fclDetails.containers.map(container => `
        <div class="container-row" data-container-id="${container.id}">
            <div class="container-field">
                <label>Container Type</label>
                <select class="container-type">
                    <option value="20GP" ${container.type === '20GP' ? 'selected' : ''}>20' GP (General Purpose)</option>
                    <option value="40GP" ${container.type === '40GP' ? 'selected' : ''}>40' GP (General Purpose)</option>
                    <option value="40HC" ${container.type === '40HC' ? 'selected' : ''}>40' HC (High Cube)</option>
                </select>
            </div>
            <div class="container-field">
                <label>Quantity</label>
                <input type="number" class="container-quantity" value="${container.quantity}" min="1" max="50">
            </div>
            <div class="container-field">
                <label>Weight</label>
                <input type="number" class="container-weight" value="${container.weight}" min="1" step="0.1">
            </div>
            <div class="container-field">
                <label>Unit</label>
                <select class="container-unit">
                    <option value="KG" ${container.unit === 'KG' ? 'selected' : ''}>KG</option>
                    <option value="TON" ${container.unit === 'TON' ? 'selected' : ''}>TON</option>
                </select>
            </div>
            <div class="container-actions">
                <button type="button" class="remove-container-btn" data-container-id="${container.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// --- STEP 2: QUOTE VIEW ---
function renderQuoteView(): string {
    if (!fclQuote) return '<div>Loading quote...</div>';

    return `
        <div class="fcl-container">
            <div class="fcl-header">
                <div class="service-icon">
                    <i class="fas fa-calculator"></i>
                </div>
                <div class="service-info">
                    <h1>AI-Generated Quote & Compliance Analysis</h1>
                    <p>Professional-grade analysis powered by Gemini AI</p>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-container">
                <div class="progress-bar">
                    ${Array.from({length: totalSteps}, (_, i) => `
                        <div class="progress-step ${i < 2 ? 'completed' : i === 1 ? 'active' : ''}">
                            <div class="step-number">${i + 1}</div>
                            <div class="step-label">${getStepLabel(i + 1)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="quote-results">
                <!-- Route Visualizer -->
                <div class="route-visualizer">
                    <h3><i class="fas fa-route"></i> Route Overview</h3>
                    <div class="route-display">
                        <div class="route-point origin">
                            <i class="fas fa-circle"></i>
                            <span>${getOriginDisplay()}</span>
                        </div>
                        <div class="route-line">
                            <i class="fas fa-ship"></i>
                            <span>${fclQuote.transitTime}</span>
                        </div>
                        <div class="route-point destination">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${getDestinationDisplay()}</span>
                        </div>
                    </div>
                </div>

                <div class="results-grid">
                    <!-- Quote Summary -->
                    <div class="quote-summary card">
                        <h3><i class="fas fa-dollar-sign"></i> Quote Summary</h3>
                        <div class="quote-details">
                            <div class="carrier-info">
                                <h4>${fclQuote.carrierName}</h4>
                                <p>Transit Time: ${fclQuote.transitTime}</p>
                            </div>
                            
                            <div class="cost-breakdown">
                                <div class="cost-item">
                                    <span>Ocean Freight</span>
                                    <span>$${fclQuote.breakdown.oceanFreight.toLocaleString()}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Bunker Surcharge</span>
                                    <span>$${fclQuote.breakdown.bunkerSurcharge.toLocaleString()}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Documentation</span>
                                    <span>$${fclQuote.breakdown.documentation.toLocaleString()}</span>
                                </div>
                                <div class="cost-item">
                                    <span>Handling</span>
                                    <span>$${fclQuote.breakdown.handling.toLocaleString()}</span>
                                </div>
                                <div class="cost-item total">
                                    <span>Total Cost</span>
                                    <span>$${fclQuote.totalCost.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Compliance Checklist -->
                    <div class="compliance-checklist card">
                        <h3><i class="fas fa-clipboard-check"></i> Required Documents</h3>
                        <p class="compliance-intro">Based on your cargo and route, these documents are required:</p>
                        
                        <div class="document-list">
                            ${complianceDocuments.map(doc => `
                                <div class="document-item ${doc.required ? 'required' : 'optional'}">
                                    <div class="document-info">
                                        <h4>${doc.name}</h4>
                                        <p>${doc.description}</p>
                                        <span class="document-category">${doc.category}</span>
                                    </div>
                                    <div class="document-status">
                                        ${doc.required ? '<span class="required-badge">Required</span>' : '<span class="optional-badge">Optional</span>'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="quote-actions">
                    <button type="button" id="back-to-form-btn" class="secondary-btn">
                        <i class="fas fa-arrow-left"></i> Modify Details
                    </button>
                    <button type="button" id="proceed-to-agreement-btn" class="main-submit-btn">
                        Proceed to Agreement <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- STEP 3: AGREEMENT VIEW ---
function renderAgreementView(): string {
    return `
        <div class="fcl-container">
            <div class="fcl-header">
                <div class="service-icon">
                    <i class="fas fa-file-signature"></i>
                </div>
                <div class="service-info">
                    <h1>Agreement & Digital Signature</h1>
                    <p>Review terms and provide digital signature</p>
                </div>
            </div>

            <!-- Progress Bar -->
            <div class="progress-container">
                <div class="progress-bar">
                    ${Array.from({length: totalSteps}, (_, i) => `
                        <div class="progress-step ${i < 3 ? 'completed' : i === 2 ? 'active' : ''}">
                            <div class="step-number">${i + 1}</div>
                            <div class="step-label">${getStepLabel(i + 1)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="agreement-content">
                <!-- Document Upload Section -->
                <div class="document-upload-section card">
                    <h3><i class="fas fa-upload"></i> Document Upload</h3>
                    <p>Upload the required documents identified in the compliance analysis:</p>
                    
                    <div class="upload-list">
                        ${complianceDocuments.filter(doc => doc.required).map(doc => `
                            <div class="upload-item">
                                <div class="upload-info">
                                    <h4>${doc.name}</h4>
                                    <p>${doc.description}</p>
                                </div>
                                <div class="upload-action">
                                    <input type="file" id="upload-${doc.id}" class="file-input" accept=".pdf,.jpg,.png,.doc,.docx">
                                    <label for="upload-${doc.id}" class="upload-btn">
                                        <i class="fas fa-cloud-upload-alt"></i> Choose File
                                    </label>
                                    <span class="upload-status" id="status-${doc.id}">No file selected</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Terms Agreement -->
                <div class="terms-agreement card">
                    <h3><i class="fas fa-gavel"></i> Booking Terms</h3>
                    <div class="terms-content">
                        <p><strong>Shipment Summary:</strong></p>
                        <ul>
                            <li>Route: ${getOriginDisplay()} → ${getDestinationDisplay()}</li>
                            <li>Service: ${fclDetails.serviceType.replace('-', ' to ').toUpperCase()}</li>
                            <li>Containers: ${fclDetails.containers.length} container(s)</li>
                            <li>Total Cost: $${fclQuote?.totalCost.toLocaleString()}</li>
                            <li>Carrier: ${fclQuote?.carrierName}</li>
                        </ul>
                        
                        <div class="terms-text">
                            <p>By proceeding with this booking, you acknowledge and agree to:</p>
                            <ul>
                                <li>The quoted rates and transit times are estimates and subject to carrier confirmation</li>
                                <li>All required documentation must be provided before shipment</li>
                                <li>Cargo must be properly packed and comply with international shipping regulations</li>
                                <li>Payment terms and conditions as outlined in our service agreement</li>
                                <li>Liability limitations as per international shipping conventions</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Digital Signature -->
                <div class="digital-signature card">
                    <h3><i class="fas fa-signature"></i> Digital Signature</h3>
                    <p>Please provide your digital signature to confirm this booking:</p>
                    
                    <div class="signature-area">
                        <canvas id="signature-canvas" width="500" height="200"></canvas>
                        <div class="signature-controls">
                            <button type="button" id="clear-signature-btn" class="secondary-btn">
                                <i class="fas fa-eraser"></i> Clear
                            </button>
                        </div>
                    </div>
                    
                    <div class="signature-name">
                        <label for="signatory-name">Full Name *</label>
                        <input type="text" id="signatory-name" placeholder="Enter your full name" required>
                    </div>
                </div>

                <!-- Compliance Acknowledgment -->
                <div class="compliance-acknowledgment">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" id="compliance-checkbox" required>
                        <span class="checkmark"></span>
                        I acknowledge that I understand and will fulfill all compliance requirements identified in the analysis above.
                    </label>
                </div>

                <div class="agreement-actions">
                    <button type="button" id="back-to-quote-btn" class="secondary-btn">
                        <i class="fas fa-arrow-left"></i> Back to Quote
                    </button>
                    <button type="button" id="confirm-booking-btn" class="main-submit-btn" disabled>
                        <i class="fas fa-check"></i> Confirm Booking
                    </button>
                </div>
            </div>
        </div>
    `;
}

// --- STEP 4: CONFIRMATION VIEW ---
function renderConfirmationView(): string {
    return `
        <div class="fcl-container">
            <div class="confirmation-success">
                <div class="success-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h1>Booking Confirmed!</h1>
                <p>Your FCL shipment has been successfully booked</p>
            </div>

            <div class="booking-details card">
                <h3><i class="fas fa-receipt"></i> Booking Details</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="label">Booking ID:</span>
                        <span class="value booking-id">${bookingId}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Route:</span>
                        <span class="value">${getOriginDisplay()} → ${getDestinationDisplay()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Service Type:</span>
                        <span class="value">${fclDetails.serviceType.replace('-', ' to ').toUpperCase()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Carrier:</span>
                        <span class="value">${fclQuote?.carrierName}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Total Cost:</span>
                        <span class="value">$${fclQuote?.totalCost.toLocaleString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Transit Time:</span>
                        <span class="value">${fclQuote?.transitTime}</span>
                    </div>
                </div>
            </div>

            <div class="next-steps card">
                <h3><i class="fas fa-list-check"></i> Next Steps</h3>
                <ol>
                    <li>You will receive a booking confirmation email within 24 hours</li>
                    <li>Our operations team will contact you to arrange pickup/delivery</li>
                    <li>Ensure all required documents are ready for customs clearance</li>
                    <li>Track your shipment using the booking ID provided above</li>
                </ol>
            </div>

            <div class="confirmation-actions">
                <button type="button" id="download-pdf-btn" class="main-submit-btn">
                    <i class="fas fa-download"></i> Download PDF Summary
                </button>
                <button type="button" id="new-shipment-btn" class="secondary-btn">
                    <i class="fas fa-plus"></i> Book Another Shipment
                </button>
            </div>
        </div>
    `;
}

// --- EVENT LISTENERS ---
function setupFormEventListeners() {
    // Service type selection
    document.querySelectorAll('.service-type-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const serviceType = target.dataset.serviceType as FclDetails['serviceType'];
            
            // Update selection
            document.querySelectorAll('.service-type-option').forEach(opt => opt.classList.remove('selected'));
            target.classList.add('selected');
            
            // Update state and UI
            fclDetails.serviceType = serviceType;
            updatePickupDeliveryTypes();
            updateRouteFields();
        });
    });

    // Container management
    document.getElementById('add-container-btn')?.addEventListener('click', addContainer);
    
    // HS Code suggestion
    document.getElementById('suggest-hs-btn')?.addEventListener('click', suggestHSCode);
    
    // Form submission
    document.getElementById('fcl-form')?.addEventListener('submit', handleFormSubmit);
}

function setupQuoteEventListeners() {
    document.getElementById('back-to-form-btn')?.addEventListener('click', () => {
        currentView = 'form';
        renderCurrentView();
    });
    
    document.getElementById('proceed-to-agreement-btn')?.addEventListener('click', () => {
        currentView = 'agreement';
        renderCurrentView();
    });
}

function setupAgreementEventListeners() {
    // File uploads
    complianceDocuments.forEach(doc => {
        const fileInput = document.getElementById(`upload-${doc.id}`) as HTMLInputElement;
        fileInput?.addEventListener('change', (e) => handleFileUpload(e, doc.id));
    });

    // Digital signature canvas
    setupSignatureCanvas();
    
    // Clear signature
    document.getElementById('clear-signature-btn')?.addEventListener('click', clearSignature);
    
    // Validation
    document.getElementById('compliance-checkbox')?.addEventListener('change', validateAgreement);
    document.getElementById('signatory-name')?.addEventListener('input', validateAgreement);
    
    // Navigation
    document.getElementById('back-to-quote-btn')?.addEventListener('click', () => {
        currentView = 'quote';
        renderCurrentView();
    });
    
    document.getElementById('confirm-booking-btn')?.addEventListener('click', confirmBooking);
}

function setupConfirmationEventListeners() {
    document.getElementById('download-pdf-btn')?.addEventListener('click', generatePDF);
    document.getElementById('new-shipment-btn')?.addEventListener('click', startNewShipment);
}

// --- HELPER FUNCTIONS ---
function updatePickupDeliveryTypes() {
    const serviceType = fclDetails.serviceType;
    fclDetails.pickupType = serviceType.startsWith('door') ? 'address' : 'port';
    fclDetails.deliveryType = serviceType.endsWith('door') ? 'address' : 'port';
}

function updateRouteFields() {
    const pickupFields = document.getElementById('pickup-fields');
    const deliveryFields = document.getElementById('delivery-fields');
    
    if (pickupFields) pickupFields.innerHTML = renderPickupFields();
    if (deliveryFields) deliveryFields.innerHTML = renderDeliveryFields();
}

function addContainer() {
    const newContainer = {
        id: Date.now(),
        type: '20GP' as const,
        quantity: 1,
        weight: 1000,
        unit: 'KG' as const
    };
    
    fclDetails.containers.push(newContainer);
    
    const containerList = document.getElementById('container-list');
    if (containerList) {
        containerList.innerHTML = renderContainerList();
        setupContainerEventListeners();
    }
}

function setupContainerEventListeners() {
    // Remove container buttons
    document.querySelectorAll('.remove-container-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const containerId = parseInt(target.dataset.containerId || '0');
            fclDetails.containers = fclDetails.containers.filter(c => c.id !== containerId);
            
            const containerList = document.getElementById('container-list');
            if (containerList) {
                containerList.innerHTML = renderContainerList();
                setupContainerEventListeners();
            }
        });
    });
    
    // Container field updates
    document.querySelectorAll('.container-row').forEach(row => {
        const containerId = parseInt(row.getAttribute('data-container-id') || '0');
        const container = fclDetails.containers.find(c => c.id === containerId);
        if (!container) return;
        
        const typeSelect = row.querySelector('.container-type') as HTMLSelectElement;
        const quantityInput = row.querySelector('.container-quantity') as HTMLInputElement;
        const weightInput = row.querySelector('.container-weight') as HTMLInputElement;
        const unitSelect = row.querySelector('.container-unit') as HTMLSelectElement;
        
        typeSelect?.addEventListener('change', () => {
            container.type = typeSelect.value as any;
        });
        
        quantityInput?.addEventListener('change', () => {
            container.quantity = parseInt(quantityInput.value) || 1;
        });
        
        weightInput?.addEventListener('change', () => {
            container.weight = parseFloat(weightInput.value) || 1;
        });
        
        unitSelect?.addEventListener('change', () => {
            container.unit = unitSelect.value as any;
        });
    });
}

async function suggestHSCode() {
    const cargoDescription = (document.getElementById('cargo-description') as HTMLInputElement)?.value;
    if (!cargoDescription.trim()) {
        showToast('Please enter a cargo description first', 'error');
        return;
    }
    
    try {
        toggleLoading(true, 'Getting HS Code suggestions...');
        
        const canProceed = await checkAndDecrementLookup();
        if (!canProceed) {
            showToast('API usage limit reached. Please try again later.', 'error');
            return;
        }
        
        const prompt = `As a customs and trade expert, suggest the most appropriate HS Code for this cargo: "${cargoDescription}".
        Respond with just the HS code (6-8 digits) and a brief explanation. Format: "HS Code: XXXXXX - Brief description"`;
        
        const response = await getChatbotResponse(prompt, []);
        const hsCodeMatch = response.match(/HS Code:\s*(\d{4,8})/i);
        
        if (hsCodeMatch) {
            const hsCodeInput = document.getElementById('hs-code') as HTMLInputElement;
            if (hsCodeInput) {
                hsCodeInput.value = hsCodeMatch[1];
                fclDetails.hsCode = hsCodeMatch[1];
            }
            showToast('HS Code suggestion applied', 'success');
        } else {
            showToast('Could not determine HS Code. Please enter manually.', 'info');
        }
    } catch (error) {
        console.error('HS Code suggestion error:', error);
        showToast('Failed to get HS Code suggestion', 'error');
    } finally {
        toggleLoading(false);
    }
}

async function handleFormSubmit(e: Event) {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;
    
    // Save form data
    saveFormData();
    
    // Generate quote and compliance analysis
    await generateQuoteAndCompliance();
}

function validateForm(): boolean {
    // Check containers
    if (fclDetails.containers.length === 0) {
        showToast('Please add at least one container', 'error');
        return false;
    }
    
    // Check cargo description
    const cargoDescription = (document.getElementById('cargo-description') as HTMLInputElement)?.value;
    if (!cargoDescription.trim()) {
        showToast('Please enter a cargo description', 'error');
        return false;
    }
    
    // Check route fields
    if (fclDetails.pickupType === 'port' && !fclDetails.pickupPort) {
        showToast('Please enter pickup port', 'error');
        return false;
    }
    
    if (fclDetails.deliveryType === 'port' && !fclDetails.deliveryPort) {
        showToast('Please enter delivery port', 'error');
        return false;
    }
    
    return true;
}

function saveFormData() {
    // Save cargo description
    const cargoDescription = (document.getElementById('cargo-description') as HTMLInputElement)?.value;
    fclDetails.cargoDescription = cargoDescription || '';
    
    // Save HS code
    const hsCode = (document.getElementById('hs-code') as HTMLInputElement)?.value;
    fclDetails.hsCode = hsCode || '';
    
    // Save route data based on current form state
    if (fclDetails.pickupType === 'address') {
        const name = (document.getElementById('pickup-name') as HTMLInputElement)?.value;
        const country = (document.getElementById('pickup-country') as HTMLSelectElement)?.value;
        fclDetails.pickupAddress = { name: name || '', country: country || '' };
        fclDetails.pickupPort = null;
    } else {
        const port = (document.getElementById('pickup-port') as HTMLInputElement)?.value;
        fclDetails.pickupPort = port || '';
        fclDetails.pickupAddress = null;
    }
    
    if (fclDetails.deliveryType === 'address') {
        const name = (document.getElementById('delivery-name') as HTMLInputElement)?.value;
        const country = (document.getElementById('delivery-country') as HTMLSelectElement)?.value;
        fclDetails.deliveryAddress = { name: name || '', country: country || '' };
        fclDetails.deliveryPort = null;
    } else {
        const port = (document.getElementById('delivery-port') as HTMLInputElement)?.value;
        fclDetails.deliveryPort = port || '';
        fclDetails.deliveryAddress = null;
    }
}

async function generateQuoteAndCompliance() {
    try {
        toggleLoading(true, 'Analyzing your FCL shipment with AI...');
        
        const canProceed = await checkAndDecrementLookup();
        if (!canProceed) {
            showToast('API usage limit reached. Please try again later.', 'error');
            return;
        }
        
        const prompt = `As a global logistics and compliance expert, analyze this FCL shipment and provide a JSON response:

SHIPMENT DETAILS:
- Service Type: ${fclDetails.serviceType}
- Route: ${getOriginDisplay()} to ${getDestinationDisplay()}
- Containers: ${fclDetails.containers.map(c => `${c.quantity}x ${c.type} (${c.weight}${c.unit})`).join(', ')}
- Cargo: ${fclDetails.cargoDescription}
- HS Code: ${fclDetails.hsCode || 'Not specified'}

Provide a JSON response with this exact structure:
{
  "quote": {
    "carrierName": "Major carrier name",
    "baseCost": number,
    "totalCost": number (with 12% markup),
    "transitTime": "X-Y days",
    "breakdown": {
      "oceanFreight": number,
      "bunkerSurcharge": number,
      "documentation": number,
      "handling": number
    }
  },
  "complianceReport": [
    {
      "id": "unique-id",
      "name": "Document name",
      "description": "Why this document is needed",
      "required": true/false,
      "category": "customs|shipping|cargo|regulatory"
    }
  ]
}

Generate realistic pricing and identify ALL required documents based on the cargo type and route.`;

        const response = await getChatbotResponse(prompt, []);
        const aiData = parseAIResponse(response);
        
        if (aiData) {
            fclQuote = aiData.quote;
            complianceDocuments = aiData.complianceReport;
            
            // Update state
            setState({ fclQuote: fclQuote as any });
            
            // Move to quote view
            currentView = 'quote';
            renderCurrentView();
            
            showToast('Quote and compliance analysis generated successfully!', 'success');
        } else {
            throw new Error('Invalid AI response format');
        }
        
    } catch (error) {
        console.error('Quote generation error:', error);
        showToast('Failed to generate quote. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

function parseAIResponse(response: string): { quote: FclQuote; complianceReport: ComplianceDocument[] } | null {
    try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        
        const data = JSON.parse(jsonMatch[0]);
        
        // Create quote object
        const quote: FclQuote = {
            id: `FCL-${Date.now()}`,
            carrierName: data.quote.carrierName,
            baseCost: data.quote.baseCost,
            markup: Math.round(data.quote.baseCost * MARKUP_CONFIG.fcl.standard),
            totalCost: data.quote.totalCost,
            transitTime: data.quote.transitTime,
            route: `${getOriginDisplay()} → ${getDestinationDisplay()}`,
            breakdown: data.quote.breakdown
        };
        
        return {
            quote,
            complianceReport: data.complianceReport
        };
    } catch (error) {
        console.error('Failed to parse AI response:', error);
        return null;
    }
}

function getOriginDisplay(): string {
    if (fclDetails.pickupType === 'address' && fclDetails.pickupAddress) {
        return `${fclDetails.pickupAddress.name}, ${fclDetails.pickupAddress.country}`;
    } else if (fclDetails.pickupPort) {
        return fclDetails.pickupPort;
    }
    return 'Origin';
}

function getDestinationDisplay(): string {
    if (fclDetails.deliveryType === 'address' && fclDetails.deliveryAddress) {
        return `${fclDetails.deliveryAddress.name}, ${fclDetails.deliveryAddress.country}`;
    } else if (fclDetails.deliveryPort) {
        return fclDetails.deliveryPort;
    }
    return 'Destination';
}

function handleFileUpload(e: Event, docId: string) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const statusElement = document.getElementById(`status-${docId}`);
    
    if (file && statusElement) {
        statusElement.textContent = file.name;
        statusElement.style.color = 'var(--success-color)';
        
        // Mark document as uploaded
        const doc = complianceDocuments.find(d => d.id === docId);
        if (doc) {
            doc.uploaded = true;
        }
        
        validateAgreement();
    }
}

let signatureCanvas: HTMLCanvasElement;
let signatureContext: CanvasRenderingContext2D;
let isDrawing = false;

function setupSignatureCanvas() {
    signatureCanvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
    if (!signatureCanvas) return;
    
    signatureContext = signatureCanvas.getContext('2d')!;
    signatureContext.strokeStyle = '#000';
    signatureContext.lineWidth = 2;
    signatureContext.lineCap = 'round';
    
    // Mouse events
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    signatureCanvas.addEventListener('touchstart', handleTouch);
    signatureCanvas.addEventListener('touchmove', handleTouch);
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e: MouseEvent) {
    isDrawing = true;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureContext.beginPath();
    signatureContext.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e: MouseEvent) {
    if (!isDrawing) return;
    
    const rect = signatureCanvas.getBoundingClientRect();
    signatureContext.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    signatureContext.stroke();
    
    validateAgreement();
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e: TouchEvent) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' :
                                     e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}

function clearSignature() {
    if (signatureContext && signatureCanvas) {
        signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
        validateAgreement();
    }
}

function validateAgreement() {
    const complianceCheckbox = document.getElementById('compliance-checkbox') as HTMLInputElement;
    const signatoryName = document.getElementById('signatory-name') as HTMLInputElement;
    const confirmBtn = document.getElementById('confirm-booking-btn') as HTMLButtonElement;
    
    if (!complianceCheckbox || !signatoryName || !confirmBtn) return;
    
    // Check if signature canvas has content
    const hasSignature = signatureCanvas && !isCanvasEmpty(signatureCanvas);
    
    // Check all required documents are uploaded
    const allRequiredUploaded = complianceDocuments
        .filter(doc => doc.required)
        .every(doc => doc.uploaded);
    
    const isValid = complianceCheckbox.checked &&
                   signatoryName.value.trim() &&
                   hasSignature &&
                   allRequiredUploaded;
    
    confirmBtn.disabled = !isValid;
}

function isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
    const context = canvas.getContext('2d')!;
    const pixelBuffer = new Uint32Array(
        context.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
}

async function confirmBooking() {
    try {
        toggleLoading(true, 'Confirming your booking...');
        
        // Generate booking ID
        bookingId = `FCL-${Date.now()}`;
        
        // Save signature
        digitalSignature = signatureCanvas.toDataURL();
        
        // Simulate booking process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Move to confirmation view
        currentView = 'confirmation';
        renderCurrentView();
        
        showToast('Booking confirmed successfully!', 'success');
        
    } catch (error) {
        console.error('Booking confirmation error:', error);
        showToast('Failed to confirm booking. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

function generatePDF() {
    try {
        // Import jsPDF dynamically
        import('jspdf').then(({ jsPDF }) => {
            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(20);
            doc.text('FCL Booking Confirmation', 20, 30);
            
            // Booking details
            doc.setFontSize(12);
            doc.text(`Booking ID: ${bookingId}`, 20, 50);
            doc.text(`Route: ${getOriginDisplay()} → ${getDestinationDisplay()}`, 20, 60);
            doc.text(`Service: ${fclDetails.serviceType.replace('-', ' to ').toUpperCase()}`, 20, 70);
            doc.text(`Carrier: ${fclQuote?.carrierName}`, 20, 80);
            doc.text(`Total Cost: $${fclQuote?.totalCost.toLocaleString()}`, 20, 90);
            doc.text(`Transit Time: ${fclQuote?.transitTime}`, 20, 100);
            
            // Container details
            doc.text('Containers:', 20, 120);
            fclDetails.containers.forEach((container, index) => {
                doc.text(`${index + 1}. ${container.quantity}x ${container.type} (${container.weight}${container.unit})`, 30, 130 + (index * 10));
            });
            
            // Compliance documents
            doc.text('Required Documents:', 20, 160);
            complianceDocuments.filter(doc => doc.required).forEach((docItem, index) => {
                doc.text(`${index + 1}. ${docItem.name}`, 30, 170 + (index * 10));
            });
            
            // Save PDF
            doc.save(`FCL-Booking-${bookingId}.pdf`);
            showToast('PDF downloaded successfully!', 'success');
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        showToast('Failed to generate PDF', 'error');
    }
}

function startNewShipment() {
    // Reset all state
    currentView = 'form';
    currentStep = 1;
    fclDetails = {
        serviceType: 'port-to-port',
        pickupType: 'port',
        deliveryType: 'port',
        pickupAddress: null,
        pickupPort: null,
        deliveryAddress: null,
        deliveryPort: null,
        containers: [],
        cargoDescription: '',
        hsCode: ''
    };
    fclQuote = null;
    complianceDocuments = [];
    digitalSignature = '';
    bookingId = '';
    
    renderCurrentView();
}

// --- INITIALIZATION ---
export function startFcl() {
    setState({ currentService: 'fcl' });
    
    // Check if returning from payment
    const confirmationData = sessionStorage.getItem('vcanship_show_confirmation');
    if (confirmationData) {
        try {
            const data = JSON.parse(confirmationData);
            if (data.service === 'fcl') {
                // Restore state for confirmation view
                setState({ fclQuote: data.quote });
                sessionStorage.removeItem('vcanship_show_confirmation');
                currentView = 'confirmation';
                renderCurrentView();
                return;
            }
        } catch (e) {
            console.error('Error parsing confirmation data:', e);
        }
    }
    
    // Default initialization
    renderFclPage();
}

// --- MAIN EXPORT ---
export function renderFclPage() {
    currentView = 'form';
    currentStep = 1;
    switchPage('fcl');
    renderCurrentView();
}