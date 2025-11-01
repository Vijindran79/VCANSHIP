// rivertug.ts
import { State, setState, resetRiverTugState } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';

function goToRiverTugStep(step: number) {
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-rivertug .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`rivertug-step-${step}`)?.classList.add('active');
}

function renderRiverTugPage() {
    const page = document.getElementById('page-rivertug');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>River Tug & Barge Service</h2>
            <p class="subtitle">Inland waterway transport for bulk and project cargo.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="rivertug-step-1" class="service-step">
                <form id="rivertug-details-form">
                    <h3>Route & Cargo</h3>
                    <div class="form-section two-column">
                        <div class="input-wrapper"><label for="rivertug-origin">Origin River Port</label><input type="text" id="rivertug-origin" required placeholder="e.g., Duisburg"></div>
                        <div class="input-wrapper"><label for="rivertug-destination">Destination River Port</label><input type="text" id="rivertug-destination" required placeholder="e.g., Rotterdam"></div>
                    </div>
                     <div class="form-section">
                        <div class="input-wrapper"><label for="rivertug-cargo-volume">Cargo Volume (CBM or Tons)</label><input type="number" id="rivertug-cargo-volume" required min="10"></div>
                     </div>
                     <div class="form-section">
                        <label class="checkbox-group-label">Select Barge Type</label>
                        <div id="rivertug-barge-type-selector" class="visual-selector-grid">
                            <button type="button" class="service-type-btn" data-type="deck">
                                <i class="fa-solid fa-square-full selector-icon"></i>
                                <strong>Deck Barge</strong>
                                <span>For oversized cargo, vehicles, containers.</span>
                            </button>
                            <button type="button" class="service-type-btn" data-type="hopper">
                                <i class="fa-solid fa-box-archive selector-icon"></i>
                                <strong>Hopper Barge</strong>
                                <span>For bulk goods like coal, grain, gravel.</span>
                            </button>
                        </div>
                     </div>
                    <div class="form-actions"><button type="submit" class="main-submit-btn">Get AI Estimate</button></div>
                </form>
            </div>

            <!-- Step 2: Quote -->
            <div id="rivertug-step-2" class="service-step">
                <h3>Your AI-Powered Estimate</h3>
                <div id="rivertug-quote-container"></div>
                <div class="quote-confirmation-panel">
                    <h4>Please Note: This is an AI Estimate</h4>
                    <p>This is a budgetary estimate. A Vcanship agent will contact you to confirm availability, and provide a final quote.</p>
                </div>
                <div class="form-actions">
                    <button type="button" id="rivertug-back-to-details" class="secondary-btn">Back</button>
                    <button type="button" id="rivertug-request-booking" class="main-submit-btn">Request Final Quote</button>
                </div>
            </div>

            <!-- Step 3: Confirmation -->
            <div id="rivertug-step-3" class="service-step">
                <div class="confirmation-container">
                    <h3>Booking Request Sent!</h3>
                    <p>Your request has been received. Our inland waterways team will be in touch shortly.</p>
                    <div class="confirmation-tracking">
                        <h4>Reference ID</h4>
                        <div class="tracking-id-display" id="rivertug-reference-id"></div>
                    </div>
                    <div class="confirmation-actions">
                        <button id="rivertug-new-shipment-btn" class="main-submit-btn">New Inquiry</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function handleRiverTugFormSubmit(e: Event) {
    e.preventDefault();
    const selectedBarge = document.querySelector('#rivertug-barge-type-selector .service-type-btn.active');
    if (!selectedBarge) {
        showToast("Please select a barge type.", "error");
        return;
    }
    toggleLoading(true, "Calculating estimate...");

    const origin = (document.getElementById('rivertug-origin') as HTMLInputElement).value;
    const dest = (document.getElementById('rivertug-destination') as HTMLInputElement).value;
    const volume = (document.getElementById('rivertug-cargo-volume') as HTMLInputElement).value;
    const bargeType = (selectedBarge as HTMLElement).dataset.type;

    const prompt = `
        Act as a logistics pricing expert for river barge transport.
        - Origin River Port: ${origin}
        - Destination River Port: ${dest}
        - Cargo Volume: ${volume} tons/cbm
        - Barge Type: ${bargeType}
        - Currency: ${State.currentCurrency.code}

        Provide a single estimated base cost for the transport as a number. Do not add any other text or formatting.
    `;

    try {
        if (!State.api) throw new Error("AI API not initialized.");
        const response = await State.api.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const baseCost = parseFloat(response.text);
        if (isNaN(baseCost)) throw new Error("Invalid AI response.");

        const markup = MARKUP_CONFIG.rivertug.standard;
        const finalPrice = baseCost * (1 + markup);

        const quoteContainer = document.getElementById('rivertug-quote-container');
        if (quoteContainer) {
            quoteContainer.innerHTML = `
                 <div class="payment-overview">
                    <div class="review-item"><span>Route:</span><strong>${origin} &rarr; ${dest}</strong></div>
                    <div class="review-item"><span>Details:</span><strong>${volume} units on a ${bargeType} barge</strong></div>
                    <hr>
                    <div class="review-item total"><span>Estimated Cost:</span><strong>${State.currentCurrency.symbol}${finalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                </div>
            `;
        }
        goToRiverTugStep(2);

    } catch (error) {
        console.error("River tug quote error:", error);
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}

function attachRiverTugEventListeners() {
    document.querySelector('#page-rivertug .back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('rivertug-details-form')?.addEventListener('submit', handleRiverTugFormSubmit);
    
    document.getElementById('rivertug-barge-type-selector')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest<HTMLButtonElement>('.service-type-btn');
        if (button) {
            document.querySelectorAll('#rivertug-barge-type-selector .service-type-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        }
    });

    document.getElementById('rivertug-back-to-details')?.addEventListener('click', () => goToRiverTugStep(1));
    document.getElementById('rivertug-request-booking')?.addEventListener('click', () => {
        const refId = `RTG-${Date.now().toString().slice(-6)}`;
        (document.getElementById('rivertug-reference-id') as HTMLElement).textContent = refId;
        goToRiverTugStep(3);
        showToast("Request sent!", "success");
    });
    document.getElementById('rivertug-new-shipment-btn')?.addEventListener('click', () => {
        resetRiverTugState();
        renderRiverTugPage();
        attachRiverTugEventListeners();
        goToRiverTugStep(1);
    });
}

export function startRiverTug() {
    setState({ currentService: 'rivertug' });
    resetRiverTugState();
    renderRiverTugPage();
    switchPage('rivertug');
    attachRiverTugEventListeners();
    goToRiverTugStep(1);
}
