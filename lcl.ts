import { t } from './i18n.js';
import { State, setState } from './state.js';

// --- UTILITY FUNCTIONS ---
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // In a real implementation, this would show a toast notification
}

// --- TYPES ---
interface LclCargoItem {
    id: number;
    pieces: number;
    length: number;
    width: number;
    height: number;
    weight: number;
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

// LCL form data
interface LclFormData {
    origin: string;
    destination: string;
    cargoDescription: string;
    hsCode: string;
    cargoItems: LclCargoItem[];
    specialRequirements: string;
}

let formData: LclFormData = {
    origin: '',
    destination: '',
    cargoDescription: '',
    hsCode: '',
    cargoItems: [],
    specialRequirements: ''
};

function renderCurrentView() {
    const page = document.getElementById('page-lcl');
    if (!page) {
        console.error('page-lcl element not found');
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
            if (otherPage.id !== 'page-lcl') {
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
                <button class="back-btn" id="lcl-back-to-services">
                    <i class="fa-solid fa-arrow-left"></i> Back to Services
                </button>
                <h2><i class="fa-solid fa-boxes-stacked"></i> Book Less than Container Load (LCL)</h2>
                <p class="subtitle">Cost-effective shipping for goods not requiring a full container</p>
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

            <form id="lcl-details-form" novalidate>
                ${renderStepContent()}

                <div class="form-actions" style="margin-top: 2rem; display: flex; justify-content: space-between;">
                    ${currentStep > 1 ? `<button type="button" id="lcl-prev-btn" class="secondary-btn"><i class="fa-solid fa-arrow-left"></i> Previous</button>` : '<div></div>'}
                    ${currentStep < totalSteps ? `<button type="button" id="lcl-next-btn" class="main-submit-btn">Next: ${getStepLabel(currentStep + 1)} <i class="fa-solid fa-arrow-right"></i></button>` : `<button type="submit" class="main-submit-btn">Get LCL Quotes <i class="fa-solid fa-search"></i></button>`}
                </div>
            </form>
        </div>

        <aside class="parcel-form-sidebar">
            <!-- Support Card -->
            <div class="card support-card" style="margin-bottom: 1.5rem;">
                <h3><i class="fa-solid fa-circle-question"></i> Need Help?</h3>
                <p class="helper-text">Our LCL specialists are here to assist you with consolidated shipping.</p>
                <div class="support-actions">
                    <button class="secondary-btn" id="lcl-help-btn" style="width: 100%; margin-bottom: 0.5rem;">
                        <i class="fa-solid fa-book"></i> LCL Guide
                    </button>
                    <button class="secondary-btn" id="lcl-contact-btn" style="width: 100%;">
                        <i class="fa-solid fa-envelope"></i> Contact Expert
                    </button>
                </div>
            </div>

            <!-- LCL Info Card -->
            <div class="card">
                <h3><i class="fa-solid fa-info-circle"></i> LCL Benefits</h3>
                <div class="lcl-benefits">
                    <div class="benefit-item">
                        <strong>Cost Effective</strong>
                        <small>Pay only for space you use</small>
                    </div>
                    <div class="benefit-item">
                        <strong>Flexible Volume</strong>
                        <small>From 1 CBM to 15 CBM</small>
                    </div>
                    <div class="benefit-item">
                        <strong>Regular Departures</strong>
                        <small>Weekly consolidations</small>
                    </div>
                </div>
            </div>
        </aside>
    </div>
    `;
}

function getStepLabel(step: number): string {
    const labels = [
        'Route & Cargo',
        'Dimensions',
        'Review Details',
        'Get Quotes'
    ];
    return labels[step - 1] || '';
}

function renderStepContent(): string {
    switch (currentStep) {
        case 1:
            return renderRouteCargoStep();
        case 2:
            return renderDimensionsStep();
        case 3:
            return renderReviewStep();
        case 4:
            return renderQuotesStep();
        default:
            return '';
    }
}

function renderRouteCargoStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-route"></i> Route Information</h3>
        <p class="section-description">Enter your origin and destination ports or cities</p>
        
        <div class="two-column">
            <div class="input-wrapper">
                <label for="lcl-origin">
                    Origin Port/City <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter port name or city (e.g., Hamburg, Germany)"></i>
                </label>
                <input type="text" id="lcl-origin" placeholder="e.g., Hamburg, Germany" required value="${formData.origin}">
                <small class="field-hint">Port or city name with country</small>
                <div class="field-error" id="lcl-origin-error"></div>
            </div>

            <div class="input-wrapper">
                <label for="lcl-destination">
                    Destination Port/City <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter destination port or city"></i>
                </label>
                <input type="text" id="lcl-destination" placeholder="e.g., New York, USA" required value="${formData.destination}">
                <small class="field-hint">Port or city name with country</small>
                <div class="field-error" id="lcl-destination-error"></div>
            </div>
        </div>
    </div>

    <div class="form-section">
        <h3><i class="fa-solid fa-boxes-stacked"></i> Cargo Information</h3>
        <p class="section-description">Provide detailed information about your cargo</p>

        <div class="input-wrapper">
            <label for="lcl-cargo-description">
                Detailed Cargo Description <span class="required">*</span>
                <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Be specific about your goods for customs and handling"></i>
            </label>
            <textarea id="lcl-cargo-description" required placeholder="e.g., 10 boxes of cotton t-shirts, 5 boxes of leather shoes">${formData.cargoDescription}</textarea>
            <small class="field-hint">Include quantity, type, and packaging details</small>
            <div class="field-error" id="lcl-cargo-description-error"></div>
        </div>

        <div class="hs-code-suggester-wrapper">
            <div class="input-wrapper">
                <label for="lcl-hs-code">
                    HS Code (Harmonized System)
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Used by customs worldwide for classification and duties"></i>
                </label>
                <div class="hs-code-input-group">
                    <input type="text" id="lcl-hs-code" autocomplete="off" placeholder="Type description for AI suggestions" value="${formData.hsCode}">
                    <button type="button" id="lcl-hs-image-suggester-btn" class="secondary-btn hs-image-suggester-btn">
                        <i class="fa-solid fa-camera"></i> Image
                    </button>
                </div>
                <div class="hs-code-suggestions" id="lcl-hs-code-suggestions"></div>
                <input type="file" id="lcl-hs-image-input" class="hidden" accept="image/*">
                <small class="field-hint">Our AI can suggest codes from your description or product images</small>
            </div>
        </div>

        <div class="input-wrapper">
            <label for="lcl-special-requirements">
                Special Requirements
                <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Any special handling, temperature, or documentation needs"></i>
            </label>
            <textarea id="lcl-special-requirements" placeholder="e.g., Temperature controlled, Fragile handling, Hazardous materials">${formData.specialRequirements}</textarea>
            <small class="field-hint">Optional - Any special handling or documentation requirements</small>
        </div>
    </div>
    `;
}

function renderDimensionsStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-ruler-combined"></i> Cargo Dimensions & Weight</h3>
        <p class="section-description">Add each cargo item with its dimensions and weight</p>

        <div id="lcl-cargo-list">
            ${formData.cargoItems.length === 0 ? '<p class="helper-text">No cargo items added yet. Click "Add Cargo Item" to get started.</p>' : ''}
            ${formData.cargoItems.map((item, index) => `
                <div class="cargo-item" data-index="${index}">
                    <div class="cargo-header">
                        <h4>Cargo Item ${index + 1}</h4>
                        <button type="button" class="remove-cargo-btn" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem;">
                        <div class="input-wrapper">
                            <label>Pieces</label>
                            <input type="number" class="cargo-pieces" value="${item.pieces}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Length (cm)</label>
                            <input type="number" class="cargo-length" value="${item.length}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Width (cm)</label>
                            <input type="number" class="cargo-width" value="${item.width}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Height (cm)</label>
                            <input type="number" class="cargo-height" value="${item.height}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Weight (kg)</label>
                            <input type="number" class="cargo-weight" value="${item.weight}" min="1" required>
                        </div>
                    </div>
                    <div class="cargo-summary">
                        <span>Volume: ${((item.length * item.width * item.height) / 1000000 * item.pieces).toFixed(3)} m³</span>
                        <span>Total Weight: ${(item.weight * item.pieces).toFixed(2)} kg</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <button type="button" id="lcl-add-cargo-btn" class="secondary-btn">
            <i class="fa-solid fa-plus"></i> Add Cargo Item
        </button>

        ${formData.cargoItems.length > 0 ? `
        <div class="cargo-total-summary">
            <h4>Total Summary</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Total Volume:</span>
                    <span class="value">${getTotalVolume().toFixed(3)} m³</span>
                </div>
                <div class="summary-item">
                    <span class="label">Total Weight:</span>
                    <span class="value">${getTotalWeight().toFixed(2)} kg</span>
                </div>
                <div class="summary-item">
                    <span class="label">Chargeable Weight:</span>
                    <span class="value">${getChargeableWeight().toFixed(2)} kg</span>
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
        <h3><i class="fa-solid fa-clipboard-check"></i> Review Your LCL Shipment</h3>
        <p class="section-description">Please review all information before getting your quote</p>

        <div class="review-section">
            <h4><i class="fa-solid fa-route"></i> Route Information</h4>
            <div class="review-grid">
                <div class="review-item">
                    <span class="label">Origin:</span>
                    <span class="value">${formData.origin}</span>
                </div>
                <div class="review-item">
                    <span class="label">Destination:</span>
                    <span class="value">${formData.destination}</span>
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
            <h4><i class="fa-solid fa-ruler-combined"></i> Cargo Items</h4>
            ${formData.cargoItems.length > 0 ? `
                <div class="cargo-review-list">
                    ${formData.cargoItems.map((item, index) => `
                        <div class="cargo-review-item">
                            <strong>Item ${index + 1}:</strong>
                            <span>${item.pieces} pieces, ${item.length}×${item.width}×${item.height}cm, ${item.weight}kg each</span>
                            <span class="volume-weight">Vol: ${((item.length * item.width * item.height) / 1000000 * item.pieces).toFixed(3)} m³, Weight: ${(item.weight * item.pieces).toFixed(2)} kg</span>
                        </div>
                    `).join('')}
                </div>
                <div class="cargo-totals">
                    <div class="total-item">
                        <span class="label">Total Volume:</span>
                        <span class="value">${getTotalVolume().toFixed(3)} m³</span>
                    </div>
                    <div class="total-item">
                        <span class="label">Chargeable Weight:</span>
                        <span class="value">${getChargeableWeight().toFixed(2)} kg</span>
                    </div>
                </div>
            ` : '<p class="helper-text">No cargo items added</p>'}
        </div>

        <div class="review-note">
            <i class="fa-solid fa-info-circle"></i>
            <p>LCL rates are calculated based on volume (CBM) or weight, whichever is higher. Additional consolidation and handling fees will be included in the final quote.</p>
        </div>
    </div>
    `;
}

function renderQuotesStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-calculator"></i> Getting Your LCL Quotes</h3>
        <p class="section-description">Please wait while we calculate the best rates for your shipment</p>
        
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p>Calculating LCL rates from multiple consolidators...</p>
        </div>
    </div>
    `;
}

function renderResultsView(): string {
    return `
    <div class="service-page-header">
        <button class="back-btn" id="lcl-back-to-form">
            <i class="fa-solid fa-arrow-left"></i> Back to Form
        </button>
        <h2><i class="fa-solid fa-boxes-stacked"></i> LCL Quotes</h2>
        <p class="subtitle">Compare rates from multiple consolidators</p>
    </div>
    <div id="lcl-quotes-container"></div>
    `;
}

function renderPaymentView(): string {
    return `
    <div class="service-page-header">
        <h2><i class="fa-solid fa-credit-card"></i> Payment</h2>
        <p class="subtitle">Complete your LCL booking</p>
    </div>
    <div class="payment-container">
        <p>Payment processing for LCL bookings...</p>
    </div>
    `;
}

function renderConfirmationView(): string {
    return `
    <div class="service-page-header">
        <h2><i class="fa-solid fa-check-circle"></i> Booking Confirmed</h2>
        <p class="subtitle">Your LCL shipment has been booked successfully</p>
    </div>
    <div class="confirmation-container">
        <p>Your LCL booking confirmation details...</p>
    </div>
    `;
}

function setupFormEventListeners() {
    // Back to services
    const backBtn = document.getElementById('lcl-back-to-services');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            setState({ currentPage: 'landing' });
        });
    }

    // Navigation buttons
    const prevBtn = document.getElementById('lcl-prev-btn');
    const nextBtn = document.getElementById('lcl-next-btn');
    const form = document.getElementById('lcl-details-form') as HTMLFormElement;

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
                submitLclForm();
            }
        });
    }

    // Cargo management
    const addCargoBtn = document.getElementById('lcl-add-cargo-btn');
    if (addCargoBtn) {
        addCargoBtn.addEventListener('click', showAddCargoModal);
    }

    // Remove cargo buttons
    document.querySelectorAll('.remove-cargo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const index = parseInt(target.dataset.index || '0');
            formData.cargoItems.splice(index, 1);
            renderCurrentView();
        });
    });

    // HS Code suggestions
    const hsCodeInput = document.getElementById('lcl-hs-code') as HTMLInputElement;
    if (hsCodeInput) {
        hsCodeInput.addEventListener('input', debounce(suggestHsCode, 300));
    }
}

