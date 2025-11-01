// secure-trade.ts
import { State, setState, resetSecureTradeState, SecureTradeDetails } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';

const SECURE_TRADE_FEE_RATE = 0.025; // 2.5%

function goToSecureTradeStep(step: number) {
    setState({ currentSecureTradeStep: step });
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-secure-trade .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`secure-trade-step-${step}`)?.classList.add('active');
}

function renderSecureTradePage() {
    const page = document.getElementById('page-secure-trade');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Vcanship Secure Trade</h2>
            <p class="subtitle">Your end-to-end solution for secure global transactions and shipping.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="secure-trade-step-1" class="service-step">
                <form id="secure-trade-details-form" novalidate>
                    <h3>Step 1: Initiate Your Secure Trade</h3>
                    <p class="subtitle" style="text-align:left; max-width: 100%; margin: 0 0 2rem;">Enter the details of your trade. We will contact the seller with instructions once you have funded the transaction.</p>
                    <div class="form-section">
                        <div class="input-wrapper"><label for="st-seller-email">Seller's Email Address</label><input type="email" id="st-seller-email" required placeholder="seller@example.com"></div>
                        <div class="input-wrapper"><label for="st-goods-desc">Brief Description of Goods</label><input type="text" id="st-goods-desc" required placeholder="e.g., 1000 Custom T-Shirts"></div>
                        <div class="input-wrapper"><label for="st-goods-value">Value of Goods (${State.currentCurrency.code})</label><input type="number" id="st-goods-value" required min="1" placeholder="e.g., 5000"></div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="main-submit-btn">Calculate Fees & Proceed</button>
                    </div>
                </form>
            </div>

            <!-- Step 2: Funding -->
            <div id="secure-trade-step-2" class="service-step">
                <h3>Step 2: Fund the Transaction</h3>
                <p class="subtitle" style="text-align:left; max-width: 100%; margin: 0 0 2rem;">Review the cost breakdown below. Your funds will be held securely by Vcanship until the seller's goods are verified and you approve the shipment.</p>
                <div id="st-funding-summary" class="payment-overview card"></div>
                <div class="quote-confirmation-panel">
                    <h4>How it Works</h4>
                    <p>By clicking "Confirm Deposit", you are authorizing Vcanship to hold these funds. We will then instruct the seller to deliver the goods to our warehouse. Shipping costs will be calculated and quoted separately after verification.</p>
                </div>
                <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="st-back-to-details" class="secondary-btn">Back</button>
                    <button type="button" id="st-confirm-deposit" class="main-submit-btn">Confirm Deposit (Simulated)</button>
                </div>
            </div>

            <!-- Step 3: Awaiting Cargo -->
            <div id="secure-trade-step-3" class="service-step">
                <div class="status-card card">
                    <div class="status-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                    <h3>Awaiting Seller's Cargo</h3>
                    <p>We have received your funds and have instructed the seller to deliver the goods to our designated warehouse. We will notify you as soon as the cargo arrives for verification.</p>
                    <div id="st-awaiting-details" class="payment-overview" style="margin-top: 2rem; text-align: left;"></div>
                </div>
            </div>

            <!-- Step 4: Verification -->
            <div id="secure-trade-step-4" class="service-step">
                 <h3>Step 3: Verify Your Cargo</h3>
                 <p class="subtitle" style="text-align:left; max-width: 100%; margin: 0 0 2rem;">The seller's goods have arrived at our warehouse. Please review the verification report below. Click "Approve & Ship" to proceed with shipping and release the payment to the seller.</p>
                 <div class="verification-report-card">
                    <h4>Verification Report: #<span id="st-verification-trade-id"></span></h4>
                    <div class="report-summary">
                        <p>Our team has visually inspected the cargo. See photos below. Everything appears to match the description provided.</p>
                    </div>
                    <div class="photo-grid">
                        <img src="https://placehold.co/400x300/e2e8f0/adb5bd?text=Box+1" alt="Cargo photo 1">
                        <img src="https://placehold.co/400x300/e2e8f0/adb5bd?text=Box+2" alt="Cargo photo 2">
                        <img src="https://placehold.co/400x300/e2e8f0/adb5bd?text=Contents" alt="Cargo photo 3">
                    </div>
                 </div>
                 <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" class="secondary-btn" style="background-color: var(--error-color); color: white; border-color: var(--error-color);">Raise Dispute</button>
                    <button type="button" id="st-approve-shipment" class="main-submit-btn">Approve & Ship</button>
                </div>
            </div>

            <!-- Step 5: Confirmation -->
            <div id="secure-trade-step-5" class="service-step">
                <div class="confirmation-container">
                    <h3>Trade Complete & Shipment Initiated!</h3>
                    <p>You have approved the cargo. Payment has been released to the seller, and we will now proceed with arranging the final shipment to you.</p>
                    <div class="confirmation-tracking"><h4>Your Secure Trade ID</h4><div class="tracking-id-display" id="st-confirmation-trade-id"></div></div>
                    <div class="confirmation-actions">
                        <button id="st-new-trade-btn" class="main-submit-btn">Start a New Secure Trade</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function handleDetailsSubmit(e: Event) {
    e.preventDefault();
    const sellerEmail = (document.getElementById('st-seller-email') as HTMLInputElement).value;
    const goodsDescription = (document.getElementById('st-goods-desc') as HTMLInputElement).value;
    const goodsValue = parseFloat((document.getElementById('st-goods-value') as HTMLInputElement).value);

    if (!sellerEmail || !goodsDescription || isNaN(goodsValue) || goodsValue <= 0) {
        showToast('Please fill out all fields with valid information.', 'error');
        return;
    }

    const details: SecureTradeDetails = { sellerEmail, goodsDescription, goodsValue };
    const fee = goodsValue * SECURE_TRADE_FEE_RATE;
    const total = goodsValue + fee;

    setState({
        secureTradeDetails: details,
        secureTradeFee: fee,
        secureTradeTotalDeposit: total,
    });

    const summaryEl = document.getElementById('st-funding-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <div class="review-item"><span>Value of Goods:</span><strong>${State.currentCurrency.symbol}${details.goodsValue.toFixed(2)}</strong></div>
            <div class="review-item"><span>Vcanship Secure Trade Fee (2.5%):</span><strong>${State.currentCurrency.symbol}${fee.toFixed(2)}</strong></div>
            <hr>
            <div class="review-item total"><span>Total Secure Deposit:</span><strong>${State.currentCurrency.symbol}${total.toFixed(2)}</strong></div>
        `;
    }

    goToSecureTradeStep(2);
}

function handleConfirmDeposit() {
    toggleLoading(true, "Securing your transaction...");
    setTimeout(() => {
        const tradeId = `VST-${Date.now().toString().slice(-6)}`;
        setState({ secureTradeId: tradeId });

        const awaitingDetailsEl = document.getElementById('st-awaiting-details');
        if (awaitingDetailsEl && State.secureTradeDetails) {
            awaitingDetailsEl.innerHTML = `
                <div class="review-item"><span>Trade ID:</span><strong>${tradeId}</strong></div>
                <div class="review-item"><span>Goods:</span><strong>${State.secureTradeDetails.goodsDescription}</strong></div>
                <div class="review-item"><span>Seller:</span><strong>${State.secureTradeDetails.sellerEmail}</strong></div>
            `;
        }
        
        toggleLoading(false);
        goToSecureTradeStep(3);
        
        // Simulate seller delivering goods after a delay
        setTimeout(() => {
            if (State.currentService === 'secure-trade' && State.currentSecureTradeStep === 3) {
                showToast(`Cargo for trade #${tradeId} has arrived at our warehouse!`, 'success');
                (document.getElementById('st-verification-trade-id') as HTMLElement).textContent = tradeId;
                goToSecureTradeStep(4);
            }
        }, 8000);

    }, 1500);
}

function handleApproveShipment() {
    toggleLoading(true, "Finalizing transaction...");
    setTimeout(() => {
        (document.getElementById('st-confirmation-trade-id') as HTMLElement).textContent = State.secureTradeId;
        toggleLoading(false);
        goToSecureTradeStep(5);
        showToast("Payment released to seller. Shipment is being processed.", "success");
    }, 1500);
}

function attachSecureTradeListeners() {
    const page = document.getElementById('page-secure-trade');
    if (!page) return;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
    
    document.getElementById('secure-trade-details-form')?.addEventListener('submit', handleDetailsSubmit);
    document.getElementById('st-back-to-details')?.addEventListener('click', () => goToSecureTradeStep(1));
    document.getElementById('st-confirm-deposit')?.addEventListener('click', handleConfirmDeposit);
    document.getElementById('st-approve-shipment')?.addEventListener('click', handleApproveShipment);
    
    document.getElementById('st-new-trade-btn')?.addEventListener('click', startSecureTrade);
}

export function startSecureTrade() {
    setState({ currentService: 'secure-trade' });
    resetSecureTradeState();
    renderSecureTradePage();
    switchPage('secure-trade');
    attachSecureTradeListeners();
    goToSecureTradeStep(1);
}
