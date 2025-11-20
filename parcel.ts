// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { jsPDF } from 'jspdf';
import { State, setState, type Quote, type Address, resetParcelState, type DropOffLocation, ApiResponse } from './state';
import { checkAndDecrementLookup, getParcelRatesFromBackend } from './api';
import { showToast, switchPage, toggleLoading } from './ui';
import { DOMElements } from './dom';
import { t } from './i18n';
import { attachDynamicPostcodeValidation } from './validation';
import { MARKUP_CONFIG } from './pricing';
import { Type } from '@google/genai';

let allQuotes: Quote[] = [];
let carriers: string[] = [];
let currentView: 'form' | 'results' | 'payment' | 'confirmation' = 'form';
let currentStep: number = 1;
const totalSteps: number = 5;

// Parcel form data
interface ParcelFormData {
    // Sender Info
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    senderAddress: string;
    senderCity: string;
    senderPostcode: string;
    senderCountry: string;
    
    // Recipient Info
    recipientName: string;
    recipientEmail: string;
    recipientPhone: string;
    recipientAddress: string;
    recipientCity: string;
    recipientPostcode: string;
    recipientCountry: string;
    
    // Parcel Details
    parcelType: 'document' | 'box' | 'envelope' | 'pallet' | 'other';
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    itemValue: number;
    itemDescription: string;
    
    // Extra Options
    insurance: boolean;
    signatureRequired: boolean;
    fragile: boolean;
    deliveryInstructions: string;
}

let formData: ParcelFormData = {
    senderName: '',
    senderEmail: '',
    senderPhone: '',
    senderAddress: '',
    senderCity: '',
    senderPostcode: '',
    senderCountry: '',
    recipientName: '',
    recipientEmail: '',
    recipientPhone: '',
    recipientAddress: '',
    recipientCity: '',
    recipientPostcode: '',
    recipientCountry: '',
    parcelType: 'box',
    weight: 0,
    length: undefined,
    width: undefined,
    height: undefined,
    itemValue: 0,
    itemDescription: '',
    insurance: false,
    signatureRequired: false,
    fragile: false,
    deliveryInstructions: ''
};

// --- VIEW RENDERING ---

function renderCurrentView() {
    const page = document.getElementById('page-parcel');
    if (!page) {
        console.error('page-parcel element not found');
        return;
    }

    // Clear any existing content first
    page.innerHTML = '';
    page.style.opacity = '0';
    
    setTimeout(() => {
        try {
            switch (currentView) {
                case 'form':
                    const formHtml = renderFormView();
                    page.innerHTML = formHtml;
                    // Verify the new form was rendered
                    if (!page.querySelector('.parcel-progress-indicator')) {
                        console.error('New parcel form not rendered! Old form detected.');
                        // Force re-render
                        page.innerHTML = formHtml;
                    }
                    attachFormListeners();
                    break;
                case 'results':
                    page.innerHTML = renderResultsView(allQuotes);
                    attachResultsListeners();
                    break;
                case 'payment':
                    page.innerHTML = renderPaymentView();
                    attachPaymentListeners();
                    break;
                case 'confirmation':
                    page.innerHTML = renderConfirmationView();
                    attachConfirmationListeners();
                    break;
            }
            page.style.opacity = '1';
        } catch (error) {
            console.error('Error rendering parcel view:', error);
            page.innerHTML = '<div class="form-container"><p>Error loading form. Please refresh the page.</p></div>';
            page.style.opacity = '1';
        }
    }, 200);
}

function renderFormView(): string {
    return `
        <button class="back-btn static-link" data-page="landing"><i class="fa-solid fa-arrow-left"></i> Back to Services</button>
        <div class="service-page-header" style="margin-bottom: 2rem;">
            <h2>${t('parcel.title')}</h2>
            <p class="subtitle">${t('parcel.subtitle')}</p>
        </div>
        
        <!-- Progress Indicator -->
        <div class="parcel-progress-indicator">
            ${Array.from({ length: totalSteps }, (_, i) => `
                <div class="progress-step ${i + 1 === currentStep ? 'active' : i + 1 < currentStep ? 'completed' : ''}" data-step="${i + 1}">
                    <div class="progress-step-number">${i + 1 < currentStep ? '<i class="fa-solid fa-check"></i>' : i + 1}</div>
                    <div class="progress-step-label">${getStepLabel(i + 1)}</div>
                </div>
            `).join('')}
        </div>
        
        <div class="parcel-form-layout">
            <div class="parcel-form-main">
                <form id="parcel-details-form" novalidate>
                    ${renderStepContent()}
                    
                    <div class="form-actions" style="margin-top: 2rem; display: flex; justify-content: space-between;">
                        ${currentStep > 1 ? `<button type="button" id="parcel-prev-btn" class="secondary-btn"><i class="fa-solid fa-arrow-left"></i> ${t('parcel.buttons.previous')}</button>` : '<div></div>'}
                        ${currentStep < totalSteps ? `<button type="button" id="parcel-next-btn" class="main-submit-btn">${t('parcel.buttons.next')}: ${getStepLabel(currentStep + 1)} <i class="fa-solid fa-arrow-right"></i></button>` : `<button type="submit" class="main-submit-btn">${t('parcel.buttons.get_quotes')} <i class="fa-solid fa-search"></i></button>`}
                    </div>
                </form>
            </div>
            
            <aside class="parcel-form-sidebar">
                <!-- Support Card -->
                <div class="card support-card" style="margin-bottom: 1.5rem;">
                    <h3><i class="fa-solid fa-circle-question"></i> ${t('parcel.support.title')}</h3>
                    <p class="helper-text">${t('parcel.support.description')}</p>
                    <div class="support-actions">
                        <button class="secondary-btn" id="parcel-help-btn" style="width: 100%; margin-bottom: 0.5rem;">
                            <i class="fa-solid fa-book"></i> ${t('parcel.support.faq')}
                        </button>
                        <button class="secondary-btn" id="parcel-contact-btn" style="width: 100%;">
                            <i class="fa-solid fa-envelope"></i> ${t('parcel.support.contact')}
                        </button>
                    </div>
                </div>
                
                <!-- Drop-off Points Card -->
                <div class="card">
                    <h3><i class="fa-solid fa-location-dot"></i> ${t('parcel.dropoff.title')}</h3>
                    <p class="helper-text" style="margin-bottom: 1rem;">${t('parcel.dropoff.description')}</p>
                    <form id="parcel-dropoff-search-form">
                        <div class="input-wrapper">
                            <label for="postcode-search">${t('parcel.dropoff.postcode')}</label>
                            <input type="text" id="postcode-search" placeholder="${t('parcel.dropoff.postcode_placeholder')}">
                            <small class="field-hint">${t('parcel.dropoff.postcode_hint')}</small>
                        </div>
                        <div class="form-actions" style="margin-top: 1rem; justify-content: flex-start;">
                            <button type="submit" class="secondary-btn">
                                <i class="fa-solid fa-magnifying-glass-location"></i> ${t('parcel.dropoff.search')}
                            </button>
                        </div>
                    </form>
                </div>
            </aside>
        </div>
    `;
}

