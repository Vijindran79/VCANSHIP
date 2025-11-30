import { t } from './i18n';
import { State, setState } from './state';
import { switchPage } from './ui';

// --- UTILITY FUNCTIONS ---
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // In a real implementation, this would show a toast notification
}

// --- TYPES ---
interface AirfreightCargoPiece {
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

// Air Freight form data
interface AirfreightFormData {
    originAirport: string;
    destinationAirport: string;
    cargoDescription: string;
    hsCode: string;
    cargoPieces: AirfreightCargoPiece[];
    specialRequirements: string;
    serviceType: 'standard' | 'express' | 'economy';
}

let formData: AirfreightFormData = {
    originAirport: '',
    destinationAirport: '',
    cargoDescription: '',
    hsCode: '',
    cargoPieces: [],
    specialRequirements: '',
    serviceType: 'standard'
};

function renderCurrentView() {
    const page = document.getElementById('page-airfreight');
    if (!page) {
        console.error('page-airfreight element not found');
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
            if (otherPage.id !== 'page-airfreight') {
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
                <button class="back-btn" id="airfreight-back-to-services">
                    <i class="fa-solid fa-arrow-left"></i> Back to Services
                </button>
                <h2><i class="fa-solid fa-plane"></i> Book Air Freight</h2>
                <p class="subtitle">Fast and reliable shipping for your time-sensitive cargo</p>
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

            <form id="airfreight-details-form" novalidate>
                ${renderStepContent()}

                <div class="form-actions" style="margin-top: 2rem; display: flex; justify-content: space-between;">
                    ${currentStep > 1 ? `<button type="button" id="airfreight-prev-btn" class="secondary-btn"><i class="fa-solid fa-arrow-left"></i> Previous</button>` : '<div></div>'}
                    ${currentStep < totalSteps ? `<button type="button" id="airfreight-next-btn" class="main-submit-btn">Next: ${getStepLabel(currentStep + 1)} <i class="fa-solid fa-arrow-right"></i></button>` : `<button type="submit" class="main-submit-btn">Get Air Freight Quotes <i class="fa-solid fa-search"></i></button>`}
                </div>
            </form>
        </div>

        <aside class="parcel-form-sidebar">
            <!-- Support Card -->
            <div class="card support-card" style="margin-bottom: 1.5rem;">
                <h3><i class="fa-solid fa-circle-question"></i> Need Help?</h3>
                <p class="helper-text">Our air freight specialists are here to assist you with urgent shipments.</p>
                <div class="support-actions">
                    <button class="secondary-btn" id="airfreight-help-btn" style="width: 100%; margin-bottom: 0.5rem;">
                        <i class="fa-solid fa-book"></i> Air Freight Guide
                    </button>
                    <button class="secondary-btn" id="airfreight-contact-btn" style="width: 100%;">
                        <i class="fa-solid fa-envelope"></i> Contact Expert
                    </button>
                </div>
            </div>

            <!-- Service Info Card -->
            <div class="card">
                <h3><i class="fa-solid fa-info-circle"></i> Service Options</h3>
                <div class="service-options">
                    <div class="service-option">
                        <strong>Express</strong>
                        <small>1-2 days • Premium rates</small>
                    </div>
                    <div class="service-option">
                        <strong>Standard</strong>
                        <small>3-5 days • Balanced cost</small>
                    </div>
                    <div class="service-option">
                        <strong>Economy</strong>
                        <small>5-7 days • Best rates</small>
                    </div>
                </div>
            </div>
        </aside>
    </div>
    `;
}

function getStepLabel(step: number): string {
    const labels = [
        'Route & Service',
        'Cargo Details',
        'Dimensions',
        'Review & Submit'
    ];
    return labels[step - 1] || '';
}

function renderStepContent(): string {
    switch (currentStep) {
        case 1:
            return renderRouteServiceStep();
        case 2:
            return renderCargoDetailsStep();
        case 3:
            return renderDimensionsStep();
        case 4:
            return renderReviewStep();
        default:
            return '';
    }
}

function renderRouteServiceStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-route"></i> Route Information</h3>
        <p class="section-description">Enter your origin and destination airports</p>
        
        <div class="two-column">
            <div class="input-wrapper">
                <label for="airfreight-origin">
                    Origin Airport <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter IATA airport code (e.g., LHR for London Heathrow)"></i>
                </label>
                <input type="text" id="airfreight-origin" placeholder="e.g., LHR" required value="${formData.originAirport}" maxlength="3" style="text-transform: uppercase;">
                <small class="field-hint">3-letter IATA airport code</small>
                <div class="field-error" id="airfreight-origin-error"></div>
            </div>

            <div class="input-wrapper">
                <label for="airfreight-destination">
                    Destination Airport <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter IATA airport code (e.g., JFK for New York JFK)"></i>
                </label>
                <input type="text" id="airfreight-destination" placeholder="e.g., JFK" required value="${formData.destinationAirport}" maxlength="3" style="text-transform: uppercase;">
                <small class="field-hint">3-letter IATA airport code</small>
                <div class="field-error" id="airfreight-destination-error"></div>
            </div>
        </div>
    </div>

    <div class="form-section">
        <h3><i class="fa-solid fa-clock"></i> Service Type</h3>
        <p class="section-description">Choose your preferred service level</p>
        
        <div class="service-type-selector">
            <button type="button" class="service-type-btn ${formData.serviceType === 'express' ? 'active' : ''}" data-type="express">
                <strong>Express</strong>
                <span>1-2 days delivery • Premium rates</span>
            </button>
            <button type="button" class="service-type-btn ${formData.serviceType === 'standard' ? 'active' : ''}" data-type="standard">
                <strong>Standard</strong>
                <span>3-5 days delivery • Balanced cost</span>
            </button>
            <button type="button" class="service-type-btn ${formData.serviceType === 'economy' ? 'active' : ''}" data-type="economy">
                <strong>Economy</strong>
                <span>5-7 days delivery • Best rates</span>
            </button>
        </div>
    </div>
    `;
}

function renderCargoDetailsStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-boxes-stacked"></i> Cargo Information</h3>
        <p class="section-description">Provide detailed information about your cargo for accurate pricing and customs clearance</p>

        <div class="input-wrapper">
            <label for="airfreight-cargo-description">
                Detailed Cargo Description <span class="required">*</span>
                <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Be specific about your goods for customs and handling"></i>
            </label>
            <textarea id="airfreight-cargo-description" required placeholder="e.g., 10 boxes of smartphone batteries, 5 pallets of electronic components">${formData.cargoDescription}</textarea>
            <small class="field-hint">Include quantity, type, and packaging details</small>
            <div class="field-error" id="airfreight-cargo-description-error"></div>
        </div>

        <div class="hs-code-suggester-wrapper">
            <div class="input-wrapper">
                <label for="airfreight-hs-code">
                    HS Code (Harmonized System)
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Used by customs worldwide for classification and duties"></i>
                </label>
                <div class="hs-code-input-group">
                    <input type="text" id="airfreight-hs-code" autocomplete="off" placeholder="Type description for AI suggestions" value="${formData.hsCode}">
                    <button type="button" id="airfreight-hs-image-suggester-btn" class="secondary-btn hs-image-suggester-btn">
                        <i class="fa-solid fa-camera"></i> Image
                    </button>
                </div>
                <div class="hs-code-suggestions" id="airfreight-hs-code-suggestions"></div>
                <input type="file" id="airfreight-hs-image-input" class="hidden" accept="image/*">
                <small class="field-hint">Our AI can suggest codes from your description or product images</small>
            </div>
        </div>

        <div class="input-wrapper">
            <label for="airfreight-special-requirements">
                Special Requirements
                <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Any special handling, temperature, or documentation needs"></i>
            </label>
            <textarea id="airfreight-special-requirements" placeholder="e.g., Temperature controlled, Dangerous goods, Live animals">${formData.specialRequirements}</textarea>
            <small class="field-hint">Optional - Any special handling or documentation requirements</small>
        </div>
    </div>
    `;
}

function renderDimensionsStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-ruler-combined"></i> Cargo Dimensions & Weight</h3>
        <p class="section-description">Add each cargo piece with its dimensions and weight</p>

        <div id="airfreight-cargo-list">
            ${formData.cargoPieces.length === 0 ? '<p class="helper-text">No cargo pieces added yet. Click "Add Cargo Piece" to get started.</p>' : ''}
            ${formData.cargoPieces.map((piece, index) => `
                <div class="cargo-piece" data-index="${index}">
                    <div class="cargo-header">
                        <h4>Cargo Piece ${index + 1}</h4>
                        <button type="button" class="remove-cargo-btn" data-index="${index}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 1rem;">
                        <div class="input-wrapper">
                            <label>Pieces</label>
                            <input type="number" class="cargo-pieces" value="${piece.pieces}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Length (cm)</label>
                            <input type="number" class="cargo-length" value="${piece.length}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Width (cm)</label>
                            <input type="number" class="cargo-width" value="${piece.width}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Height (cm)</label>
                            <input type="number" class="cargo-height" value="${piece.height}" min="1" required>
                        </div>
                        <div class="input-wrapper">
                            <label>Weight (kg)</label>
                            <input type="number" class="cargo-weight" value="${piece.weight}" min="0.1" step="0.1" required>
                        </div>
                    </div>
                    <div class="cargo-summary">
                        <span>Volume: ${((piece.length * piece.width * piece.height) / 1000000 * piece.pieces).toFixed(3)} m³</span>
                        <span>Volumetric Weight: ${(((piece.length * piece.width * piece.height) / 5000) * piece.pieces).toFixed(2)} kg</span>
                        <span>Actual Weight: ${(piece.weight * piece.pieces).toFixed(2)} kg</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <button type="button" id="airfreight-add-piece-btn" class="secondary-btn">
            <i class="fa-solid fa-plus"></i> Add Cargo Piece
        </button>

        ${formData.cargoPieces.length > 0 ? `
        <div class="cargo-total-summary">
            <h4>Total Summary</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <span class="label">Total Volume:</span>
                    <span class="value">${getTotalVolume().toFixed(3)} m³</span>
                </div>
                <div class="summary-item">
                    <span class="label">Total Actual Weight:</span>
                    <span class="value">${getTotalActualWeight().toFixed(2)} kg</span>
                </div>
                <div class="summary-item">
                    <span class="label">Chargeable Weight:</span>
                    <span class="value">${getChargeableWeight().toFixed(2)} kg</span>
                </div>
            </div>
            <div class="weight-note">
                <i class="fa-solid fa-info-circle"></i>
                <small>Air freight charges are based on whichever is greater: actual weight or volumetric weight (L×W×H÷5000)</small>
            </div>
        </div>
        ` : ''}
    </div>
    `;
}

function renderReviewStep(): string {
    return `
    <div class="form-section">
        <h3><i class="fa-solid fa-clipboard-check"></i> Review Your Air Freight Shipment</h3>
        <p class="section-description">Please review all information before getting your quote</p>

        <div class="review-section">
            <h4><i class="fa-solid fa-route"></i> Route & Service</h4>
            <div class="review-grid">
                <div class="review-item">
                    <span class="label">Origin Airport:</span>
                    <span class="value">${formData.originAirport}</span>
                </div>
                <div class="review-item">
                    <span class="label">Destination Airport:</span>
                    <span class="value">${formData.destinationAirport}</span>
                </div>
                <div class="review-item">
                    <span class="label">Service Type:</span>
                    <span class="value">${formData.serviceType.charAt(0).toUpperCase() + formData.serviceType.slice(1)}</span>
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
            <h4><i class="fa-solid fa-ruler-combined"></i> Cargo Pieces</h4>
            ${formData.cargoPieces.length > 0 ? `
                <div class="cargo-review-list">
                    ${formData.cargoPieces.map((piece, index) => `
                        <div class="cargo-review-item">
                            <strong>Piece ${index + 1}:</strong>
                            <span>${piece.pieces} pieces, ${piece.length}×${piece.width}×${piece.height}cm, ${piece.weight}kg each</span>
                            <span class="weight-info">Volumetric: ${(((piece.length * piece.width * piece.height) / 5000) * piece.pieces).toFixed(2)} kg, Actual: ${(piece.weight * piece.pieces).toFixed(2)} kg</span>
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
            ` : '<p class="helper-text">No cargo pieces added</p>'}
        </div>

        <div class="review-note">
            <i class="fa-solid fa-info-circle"></i>
            <p>Air freight rates are calculated based on chargeable weight (greater of actual or volumetric weight). Additional fuel surcharges and handling fees will be included in the final quote.</p>
        </div>
    </div>
    `;
}

function renderResultsView(): string {
    return `
    <div class="service-page-header">
        <button class="back-btn" id="airfreight-back-to-form">
            <i class="fa-solid fa-arrow-left"></i> Back to Form
        </button>
        <h2><i class="fa-solid fa-plane"></i> Air Freight Quotes</h2>
        <p class="subtitle">Compare rates from multiple airlines and forwarders</p>
    </div>
    <div id="airfreight-quotes-container"></div>
    `;
}

function renderPaymentView(): string {
    return `
    <div class="service-page-header">
        <h2><i class="fa-solid fa-credit-card"></i> Payment</h2>
        <p class="subtitle">Complete your air freight booking</p>
    </div>
    <div class="payment-container">
        <p>Payment processing for air freight bookings...</p>
    </div>
    `;
}

function renderConfirmationView(): string {
    return `
    <div class="service-page-header">
        <h2><i class="fa-solid fa-check-circle"></i> Booking Confirmed</h2>
        <p class="subtitle">Your air freight shipment has been booked successfully</p>
    </div>
    <div class="confirmation-container">
        <p>Your air freight booking confirmation details...</p>
    </div>
    `;
}

function setupFormEventListeners() {
    // Back to services
    const backBtn = document.getElementById('airfreight-back-to-services');
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
            const type = target.dataset.type as AirfreightFormData['serviceType'];
            if (type) {
                formData.serviceType = type;
                serviceTypeBtns.forEach(b => b.classList.remove('active'));
                target.classList.add('active');
            }
        });
    });

    // Navigation buttons
    const prevBtn = document.getElementById('airfreight-prev-btn');
    const nextBtn = document.getElementById('airfreight-next-btn');
    const form = document.getElementById('airfreight-details-form') as HTMLFormElement;

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
                submitAirfreightForm();
            }
        });
    }

    // Cargo management
    const addPieceBtn = document.getElementById('airfreight-add-piece-btn');
    if (addPieceBtn) {
        addPieceBtn.addEventListener('click', showAddCargoModal);
    }

    // Remove cargo buttons
    document.querySelectorAll('.remove-cargo-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const index = parseInt(target.dataset.index || '0');
            formData.cargoPieces.splice(index, 1);
            renderCurrentView();
        });
    });

    // HS Code suggestions
    const hsCodeInput = document.getElementById('airfreight-hs-code') as HTMLInputElement;
    if (hsCodeInput) {
        hsCodeInput.addEventListener('input', debounce(suggestHsCode, 300));
    }

    // Airport code formatting
    const originInput = document.getElementById('airfreight-origin') as HTMLInputElement;
    const destinationInput = document.getElementById('airfreight-destination') as HTMLInputElement;
    
    [originInput, destinationInput].forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                const target = e.target as HTMLInputElement;
                target.value = target.value.toUpperCase();
            });
        }
    });
}

