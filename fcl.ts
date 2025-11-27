import { t } from './i18n.js';
import { State, setState } from './state.js';

// --- UTILITY FUNCTIONS ---
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // In a real implementation, this would show a toast notification
}

// --- TYPES ---
interface FclContainer {
    type: '20GP' | '40GP' | '40HC';
    quantity: number;
    weight?: number;
    weightUnit: 'KG' | 'TON';
}

interface Quote {
    id: string;
    carrierName: string;
    totalCost: number;
    estimatedTransitTime: string;
    selected?: boolean;
}

// --- UI RENDERING & STEP MANAGEMENT ---

let currentView: 'form' | 'results' | 'payment' | 'confirmation' = 'form';
let currentStep: number = 1;
const totalSteps: number = 4;

// FCL form data
interface FclFormData {
    serviceType: 'port-to-port' | 'door-to-port' | 'port-to-door' | 'door-to-door';
    originPort: string;
    destinationPort: string;
    senderName: string;
    senderCountry: string;
    recipientName: string;
    recipientCountry: string;
    cargoDescription: string;
    hsCode: string;
    containers: FclContainer[];
    specialRequirements: string;
}

let formData: FclFormData = {
    serviceType: 'port-to-port',
    originPort: '',
    destinationPort: '',
    senderName: '',
    senderCountry: '',
    recipientName: '',
    recipientCountry: '',
    cargoDescription: '',
    hsCode: '',
    containers: [],
    specialRequirements: ''
};

function renderCurrentView() {
    const page = document.getElementById('page-fcl');
    if (!page) {
        console.error('page-fcl element not found');
        return;
    }

    // Clear and prepare page
    page.innerHTML = '';
    page.style.opacity = '0';
    page.style.visibility = 'hidden';
    page.style.display = 'none';

    // Clear other pages
    const pageContainer = document.getElementById('pages');
    if (pageContainer) {
        const allPages = pageContainer.querySelectorAll('.page') as NodeListOf<HTMLElement>;
        allPages.forEach(otherPage => {
            if (otherPage.id !== 'page-fcl') {
                otherPage.classList.remove('active');
                otherPage.innerHTML = '';
                otherPage.style.display = 'none';
                otherPage.style.visibility = 'hidden';
                otherPage.style.opacity = '0';
            }
        });
    }

    // Show current page
    page.style.position = 'static';
    page.style.display = 'block';
    page.style.visibility = 'visible';

    setTimeout(() => {
        switch (currentView) {
            case 'form':
                const formHtml = renderFormView();
                page.innerHTML = formHtml;
                setupFormEventListeners();
                break;
            case 'results':
                page.innerHTML = renderResultsView();
                setupResultsEventListeners();
                break;
            case 'payment':
                page.innerHTML = renderPaymentView();
                setupPaymentEventListeners();
                break;
            case 'confirmation':
                page.innerHTML = renderConfirmationView();
                setupConfirmationEventListeners();
                break;
        }
        
        page.style.opacity = '1';
        page.classList.add('active');
    }, 50);
}

