// railway.ts
import { State, setState, resetRailwayState } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';

function goToRailwayStep(step: number) {
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-railway .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`railway-step-${step}`)?.classList.add('active');
}

function renderRailwayPage() {
    const page = document.getElementById('page-railway');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Book Railway Freight</h2>
            <p class="subtitle">An efficient and eco-friendly option for overland logistics.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="railway-step-1" class="service-step">
                <form id="railway-details-form">
                    <h3>Route & Cargo</h3>
                    <div class="form-section two-column">
                        <div class="input-wrapper"><label for="railway-origin">Origin Terminal</label><input type="text" id="railway-origin" required placeholder="e.g., Chongqing, China"></div>
                        <div class="input-wrapper"><label for="railway-destination">Destination Terminal</label><input type="text" id="railway-destination" required placeholder="e.g., Duisburg, Germany"></div>
                    </div>
                     <div class="form-section">
                        <div class="input-wrapper">
                            <label for="railway-cargo-type">Cargo Type</label>
                            <select id="railway-cargo-type">
                                <option value="standard-container-40ft">Standard 40ft Container</option>
                                <option value="standard-container-20ft">Standard 20ft Container</option>
                                <option value="bulk-wagon">Bulk Wagon</option>
                            </select>
                        </div>
                        <div class="input-wrapper"><label for="railway-cargo-weight">Cargo Weight (Tons)</label><input type="number" id="railway-cargo-weight" required min="1"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="main-submit-btn">Get AI Estimate</button></div>
                </form>
            </div>

            <!-- Step 2: Quote -->
            <div id="railway-step-2" class="service-step">
                <h3>Your AI-Powered Estimate</h3>
                <div id="railway-quote-container"></div>
                <div class="quote-confirmation-panel">
                    <h4>Please Note: This is an AI Estimate</h4>
                    <p>This is an estimated price based on current market rates for terminal-to-terminal rail freight. A Vcanship agent will contact you to confirm all details and provide a final quote.</p>
                </div>
                <div class="form-actions">
                    <button type="button" id="railway-back-to-details" class="secondary-btn">Back</button>
                    <button type="button" id="railway-request-booking" class="main-submit-btn">Request Final Quote</button>
                </div>
            </div>

            <!-- Step 3: Confirmation -->
            <div id="railway-step-3" class="service-step">
                 <div class="confirmation-container">
                    <h3>Booking Request Sent!</h3>
                    <p>Your railway freight request has been received. Our team will be in touch shortly.</p>
                    <div class="confirmation-tracking">
                        <h4>Reference ID</h4>
                        <div class="tracking-id-display" id="railway-reference-id"></div>
                    </div>
                    <div class="confirmation-actions">
                        <button id="railway-new-shipment-btn" class="main-submit-btn">Book Another Rail Shipment</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function handleRailwayFormSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Calculating railway estimate...");

    const origin = (document.getElementById('railway-origin') as HTMLInputElement).value;
    const dest = (document.getElementById('railway-destination') as HTMLInputElement).value;
    const cargoType = (document.getElementById('railway-cargo-type') as HTMLSelectElement).value;
    const weight = (document.getElementById('railway-cargo-weight') as HTMLInputElement).value;

    const prompt = `
        Act as a logistics pricing expert for railway freight.
        - Origin Terminal: ${origin}
        - Destination Terminal: ${dest}
        - Cargo: ${cargoType}, ${weight} tons
        - Currency: ${State.currentCurrency.code}

        Provide a single estimated base cost for the freight as a number. Do not add any other text or formatting.
    `;

    try {
        if (!State.api) throw new Error("AI API not initialized.");
        const response = await State.api.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const baseCost = parseFloat(response.text);
        if (isNaN(baseCost)) throw new Error("Invalid AI response.");

        const markup = MARKUP_CONFIG.railway.standard;
        const finalPrice = baseCost * (1 + markup);

        const quoteContainer = document.getElementById('railway-quote-container');
        if (quoteContainer) {
            quoteContainer.innerHTML = `
                <div class="payment-overview">
                    <div class="review-item"><span>Route:</span><strong>${origin} &rarr; ${dest}</strong></div>
                    <div class="review-item"><span>Cargo:</span><strong>${cargoType} (${weight} tons)</strong></div>
                    <hr>
                    <div class="review-item total"><span>Estimated Cost:</span><strong>${State.currentCurrency.symbol}${finalPrice.toFixed(2)}</strong></div>
                </div>
            `;
        }
        goToRailwayStep(2);
    } catch (error) {
        console.error("Railway quote error:", error);
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}

function attachRailwayEventListeners() {
    document.querySelector('#page-railway .back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('railway-details-form')?.addEventListener('submit', handleRailwayFormSubmit);
    document.getElementById('railway-back-to-details')?.addEventListener('click', () => goToRailwayStep(1));
    document.getElementById('railway-request-booking')?.addEventListener('click', () => {
        const refId = `RWY-${Date.now().toString().slice(-6)}`;
        (document.getElementById('railway-reference-id') as HTMLElement).textContent = refId;
        goToRailwayStep(3);
        showToast("Request sent!", "success");
    });
    document.getElementById('railway-new-shipment-btn')?.addEventListener('click', () => {
        resetRailwayState();
        renderRailwayPage();
        attachRailwayEventListeners();
        goToRailwayStep(1);
    });
}

export function startRailway() {
    setState({ currentService: 'railway' });
    resetRailwayState();
    renderRailwayPage();
    switchPage('railway');
    attachRailwayEventListeners();
    goToRailwayStep(1);
}