function getStepLabel(step: number): string {
    const labels = [
        t('parcel.steps.sender'),
        t('parcel.steps.recipient'),
        t('parcel.steps.details'),
        t('parcel.steps.options'),
        t('parcel.steps.review')
    ];
    return labels[step - 1] || '';
}

function renderStepContent(): string {
    switch (currentStep) {
        case 1:
            return renderSenderStep();
        case 2:
            return renderRecipientStep();
        case 3:
            return renderParcelDetailsStep();
        case 4:
            return renderOptionsStep();
        case 5:
            return renderReviewStep();
        default:
            return '';
    }
}

function renderSenderStep(): string {
    return `
        <div class="form-section">
            <h3><i class="fa-solid fa-user"></i> Sender Information</h3>
            <p class="section-description">Enter your contact details. This information will be used for the shipping label and tracking updates.</p>
            
            <div class="input-wrapper">
                <label for="sender-name">
                    Full Name <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter your full name as it should appear on the shipping label"></i>
                </label>
                <input type="text" id="sender-name" placeholder="John Smith" required value="${formData.senderName}">
                <small class="field-hint">Required for shipping label</small>
                <div class="field-error" id="sender-name-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="sender-email">
                    Email Address
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Optional: We'll send tracking updates to this email"></i>
                </label>
                <input type="email" id="sender-email" placeholder="john.smith@example.com" value="${formData.senderEmail}">
                <small class="field-hint">Optional - for tracking notifications</small>
                <div class="field-error" id="sender-email-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="sender-phone">
                    Phone Number
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Optional: Include country code (e.g., +44 for UK)"></i>
                </label>
                <input type="tel" id="sender-phone" placeholder="+44 20 1234 5678" value="${formData.senderPhone}">
                <small class="field-hint">Optional - Format: +[country code] [number]</small>
                <div class="field-error" id="sender-phone-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="sender-address">
                    Street Address <span class="required">*</span>
                </label>
                <input type="text" id="sender-address" placeholder="123 Main Street" required value="${formData.senderAddress}">
                <div class="field-error" id="sender-address-error"></div>
            </div>
            
            <div class="form-row">
                <div class="input-wrapper">
                    <label for="sender-city">
                        City <span class="required">*</span>
                    </label>
                    <input type="text" id="sender-city" placeholder="London" required value="${formData.senderCity}">
                    <div class="field-error" id="sender-city-error"></div>
                </div>
                
                <div class="input-wrapper">
                    <label for="sender-postcode">
                        Postcode <span class="required">*</span>
                        <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter postcode or country code (e.g., GB, US)"></i>
                    </label>
                    <input type="text" id="sender-postcode" placeholder="SW1A 1AA or GB" required value="${formData.senderPostcode}">
                    <div class="field-error" id="sender-postcode-error"></div>
                </div>
            </div>
            
            <div class="input-wrapper">
                <label for="sender-country">
                    Country <span class="required">*</span>
                </label>
                <input type="text" id="sender-country" placeholder="United Kingdom" required value="${formData.senderCountry}">
                <div class="field-error" id="sender-country-error"></div>
            </div>
        </div>
    `;
}

function renderRecipientStep(): string {
    return `
        <div class="form-section">
            <h3><i class="fa-solid fa-user-tag"></i> Recipient Information</h3>
            <p class="section-description">Enter the recipient's contact details. This information is required for delivery.</p>
            
            <div class="input-wrapper">
                <label for="recipient-name">
                    Full Name <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter the recipient's full name as it should appear on the shipping label"></i>
                </label>
                <input type="text" id="recipient-name" placeholder="Jane Doe" required value="${formData.recipientName}">
                <small class="field-hint">Required for shipping label</small>
                <div class="field-error" id="recipient-name-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="recipient-email">
                    Email Address
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Optional: Recipient will receive delivery notifications"></i>
                </label>
                <input type="email" id="recipient-email" placeholder="jane.doe@example.com" value="${formData.recipientEmail}">
                <small class="field-hint">Optional - for delivery notifications</small>
                <div class="field-error" id="recipient-email-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="recipient-phone">
                    Phone Number
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Optional: Include country code (e.g., +1 for USA)"></i>
                </label>
                <input type="tel" id="recipient-phone" placeholder="+1 555 123 4567" value="${formData.recipientPhone}">
                <small class="field-hint">Optional - Format: +[country code] [number]</small>
                <div class="field-error" id="recipient-phone-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="recipient-address">
                    Street Address <span class="required">*</span>
                </label>
                <input type="text" id="recipient-address" placeholder="456 Oak Avenue" required value="${formData.recipientAddress}">
                <div class="field-error" id="recipient-address-error"></div>
            </div>
            
            <div class="form-row">
                <div class="input-wrapper">
                    <label for="recipient-city">
                        City <span class="required">*</span>
                    </label>
                    <input type="text" id="recipient-city" placeholder="New York" required value="${formData.recipientCity}">
                    <div class="field-error" id="recipient-city-error"></div>
                </div>
                
                <div class="input-wrapper">
                    <label for="recipient-postcode">
                        Postcode <span class="required">*</span>
                        <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Enter postcode or country code (e.g., US, GB)"></i>
                    </label>
                    <input type="text" id="recipient-postcode" placeholder="10001 or US" required value="${formData.recipientPostcode}">
                    <div class="field-error" id="recipient-postcode-error"></div>
                </div>
            </div>
            
            <div class="input-wrapper">
                <label for="recipient-country">
                    Country <span class="required">*</span>
                </label>
                <input type="text" id="recipient-country" placeholder="United States" required value="${formData.recipientCountry}">
                <div class="field-error" id="recipient-country-error"></div>
            </div>
        </div>
    `;
}