function renderFormView(): string {
    return `
    <div class="parcel-form-layout">
        <div class="parcel-form-main">
            <div class="service-page-header">
                <button class="back-btn" id="fcl-back-to-services">
                    <i class="fa-solid fa-arrow-left"></i> Back to Services
                </button>
                <h2><i class="fa-solid fa-ship"></i> Book Full Container Load (FCL)</h2>
                <p class="subtitle">Secure exclusive use of a container for your large shipments</p>
            </div>

            <!-- Progress Indicator -->
            <div class="parcel-progress-indicator">
                ${Array.from({length: totalSteps}, (_, i) => `
                    <div class="progress-step ${i < currentStep ? 'completed' : i === currentStep - 1 ? 'active' : ''}">
                        <div class="step-number">${i + 1}</div>
                        <div class="step-label">${getStepLabel(i + 1)}</div>
                    </div>
                `).join('')}
            </div>

            <form id="fcl-details-form" novalidate>
                ${renderStepContent()}

                <div class="form-actions" style="margin-top: 2rem; display: flex; justify-content: space-between;">
                    ${currentStep > 1 ? `<button type="button" id="fcl-prev-btn" class="secondary-btn"><i class="fa-solid fa-arrow-left"></i> Previous</button>` : '<div></div>'}
                    ${currentStep < totalSteps ? `<button type="button" id="fcl-next-btn" class="main-submit-btn">Next: ${getStepLabel(currentStep + 1)} <i class="fa-solid fa-arrow-right"></i></button>` : `<button type="submit" class="main-submit-btn">Get FCL Quotes <i class="fa-solid fa-search"></i></button>`}
                </div>
            </form>
        </div>

        <aside class="parcel-form-sidebar">
            <!-- Support Card -->
            <div class="card support-card" style="margin-bottom: 1.5rem;">
                <h3><i class="fa-solid fa-circle-question"></i> Need Help?</h3>
                <p class="helper-text">Our FCL specialists are here to assist you with container shipping.</p>
                <div class="support-actions">
                    <button class="secondary-btn" id="fcl-help-btn" style="width: 100%; margin-bottom: 0.5rem;">
                        <i class="fa-solid fa-book"></i> FCL Guide
                    </button>
                    <button class="secondary-btn" id="fcl-contact-btn" style="width: 100%;">
                        <i class="fa-solid fa-envelope"></i> Contact Expert
                    </button>
                </div>
            </div>

            <!-- Container Info Card -->
            <div class="card">
                <h3><i class="fa-solid fa-info-circle"></i> Container Types</h3>
                <div class="container-info">
                    <div class="container-type">
                        <strong>20ft Standard</strong>
                        <small>33.2 m³ • Max 28,230 kg</small>
                    </div>
                    <div class="container-type">
                        <strong>40ft Standard</strong>
                        <small>67.7 m³ • Max 26,700 kg</small>
                    </div>
                    <div class="container-type">
                        <strong>40ft High Cube</strong>
                        <small>76.3 m³ • Max 26,700 kg</small>
                    </div>
                </div>
            </div>
        </aside>
    </div>
    `;
}

function getStepLabel(step: number): string {
    const labels = [
        'Service & Route',
        'Cargo Details',
        'Container Selection',
        'Review & Submit'
    ];
    return labels[step - 1] || '';
}

function renderStepContent(): string {
    switch (currentStep) {
        case 1:
            return renderServiceRouteStep();
        case 2:
            return renderCargoDetailsStep();
        case 3:
            return renderContainerSelectionStep();
        case 4:
            return renderReviewStep();
        default:
            return '';
    }
}

function renderServiceRouteStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-route"></i> Service Type</h3>
        <p class="section-description">Choose how you want to handle pickup and delivery</p>
        
        <div class="service-type-selector">
            <button type="button" class="service-type-btn ${formData.serviceType === 'port-to-port' ? 'active' : ''}" data-type="port-to-port">
                <strong>Port-to-Port</strong>
                <span>You handle transport to/from ports</span>
            </button>
            <button type="button" class="service-type-btn ${formData.serviceType === 'door-to-port' ? 'active' : ''}" data-type="door-to-port">
                <strong>Door-to-Port</strong>
                <span>We pick up from your location</span>
            </button>
            <button type="button" class="service-type-btn ${formData.serviceType === 'port-to-door' ? 'active' : ''}" data-type="port-to-door">
                <strong>Port-to-Door</strong>
                <span>We deliver to destination</span>
            </button>
            <button type="button" class="service-type-btn ${formData.serviceType === 'door-to-door' ? 'active' : ''}" data-type="door-to-door">
                <strong>Door-to-Door</strong>
                <span>We handle the entire journey</span>
            </button>
        </div>
    </div>

    <div class="form-section">
        <h3><i class="fa-solid fa-anchor"></i> Route Information</h3>
        <div class="two-column">
            <div class="input-wrapper">
                <label for="fcl-origin-port">
                    Port of Loading <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter port name or code (e.g., Shanghai or CNSHA)"></i>
                </label>
                <input type="text" id="fcl-origin-port" placeholder="e.g., Shanghai or CNSHA" required value="${formData.originPort}">
                <small class="field-hint">Port name or UNLOCODE</small>
                <div class="field-error" id="fcl-origin-port-error"></div>
            </div>

            <div class="input-wrapper">
                <label for="fcl-destination-port">
                    Port of Discharge <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter destination port name or code"></i>
                </label>
                <input type="text" id="fcl-destination-port" placeholder="e.g., Los Angeles or USLAX" required value="${formData.destinationPort}">
                <small class="field-hint">Port name or UNLOCODE</small>
                <div class="field-error" id="fcl-destination-port-error"></div>
            </div>
        </div>
    </div>

    ${formData.serviceType !== 'port-to-port' ? `
    <div class="form-section">
        <h3><i class="fa-solid fa-building"></i> Company Information</h3>
        <div class="two-column">
            <div class="input-wrapper">
                <label for="fcl-sender-name">
                    Sender Company/Name <span class="required">*</span>
                </label>
                <input type="text" id="fcl-sender-name" placeholder="Your company name" required value="${formData.senderName}">
                <div class="field-error" id="fcl-sender-name-error"></div>
            </div>

            <div class="input-wrapper">
                <label for="fcl-recipient-name">
                    Recipient Company/Name <span class="required">*</span>
                </label>
                <input type="text" id="fcl-recipient-name" placeholder="Recipient company name" required value="${formData.recipientName}">
                <div class="field-error" id="fcl-recipient-name-error"></div>
            </div>
        </div>
    </div>
    ` : ''}
    `;
}

function renderCargoDetailsStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-boxes-stacked"></i> Cargo Information</h3>
        <p class="section-description">Provide detailed information about your cargo for accurate pricing and customs clearance</p>

        <div class="input-wrapper">
            <label for="fcl-cargo-description">
                Detailed Cargo Description <span class="required">*</span>
                <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Be specific about your goods for customs and handling"></i>
            </label>
            <textarea id="fcl-cargo-description" required placeholder="e.g., 15 pallets of consumer electronics, 200 boxes of cotton t-shirts">${formData.cargoDescription}</textarea>
            <small class="field-hint">Include quantity, type, and packaging details</small>
            <div class="field-error" id="fcl-cargo-description-error"></div>
        </div>

        <div class="hs-code-suggester-wrapper">
            <div class="input-wrapper">
                <label for="fcl-hs-code">
                    HS Code (Harmonized System)
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Used by customs worldwide for classification and duties"></i>
                </label>
                <div class="hs-code-input-group">
                    <input type="text" id="fcl-hs-code" autocomplete="off" placeholder="Type description for AI suggestions" value="${formData.hsCode}">
                    <button type="button" id="fcl-hs-image-suggester-btn" class="secondary-btn hs-image-suggester-btn">
                        <i class="fa-solid fa-camera"></i> Image
                    </button>
                </div>
                <div class="hs-code-suggestions" id="fcl-hs-code-suggestions"></div>
                <input type="file" id="fcl-hs-image-input" class="hidden" accept="image/*">
                <small class="field-hint">Our AI can suggest codes from your description or product images</small>
            </div>
        </div>

        <div class="input-wrapper">
            <label for="fcl-special-requirements">
                Special Requirements
                <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Any special handling, temperature, or documentation needs"></i>
            </label>
            <textarea id="fcl-special-requirements" placeholder="e.g., Temperature controlled, Fragile handling, Hazardous materials">${formData.specialRequirements}</textarea>
            <small class="field-hint">Optional - Any special handling or documentation requirements</small>
        </div>
    </div>
    `;
}

function renderContainerSelectionStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-container-storage"></i> Container Selection</h3>
        <p class="section-description">Select the containers you need for your shipment</p>

        <div id="fcl-container-list">
            ${formData.containers.length === 0 ? '<p class="helper-text">No containers added yet. Click "Add Container" to get started.</p>' : ''}
            ${formData.containers.map((container, index) => `
                <div class="container-item" data-index="${index}">
                    <div class="container-header">
                        <h4>${container.type} Container</h4>
                        <button type="button" class="remove-container-btn" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <div class="container-details">
                        <span>Quantity: ${container.quantity}</span>
                        ${container.weight ? `<span>Weight: ${container.weight} ${container.weightUnit}</span>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <button type="button" id="fcl-add-container-btn" class="secondary-btn">
            <i class="fa-solid fa-plus"></i> Add Container
        </button>

        ${formData.containers.length > 0 ? `
        <div class="container-summary">
            <h4>Container Summary</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Total Containers:</span>
                    <span class="value">${formData.containers.reduce((sum, c) => sum + c.quantity, 0)}</span>
                </div>
                <div class="summary-item">
                    <span class="label">Container Types:</span>
                    <span class="value">${[...new Set(formData.containers.map(c => c.type))].join(', ')}</span>
                </div>
            </div>
        </div>
        ` : ''}
    </div>
    `;
}

function renderReviewStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-clipboard-check"></i> Review Your FCL Shipment</h3>
        <p class="section-description">Please review all information before getting your quote</p>

        <div class="review-section">
            <h4><i class="fa-solid fa-route"></i> Service & Route</h4>
            <div class="review-grid">
                <div class="review-item">
                    <span class="label">Service Type:</span>
                    <span class="value">${formData.serviceType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                </div>
                <div class="review-item">
                    <span class="label">Origin Port:</span>
                    <span class="value">${formData.originPort}</span>
                </div>
                <div class="review-item">
                    <span class="label">Destination Port:</span>
                    <span class="value">${formData.destinationPort}</span>
                </div>
            </div>
        </div>

        <div class="review-section">
            <h4><i class="fa-solid fa-boxes-stacked"></i> Cargo Details</h4>
            <div class="review-grid">
                <div class="review-item">
                    <span class="label">Description:</span>
                    <span class="value">${formData.cargoDescription}</span>
                </div>
                ${formData.hsCode ? `
                <div class="review-item">
                    <span class="label">HS Code:</span>
                    <span class="value">${formData.hsCode}</span>
                </div>
                ` : ''}
                ${formData.specialRequirements ? `
                <div class="review-item">
                    <span class="label">Special Requirements:</span>
                    <span class="value">${formData.specialRequirements}</span>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="review-section">
            <h4><i class="fa-solid fa-container-storage"></i> Containers</h4>
            ${formData.containers.length > 0 ? `
                <div class="container-review-list">
                    ${formData.containers.map(container => `
                        <div class="container-review-item">
                            <strong>${container.quantity}x ${container.type}</strong>
                            ${container.weight ? `<span class="weight-info">${container.weight} ${container.weightUnit}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : '<p class="helper-text">No containers selected</p>'}
        </div>

        <div class="review-note">
            <i class="fa-solid fa-info-circle"></i>
            <p>FCL rates will be calculated based on your route and container requirements. Additional service costs will be included in the final quote.</p>
        </div>
    </div>
    `;
}

function renderResultsView(): string {
    return `
    <div class="service-page-header">
        <button class="back-btn" id="fcl-back-to-form">
            <i class="fa-solid fa-arrow-left"></i> Back to Form
        </button>
        <h2><i class="fa-solid fa-ship"></i> FCL Quotes</h2>
        <p class="subtitle">Compare rates from multiple carriers</p>
    </div>
    <div id="fcl-quotes-container"></div>
    `;
}

function renderPaymentView(): string {
    return `
    <div class="service-page-header">
        <h2><i class="fa-solid fa-credit-card"></i> Payment</h2>
        <p class="subtitle">Complete your FCL booking</p>
    </div>
    <div class="payment-container">
        <p>Payment processing for FCL bookings...</p>
    </div>
    `;
}

function renderConfirmationView(): string {
    return `
    <div class="service-page-header">
        <h2><i class="fa-solid fa-check-circle"></i> Booking Confirmed</h2>
        <p class="subtitle">Your FCL shipment has been booked successfully</p>
    </div>
    <div class="confirmation-container">
        <p>Your FCL booking confirmation details...</p>
    </div>
    `;
}

function setupFormEventListeners() {
    // Back to services
    const backBtn = document.getElementById('fcl-back-to-services');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            setState({ currentPage: 'landing' });
        });
    }

    // Service type selection
    const serviceTypeBtns = document.querySelectorAll('.service-type-btn');
    serviceTypeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const type = target.dataset.type as FclFormData['serviceType'];
            if (type) {
                formData.serviceType = type;
                serviceTypeBtns.forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                renderCurrentView(); // Re-render to show/hide company fields
            }
        });
    });

    // Navigation buttons
    const prevBtn = document.getElementById('fcl-prev-btn');
    const nextBtn = document.getElementById('fcl-next-btn');
    const form = document.getElementById('fcl-details-form') as HTMLFormElement;

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                renderCurrentView();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (validateCurrentStep()) {
                saveCurrentStepData();
                if (currentStep < totalSteps) {
                    currentStep++;
                    renderCurrentView();
                }
            }
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateCurrentStep()) {
                saveCurrentStepData();
                submitFclForm();
            }
        });
    }

    // Container management
    const addContainerBtn = document.getElementById('fcl-add-container-btn');
    if (addContainerBtn) {
        addContainerBtn.addEventListener('click', showAddContainerModal);
    }

    // Remove container buttons
    document.querySelectorAll('.remove-container-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const index = parseInt(target.dataset.index || '0');
            formData.containers.splice(index, 1);
            renderCurrentView();
        });
    });

    // HS Code suggestions
    const hsCodeInput = document.getElementById('fcl-hs-code') as HTMLInputElement;
    if (hsCodeInput) {
        hsCodeInput.addEventListener('input', debounce(suggestHsCode, 300));
    }
}