function setupResultsEventListeners() {
    const backBtn = document.getElementById('airfreight-back-to-form');
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
            return validateRouteServiceStep();
        case 2:
            return validateCargoDetailsStep();
        case 3:
            return validateDimensionsStep();
        case 4:
            return true; // Review step doesn't need validation
        default:
            return false;
    }
}

function validateRouteServiceStep(): boolean {
    let isValid = true;
    
    const origin = document.getElementById('airfreight-origin') as HTMLInputElement;
    const destination = document.getElementById('airfreight-destination') as HTMLInputElement;
    
    if (!origin?.value.trim() || origin.value.length !== 3) {
        showFieldError('airfreight-origin-error', 'Please enter a valid 3-letter IATA airport code');
        isValid = false;
    }
    
    if (!destination?.value.trim() || destination.value.length !== 3) {
        showFieldError('airfreight-destination-error', 'Please enter a valid 3-letter IATA airport code');
        isValid = false;
    }
    
    return isValid;
}

function validateCargoDetailsStep(): boolean {
    let isValid = true;
    
    const cargoDescription = document.getElementById('airfreight-cargo-description') as HTMLTextAreaElement;
    
    if (!cargoDescription?.value.trim()) {
        showFieldError('airfreight-cargo-description-error', 'Cargo description is required');
        isValid = false;
    }
    
    return isValid;
}

