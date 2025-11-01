// lcl.ts
import { State, setState, resetLclState, LclCargoItem, Quote, ComplianceDoc } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';
import { getHsCodeSuggestions } from './api';
import { Type } from '@google/genai';
import { createQuoteCard } from './components';
import { blobToBase64 } from './utils';

let cargoItems: LclCargoItem[] = [];
let currentLclQuotes: Quote[] = [];

function goToLclStep(step: number) {
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-lcl .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`lcl-step-${step}`)?.classList.add('active');
}

function renderLclPage() {
    const page = document.getElementById('page-lcl');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Book Less than Container Load (LCL)</h2>
            <p class="subtitle">Cost-effective shipping for goods not requiring a full container.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="lcl-step-1" class="service-step">
                <form id="lcl-details-form">
                    <h3>Shipment Details</h3>
                     <div class="form-section two-column">
                        <div class="input-wrapper"><label for="lcl-origin">Origin (City, Country)</label><input type="text" id="lcl-origin" required placeholder="e.g., Hamburg, Germany"></div>
                        <div class="input-wrapper"><label for="lcl-destination">Destination (City, Country)</label><input type="text" id="lcl-destination" required placeholder="e.g., New York, USA"></div>
                    </div>
                     <div class="form-section">
                        <h4>Cargo Description</h4>
                        <div class="input-wrapper">
                            <label for="lcl-cargo-description">Detailed description of goods</label>
                            <textarea id="lcl-cargo-description" required placeholder="e.g., 10 boxes of cotton t-shirts, 5 boxes of leather shoes"></textarea>
                        </div>
                        <div class="hs-code-suggester-wrapper">
                            <div class="input-wrapper">
                                <label for="lcl-hs-code">HS Code (Harmonized System)</label>
                                <div class="hs-code-input-group">
                                    <input type="text" id="lcl-hs-code" autocomplete="off" placeholder="Type description for suggestions">
                                    <button type="button" id="lcl-hs-image-suggester-btn" class="secondary-btn hs-image-suggester-btn">
                                        <i class="fa-solid fa-camera"></i> Image
                                    </button>
                                </div>
                                <div class="hs-code-suggestions" id="lcl-hs-code-suggestions"></div>
                                <input type="file" id="lcl-hs-image-input" class="hidden" accept="image/*">
                                <p class="helper-text">Our AI can suggest a code from your description or an image.</p>
                            </div>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Cargo Dimensions & Weight</h4>
                        <div id="lcl-cargo-list"></div>
                        <button type="button" id="lcl-add-cargo-btn" class="secondary-btn">Add Cargo Item</button>
                        <div id="lcl-cargo-summary" class="payment-overview" style="margin-top: 1rem;"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="main-submit-btn">Get AI Estimate</button></div>
                </form>
            </div>

            <!-- Step 2: Quote -->
            <div id="lcl-step-2" class="service-step">
                <h3>Your AI-Powered Estimates</h3>
                <div class="results-layout-grid">
                    <main class="results-main-content">
                        <div id="lcl-results-controls" class="results-controls"></div>
                        <div id="lcl-quotes-container"></div>
                    </main>
                    <aside id="lcl-sidebar-container" class="results-sidebar"></aside>
                </div>
                <div class="form-actions">
                    <button type="button" id="lcl-back-to-details" class="secondary-btn">Back</button>
                    <button type="button" id="lcl-request-booking" class="main-submit-btn" disabled>Request Final Quote</button>
                </div>
            </div>
            
            <!-- Step 3: Confirmation -->
            <div id="lcl-step-3" class="service-step">
                <div class="confirmation-container">
                    <h3>Booking Request Sent!</h3>
                    <p>Your LCL shipment request has been received. Our team will email you shortly with a final quote and booking instructions.</p>
                    <div class="confirmation-tracking">
                        <h4>Reference ID</h4>
                        <div class="tracking-id-display" id="lcl-reference-id"></div>
                    </div>
                    <div class="confirmation-actions">
                        <button id="lcl-new-shipment-btn" class="main-submit-btn">Book Another LCL Shipment</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCargoItems() {
    const list = document.getElementById('lcl-cargo-list');
    if (!list) return;
    list.innerHTML = cargoItems.map((item, index) => `
        <div class="lcl-cargo-item card" data-index="${index}">
             <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 1rem; align-items: flex-end;">
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Pieces</label><input type="number" class="lcl-cargo-pieces" value="${item.pieces}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Length(cm)</label><input type="number" class="lcl-cargo-length" value="${item.length}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Width(cm)</label><input type="number" class="lcl-cargo-width" value="${item.width}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Height(cm)</label><input type="number" class="lcl-cargo-height" value="${item.height}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Weight(kg)</label><input type="number" class="lcl-cargo-weight" value="${item.weight}" min="1" required></div>
                <button type="button" class="secondary-btn lcl-remove-cargo-btn" style="margin-bottom: 0.5rem;">Remove</button>
            </div>
        </div>
    `).join('');
    updateCargoSummary();
}

function addCargoItem() {
    cargoItems.push({ id: Date.now(), pieces: 1, length: 100, width: 100, height: 100, weight: 100 });
    renderCargoItems();
}

function updateAndRecalculateCargo() {
    const newItems: LclCargoItem[] = [];
    let allValid = true;
    document.querySelectorAll('.lcl-cargo-item').forEach(itemEl => {
        const item: LclCargoItem = {
            id: Date.now(),
            pieces: parseInt((itemEl.querySelector('.lcl-cargo-pieces') as HTMLInputElement).value, 10) || 0,
            length: parseInt((itemEl.querySelector('.lcl-cargo-length') as HTMLInputElement).value, 10) || 0,
            width: parseInt((itemEl.querySelector('.lcl-cargo-width') as HTMLInputElement).value, 10) || 0,
            height: parseInt((itemEl.querySelector('.lcl-cargo-height') as HTMLInputElement).value, 10) || 0,
            weight: parseInt((itemEl.querySelector('.lcl-cargo-weight') as HTMLInputElement).value, 10) || 0,
        };
        if (item.pieces > 0 && item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0) {
            newItems.push(item);
        } else {
            allValid = false;
        }
    });
    cargoItems = newItems;
    if (!allValid) {
        showToast("Please ensure all cargo dimensions and weights are filled correctly.", "warning");
    }
    updateCargoSummary();
}

function updateCargoSummary() {
    const summaryEl = document.getElementById('lcl-cargo-summary');
    if (!summaryEl) return;

    let totalCbm = 0;
    let totalWeight = 0;
    cargoItems.forEach(item => {
        totalCbm += (item.length * item.width * item.height) / 1000000 * item.pieces;
        totalWeight += item.weight * item.pieces;
    });

    const chargeableWeight = Math.max(totalWeight, totalCbm * 1000); // 1 CBM = 1000 kg for LCL

    if (cargoItems.length > 0) {
        summaryEl.innerHTML = `
            <div class="review-item"><span>Total Volume (CBM):</span><strong>${totalCbm.toFixed(3)} m³</strong></div>
            <div class="review-item"><span>Total Actual Weight:</span><strong>${totalWeight.toFixed(2)} kg</strong></div>
            <div class="review-item"><span>Chargeable Weight:</span><strong>${chargeableWeight.toFixed(2)} kg</strong></div>
        `;
    } else {
        summaryEl.innerHTML = '';
    }
}


async function handleLclFormSubmit(e: Event) {
    e.preventDefault();
    updateAndRecalculateCargo();
    if (cargoItems.length === 0) {
        showToast("Please add at least one cargo item.", "error");
        return;
    }
    toggleLoading(true, "Calculating LCL estimates...");

    const origin = (document.getElementById('lcl-origin') as HTMLInputElement).value;
    const destination = (document.getElementById('lcl-destination') as HTMLInputElement).value;
    const cargoDescription = (document.getElementById('lcl-cargo-description') as HTMLTextAreaElement).value;
    const hsCode = (document.getElementById('lcl-hs-code') as HTMLInputElement).value;
    const totalCbm = cargoItems.reduce((acc, item) => acc + (item.length * item.width * item.height) / 1000000 * item.pieces, 0);

    const prompt = `
        Act as a logistics pricing expert for LCL (Less than Container Load) sea freight. Provide a JSON response with realistic quotes from 3 different LCL consolidators (e.g., Kuehne+Nagel, DHL Global Forwarding, DB Schenker).
        - Origin CFS: ${origin}
        - Destination CFS: ${destination}
        - Total Volume: ${totalCbm.toFixed(3)} CBM
        - Cargo description: ${cargoDescription}
        - HS Code: ${hsCode || 'Not provided'}
        - Currency: ${State.currentCurrency.code}

        Your response MUST be a single JSON object with a "quotes" key, which is an array of quote objects. For each quote, provide carrierName, estimatedTransitTime, and totalCost. Apply a ${MARKUP_CONFIG.lcl.standard * 100}% markup to a realistic base cost to calculate the totalCost.
    `;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            quotes: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        carrierName: { type: Type.STRING },
                        estimatedTransitTime: { type: Type.STRING },
                        totalCost: { type: Type.NUMBER }
                    }
                }
            }
        }
    };


    try {
        if (!State.api) throw new Error("AI API not initialized.");
        const result = await State.api.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema }
        });

        const parsedResult = JSON.parse(result.text);

        currentLclQuotes = parsedResult.quotes.map((q: any) => ({
            ...q,
            carrierType: "LCL Consolidator",
            chargeableWeight: 0, chargeableWeightUnit: 'CBM', weightBasis: 'Volume',
            isSpecialOffer: false, serviceProvider: 'Vcanship AI'
        }));

        renderLclResultsStep();
        goToLclStep(2);
    } catch (error) {
        console.error("LCL quote error:", error);
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}