function setupResultsEventListeners() {
    const backBtn = document.getElementById('fcl-back-to-form');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            currentView = 'form';
            renderCurrentView();
        });
    }
}

function setupPaymentEventListeners() {
    // Payment event listeners
}

function setupConfirmationEventListeners() {
    // Confirmation event listeners
}

function validateCurrentStep(): boolean {
    switch (currentStep) {
        case 1:
            return validateServiceRouteStep();
        case 2:
            return validateCargoDetailsStep();
        case 3:
            return validateContainerSelectionStep();
        case 4:
            return true; // Review step doesn't need validation
        default:
            return false;
    }
}

function validateServiceRouteStep(): boolean {
    let isValid = true;
    
    const originPort = document.getElementById('fcl-origin-port') as HTMLInputElement;
    const destinationPort = document.getElementById('fcl-destination-port') as HTMLInputElement;
    
    if (!originPort?.value.trim()) {
        showFieldError('fcl-origin-port-error', 'Origin port is required');
        isValid = false;
    }
    
    if (!destinationPort?.value.trim()) {
        showFieldError('fcl-destination-port-error', 'Destination port is required');
        isValid = false;
    }

    if (formData.serviceType !== 'port-to-port') {
        const senderName = document.getElementById('fcl-sender-name') as HTMLInputElement;
        const recipientName = document.getElementById('fcl-recipient-name') as HTMLInputElement;
        
        if (!senderName?.value.trim()) {
            showFieldError('fcl-sender-name-error', 'Sender name is required');
            isValid = false;
        }
        
        if (!recipientName?.value.trim()) {
            showFieldError('fcl-recipient-name-error', 'Recipient name is required');
            isValid = false;
        }
    }
    
    return isValid;
}

