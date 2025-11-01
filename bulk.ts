// bulk.ts
import { State, setState, resetBulkState } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';

function goToBulkStep(step: number) {
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-bulk .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`bulk-step-${step}`)?.classList.add('active');
}

function renderBulkPage() {
    const page = document.getElementById('page-bulk');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Bulk & Charter Services</h2>
            <p class="subtitle">For large-scale commodity shipping and vessel chartering.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="bulk-step-1" class="service-step">
                <form id="bulk-details-form">
                    <h3>Shipment Inquiry</h3>
                     <div class="form-section two-column">
                        <div class="input-wrapper"><label for="bulk-origin-port">Origin Port</label><input type="text" id="bulk-origin-port" required placeholder="e.g., Port Hedland, AU"></div>
                        <div class="input-wrapper"><label for="bulk-dest-port">Destination Port</label><input type="text" id="bulk-dest-port" required placeholder="e.g., Qingdao, CN"></div>
                    </div>
                     <div class="form-section two-column">
                        <div class="input-wrapper"><label for="bulk-cargo-type">Cargo Type</label><input type="text" id="bulk-cargo-type" required placeholder="e.g., Iron Ore"></div>
                        <div class="input-wrapper"><label for="bulk-cargo-quantity">Cargo Quantity (Tons)</label><input type="number" id="bulk-cargo-quantity" required min="1000"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="main-submit-btn">Get AI Estimate</button></div>
                </form>
            </div>

            <!-- Step 2: Quote -->
            <div id="bulk-step-2" class="service-step">
                <h3>Your AI-Powered Estimate</h3>
                <div id="bulk-quote-container"></div>
                <div class="quote-confirmation-panel">
                    <h4>Please Note: This is an AI Estimate</h4>
                    <p>This is a budgetary estimate based on current market conditions for vessel chartering. Rates are highly volatile. A Vcanship broker will contact you to discuss your specific needs and provide a firm quote.</p>
                </div>
                <div class="form-actions">
                    <button type="button" id="bulk-back-to-details" class="secondary-btn">Back</button>
                    <button type="button" id="bulk-request-booking" class="main-submit-btn">Contact a Broker</button>
                </div>
            </div>
            
            <!-- Step 3: Confirmation -->
            <div id="bulk-step-3" class="service-step">
                 <div class="confirmation-container">
                    <h3>Inquiry Sent!</h3>
                    <p>Your inquiry has been received. Our chartering desk will review your request and contact you via email shortly.</p>
                    <div class="confirmation-tracking">
                        <h4>Reference ID</h4>
                        <div class="tracking-id-display" id="bulk-reference-id"></div>
                    </div>
                    <div class="confirmation-actions">
                        <button id="bulk-new-shipment-btn" class="main-submit-btn">New Inquiry</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function handleBulkFormSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Calculating bulk freight estimate...");

    const origin = (document.getElementById('bulk-origin-port') as HTMLInputElement).value;
    const dest = (document.getElementById('bulk-dest-port') as HTMLInputElement).value;
    const cargoType = (document.getElementById('bulk-cargo-type') as HTMLInputElement).value;
    const quantity = (document.getElementById('bulk-cargo-quantity') as HTMLInputElement).value;

    const prompt = `
        Act as a ship chartering expert. Provide an estimated cost for a bulk shipment.
        - Origin Port: ${origin}
        - Destination Port: ${dest}
        - Cargo: ${cargoType}
        - Quantity: ${quantity} tons
        - Currency: ${State.currentCurrency.code}

        Provide a single estimated total freight cost as a number. Do not add any other text or formatting.
    `;

    try {
        if (!State.api) throw new Error("AI API not initialized.");
        const response = await State.api.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const baseCost = parseFloat(response.text);
        if (isNaN(baseCost)) throw new Error("Invalid AI response.");

        const commission = MARKUP_CONFIG.bulk.commission;
        const finalPrice = baseCost / (1 - commission); // Gross up for commission

        const quoteContainer = document.getElementById('bulk-quote-container');
        if (quoteContainer) {
            quoteContainer.innerHTML = `
                 <div class="payment-overview">
                    <div class="review-item"><span>Route:</span><strong>${origin} &rarr; ${dest}</strong></div>
                    <div class="review-item"><span>Cargo:</span><strong>${quantity} tons of ${cargoType}</strong></div>
                    <hr>
                    <div class="review-item total"><span>Estimated Charter Cost:</span><strong>${State.currentCurrency.symbol}${finalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</strong></div>
                </div>
            `;
        }
        goToBulkStep(2);
    } catch (error) {
        console.error("Bulk quote error:", error);
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}


function attachBulkEventListeners() {
    document.querySelector('#page-bulk .back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('bulk-details-form')?.addEventListener('submit', handleBulkFormSubmit);
    document.getElementById('bulk-back-to-details')?.addEventListener('click', () => goToBulkStep(1));
    document.getElementById('bulk-request-booking')?.addEventListener('click', () => {
        const refId = `BLK-${Date.now().toString().slice(-6)}`;
        (document.getElementById('bulk-reference-id') as HTMLElement).textContent = refId;
        goToBulkStep(3);
        showToast("Inquiry sent! Our brokers will contact you.", "success");
    });
    document.getElementById('bulk-new-shipment-btn')?.addEventListener('click', () => {
        resetBulkState();
        renderBulkPage();
        attachBulkEventListeners();
        goToBulkStep(1);
    });
}

export function startBulk() {
    setState({ currentService: 'bulk' });
    resetBulkState();
    renderBulkPage();
    switchPage('bulk');
    attachBulkEventListeners();
    goToBulkStep(1);
}