function setupResultsEventListeners() {
    const backBtn = document.getElementById('lcl-back-to-form');
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
            return validateRouteCargoStep();
        case 2:
            return validateDimensionsStep();
        case 3:
            return true; // Review step doesn't need validation
        case 4:
            return true; // Quotes step doesn't need validation
        default:
            return false;
    }
}

function validateRouteCargoStep(): boolean {
    let isValid = true;
    
    const origin = document.getElementById('lcl-origin') as HTMLInputElement;
    const destination = document.getElementById('lcl-destination') as HTMLInputElement;
    const cargoDescription = document.getElementById('lcl-cargo-description') as HTMLTextAreaElement;
    
    if (!origin?.value.trim()) {
        showFieldError('lcl-origin-error', 'Origin is required');
        isValid = false;
    }
    
    if (!destination?.value.trim()) {
        showFieldError('lcl-destination-error', 'Destination is required');
        isValid = false;
    }
    
    if (!cargoDescription?.value.trim()) {
        showFieldError('lcl-cargo-description-error', 'Cargo description is required');
        isValid = false;
    }
    
    return isValid;
}

function validateDimensionsStep(): boolean {
    if (formData.cargoItems.length === 0) {
        showToast('Please add at least one cargo item', 'error');
        return false;
    }
    return true;
}