function validateCargoDetailsStep(): boolean {
    let isValid = true;
    
    const cargoDescription = document.getElementById('fcl-cargo-description') as HTMLTextAreaElement;
    
    if (!cargoDescription?.value.trim()) {
        showFieldError('fcl-cargo-description-error', 'Cargo description is required');
        isValid = false;
    }
    
    return isValid;
}

function validateContainerSelectionStep(): boolean {
    if (formData.containers.length === 0) {
        showToast('Please add at least one container', 'error');
        return false;
    }
    return true;
}

function saveCurrentStepData() {
    switch (currentStep) {
        case 1:
            saveServiceRouteData();
            break;
        case 2:
            saveCargoDetailsData();
            break;
        case 3:
            // Container data is saved when containers are added/removed
            break;
    }
}

function saveServiceRouteData() {
    const originPort = document.getElementById('fcl-origin-port') as HTMLInputElement;
    const destinationPort = document.getElementById('fcl-destination-port') as HTMLInputElement;
    const senderName = document.getElementById('fcl-sender-name') as HTMLInputElement;
    const recipientName = document.getElementById('fcl-recipient-name') as HTMLInputElement;
    
    if (originPort) formData.originPort = originPort.value.trim();
    if (destinationPort) formData.destinationPort = destinationPort.value.trim();
    if (senderName) formData.senderName = senderName.value.trim();
    if (recipientName) formData.recipientName = recipientName.value.trim();
}

function saveCargoDetailsData() {
    const cargoDescription = document.getElementById('fcl-cargo-description') as HTMLTextAreaElement;
    const hsCode = document.getElementById('fcl-hs-code') as HTMLInputElement;
    const specialRequirements = document.getElementById('fcl-special-requirements') as HTMLTextAreaElement;
    
    if (cargoDescription) formData.cargoDescription = cargoDescription.value.trim();
    if (hsCode) formData.hsCode = hsCode.value.trim();
    if (specialRequirements) formData.specialRequirements = specialRequirements.value.trim();
}

function showFieldError(errorId: string, message: string) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function showAddContainerModal() {
    // Simple container addition - in a real app this would be a modal
    const containerType = prompt('Container Type (20GP, 40GP, 40HC):') as FclContainer['type'];
    const quantity = parseInt(prompt('Quantity:') || '1');
    
    if (containerType && ['20GP', '40GP', '40HC'].includes(containerType) && quantity > 0) {
        formData.containers.push({
            type: containerType,
            quantity: quantity,
            weightUnit: 'KG'
        });
        renderCurrentView();
    }
}

function suggestHsCode() {
    const input = document.getElementById('fcl-hs-code') as HTMLInputElement;
    if (!input || input.value.length < 3) return;
    
    // Mock HS code suggestions
    const suggestions = [
        '8517.12.00 - Telephones for cellular networks',
        '6109.10.00 - T-shirts, singlets and other vests',
        '8471.30.01 - Portable digital automatic data processing machines'
    ];
    
    const suggestionsContainer = document.getElementById('fcl-hs-code-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = suggestions.map(suggestion => 
            `<div class="hs-suggestion" data-code="${suggestion.split(' - ')[0]}">${suggestion}</div>`
        ).join('');
        
        suggestionsContainer.querySelectorAll('.hs-suggestion').forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const code = target.dataset.code;
                if (code && input) {
                    input.value = code;
                    suggestionsContainer.innerHTML = '';
                }
            });
        });
    }
}

function submitFclForm() {
    showToast('Getting FCL quotes...', 'info');
    
    // Mock quote generation
    setTimeout(() => {
        currentView = 'results';
        renderCurrentView();
        showToast('FCL quotes loaded successfully!', 'success');
    }, 2000);
}

function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- MAIN EXPORT ---
export function renderFclPage() {
    currentView = 'form';
    currentStep = 1;
    renderCurrentView();
}