function renderLclResultsStep() {
    const controlsContainer = document.getElementById('lcl-results-controls');
    const quotesContainer = document.getElementById('lcl-quotes-container');
    const sidebarContainer = document.getElementById('lcl-sidebar-container');
    
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
            <div class="results-section">
                <h3>Cargo Summary</h3>
                <div id="lcl-quote-summary-cargo" class="payment-overview"></div>
            </div>
            <div class="quote-confirmation-panel">
                <h4>This is an AI Estimate</h4>
                <p>A Vcanship agent will contact you to confirm final details and provide an exact quote for your approval before booking.</p>
            </div>
        `;
        document.getElementById('lcl-quote-summary-cargo')!.innerHTML = document.getElementById('lcl-cargo-summary')!.innerHTML;
    }

    if (controlsContainer) {
         controlsContainer.innerHTML = `
            <h3>Sort By:</h3>
            <div class="sort-buttons">
                <button class="sort-btn active" data-sort="price">Cheapest First</button>
                <button class="sort-btn" data-sort="speed">Fastest First</button>
            </div>
        `;
    }
    
    sortAndRenderLclQuotes('price');
}

function sortAndRenderLclQuotes(sortBy: 'price' | 'speed') {
    const quotesContainer = document.getElementById('lcl-quotes-container');
    if (!quotesContainer) return;

    const sortedQuotes = [...currentLclQuotes];
    const parseTransit = (time: string) => parseInt(time.split('-')[0]);

    if (sortBy === 'price') {
        sortedQuotes.sort((a, b) => a.totalCost - b.totalCost);
    } else {
        sortedQuotes.sort((a, b) => parseTransit(a.estimatedTransitTime) - parseTransit(b.estimatedTransitTime));
    }
    
    quotesContainer.innerHTML = sortedQuotes.map(q => createQuoteCard(q)).join('');

    document.querySelectorAll('#lcl-results-controls .sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-sort') === sortBy);
    });
}

async function suggestHsCodeFromImage(file: File, inputElementId: string) {
    if (!State.api) { showToast("AI not initialized.", "error"); return; }
    toggleLoading(true, "Analyzing image for HS code...");
    try {
        const base64Data = await blobToBase64(file);
        const imagePart = { inlineData: { mimeType: file.type, data: base64Data } };
        const textPart = { text: "Analyze this image of a product and suggest the most appropriate 6-digit Harmonized System (HS) code. Provide only the 6-digit code as a string." };
        
        const result = await State.api.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] }
        });

        const hsCode = result.text.replace(/[^0-9]/g, '').slice(0, 6);
        if (hsCode.length === 6) {
            const inputEl = document.getElementById(inputElementId) as HTMLInputElement;
            if(inputEl) inputEl.value = hsCode;
            showToast(`AI suggested HS Code: ${hsCode}`, "success");
        } else {
            throw new Error("Could not extract a valid HS code from the image.");
        }
    } catch (error) {
        console.error("HS code from image error:", error);
        showToast("Could not determine HS code from image.", "error");
    } finally {
        toggleLoading(false);
    }
}

function attachLclEventListeners() {
    const page = document.getElementById('page-lcl');
    if (!page) return;
    
    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
    page.addEventListener('submit', (e) => {
        if ((e.target as HTMLElement).id === 'lcl-details-form') {
            handleLclFormSubmit(e);
        }
    });

    page.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'lcl-add-cargo-btn') addCargoItem();
        if (target.id === 'lcl-back-to-details') goToLclStep(1);
        
        if (target.classList.contains('lcl-remove-cargo-btn')) {
            const item = target.closest<HTMLElement>('.lcl-cargo-item');
            if (item?.dataset.index) {
                cargoItems.splice(parseInt(item.dataset.index, 10), 1);
                renderCargoItems();
            }
        }
        if (target.id === 'lcl-request-booking') {
            const refId = `LCL-${Date.now().toString().slice(-6)}`;
            (document.getElementById('lcl-reference-id') as HTMLElement).textContent = refId;
            goToLclStep(3);
            showToast("Request sent! Our team will contact you shortly.", "success");
        }
        if (target.id === 'lcl-new-shipment-btn') {
            resetLclState();
            cargoItems = [];
            renderLclPage();
            attachLclEventListeners();
            goToLclStep(1);
            addCargoItem();
        }
        if (target.closest('.sort-btn')) {
            sortAndRenderLclQuotes(target.dataset.sort as 'price' | 'speed');
        }
        const selectBtn = target.closest<HTMLButtonElement>('.select-quote-btn');
        if (selectBtn?.dataset.quote) {
            const quote: Quote = JSON.parse(selectBtn.dataset.quote.replace(/&quot;/g, '"'));
            setState({ lclQuote: quote });
            document.querySelectorAll('#lcl-quotes-container .quote-card').forEach(c => c.classList.remove('selected'));
            selectBtn.closest('.quote-card')?.classList.add('selected');
            (document.getElementById('lcl-request-booking') as HTMLButtonElement).disabled = false;
        }
        if (target.closest('#lcl-hs-image-suggester-btn')) {
            document.getElementById('lcl-hs-image-input')?.click();
        }
    });

    document.getElementById('lcl-cargo-list')?.addEventListener('change', updateAndRecalculateCargo);
    
    const hsImageInput = document.getElementById('lcl-hs-image-input') as HTMLInputElement;
    hsImageInput?.addEventListener('change', () => {
        const file = hsImageInput.files?.[0];
        if (file) {
            suggestHsCodeFromImage(file, 'lcl-hs-code');
        }
    });

    // HS Code Suggester Logic
    let hsCodeSearchTimeout: number | null = null;
    const descriptionInput = document.getElementById('lcl-cargo-description') as HTMLTextAreaElement;
    const hsCodeInput = document.getElementById('lcl-hs-code') as HTMLInputElement;
    const suggestionsContainer = document.getElementById('lcl-hs-code-suggestions');

    descriptionInput?.addEventListener('input', () => {
        const query = descriptionInput.value.trim();
        if (hsCodeSearchTimeout) clearTimeout(hsCodeSearchTimeout);
        if (query.length < 10 || !suggestionsContainer) {
            suggestionsContainer?.classList.remove('active');
            return;
        }
        hsCodeSearchTimeout = window.setTimeout(async () => {
            const suggestions = await getHsCodeSuggestions(query);
            if (suggestionsContainer) {
                if (suggestions.length > 0) {
                    suggestionsContainer.innerHTML = suggestions.map(s => `
                        <div class="hs-code-suggestion-item" data-code="${s.code}">
                            <strong>${s.code}</strong> - ${s.description}
                        </div>`).join('');
                    suggestionsContainer.classList.add('active');
                    if (hsCodeInput && hsCodeInput.value.trim() === '') hsCodeInput.value = suggestions[0].code;
                } else {
                    suggestionsContainer.classList.remove('active');
                }
            }
        }, 800);
    });

    suggestionsContainer?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const item = target.closest<HTMLElement>('.hs-code-suggestion-item');
        if (item && item.dataset.code && hsCodeInput) {
            hsCodeInput.value = item.dataset.code;
            suggestionsContainer.classList.remove('active');
        }
    });
}


export function startLcl() {
    setState({ currentService: 'lcl' });
    resetLclState();
    cargoItems = [];
    renderLclPage();
    switchPage('lcl');
    attachLclEventListeners();
    goToLclStep(1);
    addCargoItem();
}