function renderParcelDetailsStep(): string {
    return `
        <div class="form-section">
            <h3><i class="fa-solid fa-box"></i> Parcel Details</h3>
            <p class="section-description">Tell us about your parcel to get accurate shipping rates.</p>
            
            <div class="input-wrapper">
                <label for="parcel-type">
                    Parcel Type <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Select the type that best describes your shipment"></i>
                </label>
                <select id="parcel-type" required>
                    <option value="document" ${formData.parcelType === 'document' ? 'selected' : ''}>📄 Document</option>
                    <option value="envelope" ${formData.parcelType === 'envelope' ? 'selected' : ''}>✉️ Envelope</option>
                    <option value="box" ${formData.parcelType === 'box' ? 'selected' : ''}>📦 Box</option>
                    <option value="pallet" ${formData.parcelType === 'pallet' ? 'selected' : ''}>🛒 Pallet</option>
                    <option value="other" ${formData.parcelType === 'other' ? 'selected' : ''}>📋 Other</option>
                </select>
                <small class="field-hint">This helps us suggest the best shipping options</small>
                <div class="field-error" id="parcel-type-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="item-description">
                    Item Description <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Brief description of contents (required for customs)"></i>
                </label>
                <textarea id="item-description" placeholder="e.g., Electronics, Clothing, Books" required rows="3">${formData.itemDescription}</textarea>
                <small class="field-hint">Required for customs declaration</small>
                <div class="field-error" id="item-description-error"></div>
            </div>
            
            <div class="input-wrapper">
                <label for="package-weight">
                    Weight (kg) <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Maximum weight: 1000 kg per parcel"></i>
                </label>
                <input type="number" id="package-weight" placeholder="e.g., 2.5" required min="0.1" max="1000" step="0.1" value="${formData.weight || ''}">
                <small class="field-hint">Enter weight in kilograms (0.1 - 1000 kg)</small>
                <div class="field-error" id="package-weight-error"></div>
            </div>
            
            <div class="form-section-subtitle">
                <h4>Dimensions (Optional but Recommended)</h4>
                <p class="helper-text">Accurate dimensions help us provide better rates and ensure your parcel fits carrier requirements.</p>
            </div>
            
            <div class="form-row">
                <div class="input-wrapper">
                    <label for="package-length">
                        Length (cm)
                        <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Longest side of the parcel"></i>
                    </label>
                    <input type="number" id="package-length" placeholder="30" min="1" step="0.1" value="${formData.length || ''}">
                </div>
                
                <div class="input-wrapper">
                    <label for="package-width">
                        Width (cm)
                        <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Second longest side"></i>
                    </label>
                    <input type="number" id="package-width" placeholder="20" min="1" step="0.1" value="${formData.width || ''}">
                </div>
                
                <div class="input-wrapper">
                    <label for="package-height">
                        Height (cm)
                        <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Shortest side"></i>
                    </label>
                    <input type="number" id="package-height" placeholder="15" min="1" step="0.1" value="${formData.height || ''}">
                </div>
            </div>
            
            <div class="input-wrapper">
                <label for="item-value">
                    Declared Value <span class="required">*</span>
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Value of items for customs and insurance purposes"></i>
                </label>
                <div class="currency-input-wrapper">
                    <span class="currency-symbol">${State.currentCurrency.symbol}</span>
                    <input type="number" id="item-value" placeholder="100.00" required min="0" step="0.01" value="${formData.itemValue || ''}">
                </div>
                <small class="field-hint">Required for customs declaration and insurance</small>
                <div class="field-error" id="item-value-error"></div>
            </div>
        </div>
    `;
}

function renderOptionsStep(): string {
    return `
        <div class="form-section">
            <h3><i class="fa-solid fa-sliders"></i> Additional Options</h3>
            <p class="section-description">Customize your shipment with optional services.</p>
            
            <div class="options-grid">
                <div class="option-card ${formData.insurance ? 'selected' : ''}" data-option="insurance">
                    <div class="option-header">
                        <input type="checkbox" id="insurance" ${formData.insurance ? 'checked' : ''}>
                        <label for="insurance">
                            <strong>Shipping Insurance</strong>
                            <span class="option-price">+${State.currentCurrency.symbol}${calculateInsuranceCost().toFixed(2)}</span>
                        </label>
                    </div>
                    <p class="option-description">Protect your shipment against loss or damage. Coverage up to ${State.currentCurrency.symbol}${formData.itemValue.toFixed(2)}</p>
                </div>
                
                <div class="option-card ${formData.signatureRequired ? 'selected' : ''}" data-option="signature">
                    <div class="option-header">
                        <input type="checkbox" id="signature-required" ${formData.signatureRequired ? 'checked' : ''}>
                        <label for="signature-required">
                            <strong>Signature Required</strong>
                            <span class="option-price">+${State.currentCurrency.symbol}5.00</span>
                        </label>
                    </div>
                    <p class="option-description">Require recipient signature upon delivery for added security.</p>
                </div>
                
                <div class="option-card ${formData.fragile ? 'selected' : ''}" data-option="fragile">
                    <div class="option-header">
                        <input type="checkbox" id="fragile" ${formData.fragile ? 'checked' : ''}>
                        <label for="fragile">
                            <strong>Fragile Handling</strong>
                            <span class="option-price">+${State.currentCurrency.symbol}3.00</span>
                        </label>
                    </div>
                    <p class="option-description">Extra careful handling for fragile items.</p>
                </div>
            </div>
            
            <div class="input-wrapper" style="margin-top: 1.5rem;">
                <label for="delivery-instructions">
                    Delivery Instructions (Optional)
                    <i class="fa-solid fa-circle-info tooltip-trigger" data-tooltip="Special instructions for the delivery driver"></i>
                </label>
                <textarea id="delivery-instructions" placeholder="e.g., Leave at front door, Ring doorbell twice" rows="3">${formData.deliveryInstructions}</textarea>
                <small class="field-hint">Any special delivery instructions</small>
            </div>
        </div>
    `;
}