function validateDimensionsStep(): boolean {
    if (formData.cargoPieces.length === 0) {
        showToast('Please add at least one cargo piece', 'error');
        return false;
    }
    return true;
}

function saveCurrentStepData() {
    switch (currentStep) {
        case 1:
            saveRouteServiceData();
            break;
        case 2:
            saveCargoDetailsData();
            break;
        case 3:
            // Cargo pieces are saved when they are added/modified
            break;
    }
}

function saveRouteServiceData() {
    const origin = document.getElementById('airfreight-origin') as HTMLInputElement;
    const destination = document.getElementById('airfreight-destination') as HTMLInputElement;
    
    if (origin) formData.originAirport = origin.value.trim().toUpperCase();
    if (destination) formData.destinationAirport = destination.value.trim().toUpperCase();
}

function saveCargoDetailsData() {
    const cargoDescription = document.getElementById('airfreight-cargo-description') as HTMLTextAreaElement;
    const hsCode = document.getElementById('airfreight-hs-code') as HTMLInputElement;
    const specialRequirements = document.getElementById('airfreight-special-requirements') as HTMLTextAreaElement;
    
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

function showAddCargoModal() {
    // Simple cargo addition - in a real app this would be a modal
    const pieces = parseInt(prompt('Number of pieces:') || '1');
    const length = parseInt(prompt('Length (cm):') || '100');
    const width = parseInt(prompt('Width (cm):') || '100');
    const height = parseInt(prompt('Height (cm):') || '100');
    const weight = parseFloat(prompt('Weight per piece (kg):') || '10');
    
    if (pieces > 0 && length > 0 && width > 0 && height > 0 && weight > 0) {
        formData.cargoPieces.push({
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
    return formData.cargoPieces.reduce((total, piece) => {
        return total + (piece.length * piece.width * piece.height) / 1000000 * piece.pieces;
    }, 0);
}

function getTotalActualWeight(): number {
    return formData.cargoPieces.reduce((total, piece) => {
        return total + piece.weight * piece.pieces;
    }, 0);
}

function getTotalVolumetricWeight(): number {
    return formData.cargoPieces.reduce((total, piece) => {
        return total + ((piece.length * piece.width * piece.height) / 5000) * piece.pieces;
    }, 0);
}

function getChargeableWeight(): number {
    const actualWeight = getTotalActualWeight();
    const volumetricWeight = getTotalVolumetricWeight();
    return Math.max(actualWeight, volumetricWeight);
}

function suggestHsCode() {
    const input = document.getElementById('airfreight-hs-code') as HTMLInputElement;
    if (!input || input.value.length < 3) return;
    
    // Mock HS code suggestions
    const suggestions = [
        '8517.12.00 - Telephones for cellular networks',
        '8507.60.00 - Lithium-ion batteries',
        '8471.30.01 - Portable digital automatic data processing machines'
    ];
    
    const suggestionsContainer = document.getElementById('airfreight-hs-code-suggestions');
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

function submitAirfreightForm() {
    showToast('Getting air freight quotes...', 'info');
    
    // Mock quote generation
    setTimeout(() => {
        currentView = 'results';
        renderCurrentView();
        showToast('Air freight quotes loaded successfully!', 'success');
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

// --- INITIALIZATION ---
export function startAirfreight() {
    setState({ currentService: 'airfreight' });
    
    // Check if returning from payment
    const confirmationData = sessionStorage.getItem('vcanship_show_confirmation');
    if (confirmationData) {
        try {
            const data = JSON.parse(confirmationData);
            if (data.service === 'airfreight') {
                // Restore state for confirmation view
                setState({ airfreightQuote: data.quote });
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
    renderAirfreightPage();
}

// --- MAIN EXPORT ---
export function renderAirfreightPage() {
    currentView = 'form';
    currentStep = 1;
    switchPage('airfreight');
    renderCurrentView();
}