function saveCurrentStepData() {
    switch (currentStep) {
        case 1:
            saveRouteCargoData();
            break;
        case 2:
            saveDimensionsData();
            break;
    }
}

function saveRouteCargoData() {
    const origin = document.getElementById('lcl-origin') as HTMLInputElement;
    const destination = document.getElementById('lcl-destination') as HTMLInputElement;
    const cargoDescription = document.getElementById('lcl-cargo-description') as HTMLTextAreaElement;
    const hsCode = document.getElementById('lcl-hs-code') as HTMLInputElement;
    const specialRequirements = document.getElementById('lcl-special-requirements') as HTMLTextAreaElement;
    
    if (origin) formData.origin = origin.value.trim();
    if (destination) formData.destination = destination.value.trim();
    if (cargoDescription) formData.cargoDescription = cargoDescription.value.trim();
    if (hsCode) formData.hsCode = hsCode.value.trim();
    if (specialRequirements) formData.specialRequirements = specialRequirements.value.trim();
}

function saveDimensionsData() {
    // Cargo items are saved when they are added/modified
}

function showFieldError(errorId: string, message: string) {
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function showAddCargoModal() {
    // Simple cargo addition - in a real app this would be a modal
    const pieces = parseInt(prompt('Number of pieces:') || '1');
    const length = parseInt(prompt('Length (cm):') || '100');
    const width = parseInt(prompt('Width (cm):') || '100');
    const height = parseInt(prompt('Height (cm):') || '100');
    const weight = parseInt(prompt('Weight per piece (kg):') || '100');
    
    if (pieces > 0 && length > 0 && width > 0 && height > 0 && weight > 0) {
        formData.cargoItems.push({
            id: Date.now(),
            pieces,
            length,
            width,
            height,
            weight
        });
        renderCurrentView();
    }
}

function getTotalVolume(): number {
    return formData.cargoItems.reduce((total, item) => {
        return total + (item.length * item.width * item.height) / 1000000 * item.pieces;
    }, 0);
}

function getTotalWeight(): number {
    return formData.cargoItems.reduce((total, item) => {
        return total + item.weight * item.pieces;
    }, 0);
}

function getChargeableWeight(): number {
    const totalVolume = getTotalVolume();
    const totalWeight = getTotalWeight();
    return Math.max(totalWeight, totalVolume * 1000); // 1 CBM = 1000 kg for LCL
}

function suggestHsCode() {
    const input = document.getElementById('lcl-hs-code') as HTMLInputElement;
    if (!input || input.value.length < 3) return;
    
    // Mock HS code suggestions
    const suggestions = [
        '6109.10.00 - T-shirts, singlets and other vests',
        '6403.99.00 - Other footwear with outer soles of rubber',
        '8517.12.00 - Telephones for cellular networks'
    ];
    
    const suggestionsContainer = document.getElementById('lcl-hs-code-suggestions');
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

function submitLclForm() {
    showToast('Getting LCL quotes...', 'info');
    
    // Mock quote generation
    setTimeout(() => {
        currentView = 'results';
        renderCurrentView();
        showToast('LCL quotes loaded successfully!', 'success');
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
export function renderLclPage() {
    currentView = 'form';
    currentStep = 1;
    renderCurrentView();
}