function renderReviewStep(): string {
    const totalExtraCost = (formData.insurance ? calculateInsuranceCost() : 0) + 
                           (formData.signatureRequired ? 5.00 : 0) + 
                           (formData.fragile ? 3.00 : 0);
    
    return `
        <div class="form-section">
            <h3><i class="fa-solid fa-clipboard-check"></i> Review Your Details</h3>
            <p class="section-description">Please review all information before proceeding to get quotes.</p>
            
            <div class="review-sections">
                <div class="review-section">
                    <h4><i class="fa-solid fa-user"></i> Sender</h4>
                    <div class="review-details">
                        <p><strong>${formData.senderName}</strong></p>
                        <p>${formData.senderEmail}</p>
                        <p>${formData.senderPhone}</p>
                        <p>${formData.senderAddress}, ${formData.senderCity}</p>
                        <p>${formData.senderPostcode}, ${formData.senderCountry}</p>
                    </div>
                </div>
                
                <div class="review-section">
                    <h4><i class="fa-solid fa-user-tag"></i> Recipient</h4>
                    <div class="review-details">
                        <p><strong>${formData.recipientName}</strong></p>
                        <p>${formData.recipientEmail || 'No email provided'}</p>
                        <p>${formData.recipientPhone}</p>
                        <p>${formData.recipientAddress}, ${formData.recipientCity}</p>
                        <p>${formData.recipientPostcode}, ${formData.recipientCountry}</p>
                    </div>
                </div>
                
                <div class="review-section">
                    <h4><i class="fa-solid fa-box"></i> Parcel</h4>
                    <div class="review-details">
                        <p><strong>Type:</strong> ${formData.parcelType.charAt(0).toUpperCase() + formData.parcelType.slice(1)}</p>
                        <p><strong>Weight:</strong> ${formData.weight} kg</p>
                        ${formData.length && formData.width && formData.height ? 
                            `<p><strong>Dimensions:</strong> ${formData.length} × ${formData.width} × ${formData.height} cm</p>` : 
                            '<p><strong>Dimensions:</strong> Not provided</p>'}
                        <p><strong>Value:</strong> ${State.currentCurrency.symbol}${formData.itemValue.toFixed(2)}</p>
                        <p><strong>Description:</strong> ${formData.itemDescription}</p>
                    </div>
                </div>
                
                <div class="review-section">
                    <h4><i class="fa-solid fa-sliders"></i> Options</h4>
                    <div class="review-details">
                        ${formData.insurance ? `<p><i class="fa-solid fa-check"></i> Insurance (${State.currentCurrency.symbol}${calculateInsuranceCost().toFixed(2)})</p>` : ''}
                        ${formData.signatureRequired ? `<p><i class="fa-solid fa-check"></i> Signature Required (${State.currentCurrency.symbol}5.00)</p>` : ''}
                        ${formData.fragile ? `<p><i class="fa-solid fa-check"></i> Fragile Handling (${State.currentCurrency.symbol}3.00)</p>` : ''}
                        ${!formData.insurance && !formData.signatureRequired && !formData.fragile ? '<p>No additional options selected</p>' : ''}
                        ${formData.deliveryInstructions ? `<p><strong>Instructions:</strong> ${formData.deliveryInstructions}</p>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="review-summary">
                <div class="summary-line">
                    <span>Additional Services:</span>
                    <span>${State.currentCurrency.symbol}${totalExtraCost.toFixed(2)}</span>
                </div>
                <div class="summary-note">
                    <i class="fa-solid fa-info-circle"></i>
                    <span>Shipping rates will be calculated based on your parcel details. Additional service costs will be added to the final quote.</span>
                </div>
            </div>
        </div>
    `;
}

function calculateInsuranceCost(): number {
    // Insurance is typically 1-2% of declared value, minimum $5
    const insuranceRate = 0.015; // 1.5%
    const calculated = formData.itemValue * insuranceRate;
    return Math.max(calculated, 5.00);
}

// --- VALIDATION ---

function validateStep(step: number): boolean {
    let isValid = true;
    
    switch (step) {
        case 1:
            isValid = validateSenderStep();
            break;
        case 2:
            isValid = validateRecipientStep();
            break;
        case 3:
            isValid = validateParcelDetailsStep();
            break;
        case 4:
            // Options step doesn't require validation
            isValid = true;
            break;
        case 5:
            // Review step - all should be validated already
            isValid = true;
            break;
    }
    
    return isValid;
}

function validateSenderStep(): boolean {
    let isValid = true;
    
    const name = (document.getElementById('sender-name') as HTMLInputElement)?.value.trim();
    const email = (document.getElementById('sender-email') as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById('sender-phone') as HTMLInputElement)?.value.trim();
    const address = (document.getElementById('sender-address') as HTMLInputElement)?.value.trim();
    const city = (document.getElementById('sender-city') as HTMLInputElement)?.value.trim();
    const postcode = (document.getElementById('sender-postcode') as HTMLInputElement)?.value.trim();
    const country = (document.getElementById('sender-country') as HTMLInputElement)?.value.trim();
    
    if (!name) {
        showFieldError('sender-name-error', 'Name is required');
        isValid = false;
    } else {
        clearFieldError('sender-name-error');
    }
    
    // Email is optional, but if provided, must be valid
    if (email && !isValidEmail(email)) {
        showFieldError('sender-email-error', 'Please enter a valid email');
        isValid = false;
    } else {
        clearFieldError('sender-email-error');
    }
    
    // Phone is optional - no validation needed
    clearFieldError('sender-phone-error');
    
    if (!address) {
        showFieldError('sender-address-error', 'Address is required');
        isValid = false;
    } else {
        clearFieldError('sender-address-error');
    }
    
    if (!city) {
        showFieldError('sender-city-error', 'City is required');
        isValid = false;
    } else {
        clearFieldError('sender-city-error');
    }
    
    if (!postcode) {
        showFieldError('sender-postcode-error', 'Postcode is required');
        isValid = false;
    } else {
        clearFieldError('sender-postcode-error');
    }
    
    if (!country) {
        showFieldError('sender-country-error', 'Country is required');
        isValid = false;
    } else {
        clearFieldError('sender-country-error');
    }
    
    return isValid;
}

function validateRecipientStep(): boolean {
    let isValid = true;
    
    const name = (document.getElementById('recipient-name') as HTMLInputElement)?.value.trim();
    const email = (document.getElementById('recipient-email') as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById('recipient-phone') as HTMLInputElement)?.value.trim();
    const address = (document.getElementById('recipient-address') as HTMLInputElement)?.value.trim();
    const city = (document.getElementById('recipient-city') as HTMLInputElement)?.value.trim();
    const postcode = (document.getElementById('recipient-postcode') as HTMLInputElement)?.value.trim();
    const country = (document.getElementById('recipient-country') as HTMLInputElement)?.value.trim();
    
    if (!name) {
        showFieldError('recipient-name-error', 'Name is required');
        isValid = false;
    } else {
        clearFieldError('recipient-name-error');
    }
    
    if (email && !isValidEmail(email)) {
        showFieldError('recipient-email-error', 'Please enter a valid email');
        isValid = false;
    } else {
        clearFieldError('recipient-email-error');
    }
    
    // Phone is optional - no validation needed
    clearFieldError('recipient-phone-error');
    
    if (!address) {
        showFieldError('recipient-address-error', 'Address is required');
        isValid = false;
    } else {
        clearFieldError('recipient-address-error');
    }
    
    if (!city) {
        showFieldError('recipient-city-error', 'City is required');
        isValid = false;
    } else {
        clearFieldError('recipient-city-error');
    }
    
    if (!postcode) {
        showFieldError('recipient-postcode-error', 'Postcode is required');
        isValid = false;
    } else {
        clearFieldError('recipient-postcode-error');
    }
    
    if (!country) {
        showFieldError('recipient-country-error', 'Country is required');
        isValid = false;
    } else {
        clearFieldError('recipient-country-error');
    }
    
    return isValid;
}

function validateParcelDetailsStep(): boolean {
    let isValid = true;
    
    const parcelType = (document.getElementById('parcel-type') as HTMLSelectElement)?.value;
    const weight = parseFloat((document.getElementById('package-weight') as HTMLInputElement)?.value || '0');
    const itemValue = parseFloat((document.getElementById('item-value') as HTMLInputElement)?.value || '0');
    const description = (document.getElementById('item-description') as HTMLTextAreaElement)?.value.trim();
    
    if (!parcelType) {
        showFieldError('parcel-type-error', 'Please select a parcel type');
        isValid = false;
    } else {
        clearFieldError('parcel-type-error');
    }
    
    if (!description) {
        showFieldError('item-description-error', 'Item description is required for customs');
        isValid = false;
    } else {
        clearFieldError('item-description-error');
    }
    
    if (isNaN(weight) || weight <= 0 || weight > 1000) {
        showFieldError('package-weight-error', 'Weight must be between 0.1 and 1000 kg');
        isValid = false;
    } else {
        clearFieldError('package-weight-error');
    }
    
    if (isNaN(itemValue) || itemValue <= 0) {
        showFieldError('item-value-error', 'Declared value must be greater than 0');
        isValid = false;
    } else {
        clearFieldError('item-value-error');
    }
    
    return isValid;
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId: string, message: string) {
    const errorEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function clearFieldError(fieldId: string) {
    const errorEl = document.getElementById(fieldId);
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
}

// --- DATA COLLECTION ---

function collectFormData() {
    // Sender
    formData.senderName = (document.getElementById('sender-name') as HTMLInputElement)?.value.trim() || '';
    formData.senderEmail = (document.getElementById('sender-email') as HTMLInputElement)?.value.trim() || '';
    formData.senderPhone = (document.getElementById('sender-phone') as HTMLInputElement)?.value.trim() || '';
    formData.senderAddress = (document.getElementById('sender-address') as HTMLInputElement)?.value.trim() || '';
    formData.senderCity = (document.getElementById('sender-city') as HTMLInputElement)?.value.trim() || '';
    formData.senderPostcode = (document.getElementById('sender-postcode') as HTMLInputElement)?.value.trim() || '';
    formData.senderCountry = (document.getElementById('sender-country') as HTMLInputElement)?.value.trim() || '';
    
    // Recipient
    formData.recipientName = (document.getElementById('recipient-name') as HTMLInputElement)?.value.trim() || '';
    formData.recipientEmail = (document.getElementById('recipient-email') as HTMLInputElement)?.value.trim() || '';
    formData.recipientPhone = (document.getElementById('recipient-phone') as HTMLInputElement)?.value.trim() || '';
    formData.recipientAddress = (document.getElementById('recipient-address') as HTMLInputElement)?.value.trim() || '';
    formData.recipientCity = (document.getElementById('recipient-city') as HTMLInputElement)?.value.trim() || '';
    formData.recipientPostcode = (document.getElementById('recipient-postcode') as HTMLInputElement)?.value.trim() || '';
    formData.recipientCountry = (document.getElementById('recipient-country') as HTMLInputElement)?.value.trim() || '';
    
    // Parcel
    formData.parcelType = (document.getElementById('parcel-type') as HTMLSelectElement)?.value as any || 'box';
    formData.weight = parseFloat((document.getElementById('package-weight') as HTMLInputElement)?.value || '0');
    formData.length = parseFloat((document.getElementById('package-length') as HTMLInputElement)?.value || '0') || undefined;
    formData.width = parseFloat((document.getElementById('package-width') as HTMLInputElement)?.value || '0') || undefined;
    formData.height = parseFloat((document.getElementById('package-height') as HTMLInputElement)?.value || '0') || undefined;
    formData.itemValue = parseFloat((document.getElementById('item-value') as HTMLInputElement)?.value || '0');
    formData.itemDescription = (document.getElementById('item-description') as HTMLTextAreaElement)?.value.trim() || '';
    
    // Options
    formData.insurance = (document.getElementById('insurance') as HTMLInputElement)?.checked || false;
    formData.signatureRequired = (document.getElementById('signature-required') as HTMLInputElement)?.checked || false;
    formData.fragile = (document.getElementById('fragile') as HTMLInputElement)?.checked || false;
    formData.deliveryInstructions = (document.getElementById('delivery-instructions') as HTMLTextAreaElement)?.value.trim() || '';
}

function renderResultsView(quotes: Quote[]): string {
    carriers = [...new Set(quotes.map(q => q.carrierName))];
    return `
        <button class="back-btn" id="parcel-back-to-form-btn"><i class="fa-solid fa-arrow-left"></i> Back to Details</button>
        <div class="parcel-results-layout">
            <aside id="parcel-filters-sidebar" class="parcel-filters-sidebar">
                <div class="card" style="border-width: 1px;">
                    <div class="filter-group">
                        <h4>Filter Results</h4>
                        <div class="service-toggle-group">
                            <button class="service-toggle-btn active" data-filter="service" value="all">All</button>
                            <button class="service-toggle-btn" data-filter="service" value="Drop-off">Drop-off</button>
                            <button class="service-toggle-btn" data-filter="service" value="Collection">Collection</button>
                        </div>
                    </div>
                    <div class="filter-group">
                        <h4>Couriers</h4>
                        ${carriers.map(c => `<div class="checkbox-wrapper"><input type="checkbox" id="courier-${c.toLowerCase().replace(/\s/g, '')}" data-filter="courier" value="${c}" checked><label for="courier-${c.toLowerCase().replace(/\s/g, '')}">${c}</label></div>`).join('')}
                    </div>
                </div>
            </aside>
            <main id="parcel-quotes-container" class="parcel-quotes-main"></main>
        </div>
    `;
}

function renderPaymentView(): string {
    const quote = State.parcelSelectedQuote;
    if (!quote) return 'Error: No quote selected.';
    
    const extraCost = (formData.insurance ? calculateInsuranceCost() : 0) + 
                     (formData.signatureRequired ? 5.00 : 0) + 
                     (formData.fragile ? 3.00 : 0);
    const totalCost = quote.totalCost + extraCost;
    
    return `
        <button class="back-btn" id="parcel-back-to-results-btn"><i class="fa-solid fa-arrow-left"></i> Back to Quotes</button>
        <div class="form-container">
            <h3>Payment Summary</h3>
            <div class="card">
                <div class="payment-overview">
                    <h4 style="margin-bottom: 1rem;">Shipment Details</h4>
                    <div class="review-item"><span>From:</span><strong>${formData.senderName}, ${formData.senderCity}</strong></div>
                    <div class="review-item"><span>To:</span><strong>${formData.recipientName}, ${formData.recipientCity}</strong></div>
                    <div class="review-item"><span>Weight:</span><strong>${formData.weight} kg</strong></div>
                    <hr style="margin: 1rem 0;">
                    <h4 style="margin-bottom: 1rem;">Pricing</h4>
                    <div class="review-item"><span>Carrier:</span><strong>${quote.carrierName}</strong></div>
                    <div class="review-item"><span>Service:</span><strong>${quote.carrierType}</strong></div>
                    <div class="review-item"><span>Estimated Delivery:</span><strong>${quote.estimatedTransitTime}</strong></div>
                    <div class="review-item"><span>Shipping Cost:</span><strong>${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}</strong></div>
                    ${extraCost > 0 ? `<div class="review-item"><span>Additional Services:</span><strong>${State.currentCurrency.symbol}${extraCost.toFixed(2)}</strong></div>` : ''}
                    <hr style="margin: 1rem 0;">
                    <div class="review-item total"><span>Total Cost:</span><strong>${State.currentCurrency.symbol}${totalCost.toFixed(2)}</strong></div>
                </div>
                <p class="helper-text" style="text-align: center; margin-top: 1.5rem;">This is a simulated payment step. In production, this would connect to a payment gateway.</p>
            </div>
            <div class="form-actions" style="margin-top: 2rem;">
                <button id="parcel-confirm-payment-btn" class="main-submit-btn">
                    <i class="fa-solid fa-credit-card"></i> Confirm & Pay ${State.currentCurrency.symbol}${totalCost.toFixed(2)}
                </button>
            </div>
        </div>
    `;
}

function renderConfirmationView(): string {
    const trackingId = `PAR-${Date.now().toString().slice(-7)}`;
    const quote = State.parcelSelectedQuote;
    
    return `
        <div class="confirmation-container">
            <h3 id="parcel-confirmation-title">
                <div class="confirmation-icon-wrapper">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                </div>
                <span>Shipment Confirmed!</span>
            </h3>
            <p>Your parcel has been booked. ${formData.senderEmail ? 'Details have been sent to your email.' : 'Please save your tracking ID below.'}</p>
            <div class="confirmation-tracking">
                <h4>Your Tracking ID</h4>
                <div class="tracking-id-display">${trackingId}</div>
            </div>
            <div class="confirmation-details" style="margin: 2rem 0; padding: 1.5rem; background: var(--light-gray); border-radius: var(--card-border-radius);">
                <h4 style="margin-bottom: 1rem;">Shipment Summary</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                    <div>
                        <strong>From:</strong><br>
                        ${formData.senderName}<br>
                        ${formData.senderAddress}<br>
                        ${formData.senderCity}, ${formData.senderPostcode}<br>
                        ${formData.senderCountry}
                    </div>
                    <div>
                        <strong>To:</strong><br>
                        ${formData.recipientName}<br>
                        ${formData.recipientAddress}<br>
                        ${formData.recipientCity}, ${formData.recipientPostcode}<br>
                        ${formData.recipientCountry}
                    </div>
                </div>
                ${quote ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <strong>Carrier:</strong> ${quote.carrierName}<br>
                        <strong>Service:</strong> ${quote.carrierType}<br>
                        <strong>Weight:</strong> ${formData.weight} kg<br>
                        <strong>Total Cost:</strong> ${State.currentCurrency.symbol}${(quote.totalCost + (formData.insurance ? calculateInsuranceCost() : 0) + (formData.signatureRequired ? 5.00 : 0) + (formData.fragile ? 3.00 : 0)).toFixed(2)}
                    </div>
                ` : ''}
            </div>
            <div class="confirmation-actions" style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button id="parcel-print-label-btn" class="secondary-btn" style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-print"></i> Print Shipping Label
                </button>
                <button id="parcel-download-label-btn" class="secondary-btn" style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fa-solid fa-download"></i> Download Label (PDF)
                </button>
                <button id="parcel-new-shipment-btn" class="main-submit-btn">New Shipment</button>
            </div>
        </div>
    `;
}

// --- LOGIC AND EVENT HANDLERS ---

async function handleFormSubmit(e: Event) {
    e.preventDefault();
    
    if (currentStep < totalSteps) {
        // Validate current step and move to next
        collectFormData();
        if (validateStep(currentStep)) {
            currentStep++;
            renderCurrentView();
        }
    } else {
        // Final step - get quotes
        collectFormData();
        if (!validateStep(currentStep)) {
            return;
        }
        
        if (!checkAndDecrementLookup()) return;

        toggleLoading(true, "Fetching live shipping rates...");

        try {
            const apiParams = {
                originPostcode: formData.senderPostcode,
                destinationPostcode: formData.recipientPostcode,
                weightKg: formData.weight,
                lengthCm: formData.length,
                widthCm: formData.width,
                heightCm: formData.height,
            };
            
            console.log('Sending to backend:', apiParams);
            const quotes = await getParcelRatesFromBackend(apiParams);

            allQuotes = quotes.map(q => ({
                ...q,
                chargeableWeight: formData.weight,
                chargeableWeightUnit: 'kg',
            }));
            
            // Add extra costs to quotes
            const extraCost = (formData.insurance ? calculateInsuranceCost() : 0) + 
                             (formData.signatureRequired ? 5.00 : 0) + 
                             (formData.fragile ? 3.00 : 0);
            
            allQuotes = allQuotes.map(q => ({
                ...q,
                totalCost: q.totalCost + extraCost,
                costBreakdown: {
                    ...q.costBreakdown,
                    optionalInsuranceCost: formData.insurance ? calculateInsuranceCost() : 0,
                }
            }));
            
            setState({ 
                parcelOrigin: { 
                    postcode: formData.senderPostcode,
                    address: formData.senderAddress,
                    city: formData.senderCity,
                    country: formData.senderCountry
                }, 
                parcelDestination: { 
                    postcode: formData.recipientPostcode,
                    address: formData.recipientAddress,
                    city: formData.recipientCity,
                    country: formData.recipientCountry
                }, 
                parcelInitialWeight: formData.weight,
                parcelDeclaredValue: formData.itemValue,
                parcelInsuranceAdded: formData.insurance,
                parcelInsuranceCost: formData.insurance ? calculateInsuranceCost() : 0,
            });
            
            currentView = 'results';
            renderCurrentView();

        } catch (error) {
            console.error('Error getting quotes:', error);
            showToast("Sorry, we couldn't fetch quotes at this time.", "error");
        } finally {
            toggleLoading(false);
        }
    }
}

function applyAndRenderFilteredQuotes() {
    const quotesContainer = document.getElementById('parcel-quotes-container');
    if (!quotesContainer) return;
    
    const serviceFilter = (document.querySelector('.service-toggle-btn.active') as HTMLElement)?.dataset.value || 'all';
    const selectedCouriers = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-filter="courier"]:checked')).map(cb => cb.value);

    const filteredQuotes = allQuotes.filter(q => {
        const serviceMatch = serviceFilter === 'all' || q.carrierType.toLowerCase().includes(serviceFilter.toLowerCase());
        const courierMatch = selectedCouriers.includes(q.carrierName);
        return serviceMatch && courierMatch;
    });

    if (filteredQuotes.length === 0) {
        quotesContainer.innerHTML = `<p class="helper-text">No services match your criteria. Try adjusting the filters.</p>`;
        return;
    }

    quotesContainer.innerHTML = filteredQuotes.map(createDetailedQuoteCard).join('');
}

function createDetailedQuoteCard(quote: Quote): string {
    const safeQuoteData = JSON.stringify(quote).replace(/"/g, '&quot;');
    return `
        <div class="card p2g-quote-card" data-carrier="${quote.carrierName}">
            <div class="p2g-quote-header">
                <img src="https://logo.clearbit.com/${quote.carrierName.toLowerCase().replace(/\s/g, '')}.com?size=80" alt="${quote.carrierName}" class="carrier-logo" onerror="this.style.display='none'">
                <div class="p2g-quote-info">
                    <h4>${quote.carrierName}</h4>
                    <p>${quote.carrierType}</p>
                </div>
            </div>
            <div class="p2g-quote-price">
                <span class="price-display">${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}</span>
                <button class="main-submit-btn select-quote-btn" data-quote="${safeQuoteData}">Select & Proceed</button>
            </div>
            <div class="p2g-quote-features">
                <div class="feature-item"><i class="fa-solid fa-clock"></i><span>${quote.estimatedTransitTime}</span></div>
            </div>
        </div>
    `;
}

// NEW: Function to handle finding and displaying drop-off locations
async function findDropoffLocations(postcode: string) {
    const modal = document.getElementById('dropoff-locations-modal');
    const closeBtn = document.getElementById('close-dropoff-modal-btn');
    const listContainer = document.getElementById('dropoff-locations-list');
    const loadingContainer = modal?.querySelector('.loading-spinner-container') as HTMLElement;
    const descEl = document.getElementById('dropoff-modal-desc');

    if (!modal || !closeBtn || !listContainer || !loadingContainer || !descEl) {
        console.error('Dropoff modal elements not found.');
        return;
    }
    
    // Show modal and loading state
    modal.classList.add('active');
    listContainer.innerHTML = '';
    loadingContainer.style.display = 'flex';
    descEl.textContent = `Searching for locations near ${postcode}...`;

    const closeModal = () => modal.classList.remove('active');
    closeBtn.onclick = closeModal;

    if (!State.api) {
        showToast("AI service is not available.", "error");
        loadingContainer.style.display = 'none';
        listContainer.innerHTML = '<li class="helper-text" style="padding: 1rem;">Could not connect to service.</li>';
        return;
    }
    if (!checkAndDecrementLookup()) {
        closeModal();
        return;
    }

    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        
        const prompt = `Find up to 10 parcel drop-off locations (like post offices, courier points, or convenience stores with parcel services) near ${postcode}.`;

        const response = await State.api.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        locations: {
                            type: Type.ARRAY,
                            description: 'A list of nearby parcel drop-off locations.',
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: 'The name of the location.' },
                                    address: { type: Type.STRING, description: 'The full street address of the location.' }
                                }
                            }
                        }
                    }
                },
                toolConfig: {
                    retrievalConfig: {
                        latLng: {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        }
                    }
                }
            },
        });

        const result = JSON.parse(response.text);
        const locations = result.locations || [];
        
        loadingContainer.style.display = 'none';
        
        if (locations.length > 0) {
            descEl.textContent = `Select a location to get directions.`;
            listContainer.innerHTML = locations.map((loc: { name: string, address: string }) => `
                <li class="dropoff-location-item" data-address="${encodeURIComponent(loc.address)}">
                    <div class="location-icon"><i class="fa-solid fa-location-dot"></i></div>
                    <div class="location-info">
                        <strong>${loc.name}</strong>
                        <span>${loc.address}</span>
                    </div>
                </li>
            `).join('');
            
            listContainer.querySelectorAll('.dropoff-location-item').forEach(item => {
                item.addEventListener('click', () => {
                    const address = (item as HTMLElement).dataset.address;
                    if (address) {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`;
                        window.open(url, '_blank');
                        closeModal();
                    }
                });
            });
        } else {
            descEl.textContent = `No locations found.`;
            listContainer.innerHTML = '<li class="helper-text" style="padding: 1rem;">We couldn\'t find any drop-off locations for that area. Please try a different postcode.</li>';
        }

    } catch (error: any) {
        console.error("Error finding drop-off locations:", error);
        loadingContainer.style.display = 'none';
        listContainer.innerHTML = '<li class="helper-text" style="padding: 1rem;">Sorry, there was an error finding locations. Please try again.</li>';
        if (error.code === 1) { // Geolocation permission denied
            showToast("Please allow location access to find nearby drop-off points.", "warning");
            descEl.textContent = "Location access is required for this feature.";
        } else {
            showToast("An error occurred while searching for locations.", "error");
        }
    }
}

// --- EVENT LISTENER ATTACHMENT ---

function attachFormListeners() {
    const form = document.getElementById('parcel-details-form');
    form?.addEventListener('submit', handleFormSubmit);
    
    // Previous button
    document.getElementById('parcel-prev-btn')?.addEventListener('click', () => {
        if (currentStep > 1) {
            collectFormData();
            currentStep--;
            renderCurrentView();
        }
    });
    
    // Next button (if not final step)
    document.getElementById('parcel-next-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        collectFormData();
        if (validateStep(currentStep)) {
            currentStep++;
            renderCurrentView();
        }
    });
    
    // Option cards toggle
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const checkbox = card.querySelector('input[type="checkbox"]') as HTMLInputElement;
            if (checkbox && e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                card.classList.toggle('selected', checkbox.checked);
            }
        });
    });
    
    // Tooltips
    document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
        trigger.addEventListener('mouseenter', (e) => {
            const tooltip = trigger.getAttribute('data-tooltip');
            if (tooltip) {
                // Simple tooltip implementation
                const tooltipEl = document.createElement('div');
                tooltipEl.className = 'tooltip';
                tooltipEl.textContent = tooltip;
                document.body.appendChild(tooltipEl);
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                tooltipEl.style.left = rect.left + 'px';
                tooltipEl.style.top = (rect.bottom + 5) + 'px';
                
                trigger.addEventListener('mouseleave', () => {
                    tooltipEl.remove();
                }, { once: true });
            }
        });
    });
    
    // Support buttons
    document.getElementById('parcel-help-btn')?.addEventListener('click', () => {
        switchPage('help');
    });
    
    document.getElementById('parcel-contact-btn')?.addEventListener('click', () => {
        showToast('Please email us at vg@vcnresources.com or use the contact form in Help Center.', 'info');
    });

    // Drop-off search
    const dropoffForm = document.getElementById('parcel-dropoff-search-form');
    dropoffForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const postcode = (document.getElementById('postcode-search') as HTMLInputElement)?.value;
        if (postcode.trim()) {
            findDropoffLocations(postcode.trim());
        } else {
            showToast('Please enter a postcode to search.', 'warning');
        }
    });
}

function attachResultsListeners() {
    document.getElementById('parcel-back-to-form-btn')?.addEventListener('click', () => {
        currentView = 'form';
        currentStep = 1;
        renderCurrentView();
    });

    const filtersSidebar = document.getElementById('parcel-filters-sidebar');
    filtersSidebar?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('.service-toggle-btn')) {
            filtersSidebar.querySelectorAll('.service-toggle-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            applyAndRenderFilteredQuotes();
        }
    });
    filtersSidebar?.addEventListener('change', (e) => {
        if ((e.target as HTMLInputElement).matches('input[data-filter="courier"]')) {
            applyAndRenderFilteredQuotes();
        }
    });

    document.getElementById('parcel-quotes-container')?.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const selectBtn = target.closest<HTMLButtonElement>('.select-quote-btn');
        if (selectBtn?.dataset.quote) {
            const quote: Quote = JSON.parse(selectBtn.dataset.quote.replace(/&quot;/g, '"'));
            setState({ parcelSelectedQuote: quote });
            currentView = 'payment';
            renderCurrentView();
        }
    });

    // Initial render of quotes
    applyAndRenderFilteredQuotes();
}

function attachPaymentListeners() {
    document.getElementById('parcel-back-to-results-btn')?.addEventListener('click', () => {
        currentView = 'results';
        renderCurrentView();
    });
    document.getElementById('parcel-confirm-payment-btn')?.addEventListener('click', () => {
        currentView = 'confirmation';
        renderCurrentView();
    });
}

function attachConfirmationListeners() {
    document.getElementById('parcel-new-shipment-btn')?.addEventListener('click', () => {
        resetParcelState();
        formData = {
            senderName: '',
            senderEmail: '',
            senderPhone: '',
            senderAddress: '',
            senderCity: '',
            senderPostcode: '',
            senderCountry: '',
            recipientName: '',
            recipientEmail: '',
            recipientPhone: '',
            recipientAddress: '',
            recipientCity: '',
            recipientPostcode: '',
            recipientCountry: '',
            parcelType: 'box',
            weight: 0,
            length: undefined,
            width: undefined,
            height: undefined,
            itemValue: 0,
            itemDescription: '',
            insurance: false,
            signatureRequired: false,
            fragile: false,
            deliveryInstructions: ''
        };
        currentStep = 1;
        startParcel();
    });
}

// --- INITIALIZATION ---
export function startParcel() {
    setState({ currentService: 'parcel' });
    resetParcelState();
    // Reset form state
    currentView = 'form';
    currentStep = 1;
    formData = {
        senderName: '',
        senderEmail: '',
        senderPhone: '',
        senderAddress: '',
        senderCity: '',
        senderPostcode: '',
        senderCountry: '',
        recipientName: '',
        recipientEmail: '',
        recipientPhone: '',
        recipientAddress: '',
        recipientCity: '',
        recipientPostcode: '',
        recipientCountry: '',
        parcelType: 'box',
        weight: 0,
        length: undefined,
        width: undefined,
        height: undefined,
        itemValue: 0,
        itemDescription: '',
        insurance: false,
        signatureRequired: false,
        fragile: false,
        deliveryInstructions: ''
    };
    switchPage('parcel');
    // Force re-render after a tiny delay to ensure DOM is ready
    setTimeout(() => {
        renderCurrentView();
    }, 50);
}
