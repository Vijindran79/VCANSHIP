// vehicle.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetVehicleState, Quote, ComplianceDoc, VehicleDetails } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';

// --- MODULE STATE ---
let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, painting = false;

// --- MOCK API & DATA ---
async function getMockVehicleApiResponse(details: VehicleDetails): Promise<{ quote: Quote, complianceReport: any }> {
    await new Promise(res => setTimeout(res, 1500));

    const baseCost = 1200 + Math.random() * 500;
    const quote: Quote = {
        carrierName: "Hoegh Autoliners",
        carrierType: "RoRo Carrier",
        estimatedTransitTime: "25-30 days",
        chargeableWeight: 0,
        chargeableWeightUnit: "N/A",
        weightBasis: "Per Vehicle",
        isSpecialOffer: false,
        totalCost: baseCost * (1 + MARKUP_CONFIG.vehicle.standard),
        costBreakdown: {
            baseShippingCost: baseCost,
            fuelSurcharge: baseCost * 0.15,
            estimatedCustomsAndTaxes: 0,
            optionalInsuranceCost: 0,
            ourServiceFee: baseCost * MARKUP_CONFIG.vehicle.standard - baseCost * 0.15,
        },
        serviceProvider: "Vcanship AI",
    };

    const complianceReport = {
        status: 'Action Required',
        summary: 'Standard documents are required for international vehicle shipping.',
        requirements: [
            { id: 'doc-title', title: 'Vehicle Title / Registration', description: 'Proof of ownership for the vehicle being shipped.', required: true },
            { id: 'doc-bos', title: 'Bill of Sale', description: 'A dated bill of sale if the vehicle was recently purchased.', required: true },
            { id: 'doc-id', title: 'Shipper\'s Photo ID', description: 'A valid government-issued ID (e.g., Passport, Driver\'s License).', required: true },
        ],
    };

    return { quote, complianceReport };
}

// --- UI & STEP MANAGEMENT ---
function goToVehicleStep(step: number) {
    setState({ currentVehicleStep: step });
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-vehicle .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`vehicle-step-${step}`)?.classList.add('active');

    if (step === 4) {
        initializeSignaturePad();
    }
}

function renderVehiclePage() {
    const page = document.getElementById('page-vehicle');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Ship a Vehicle</h2>
            <p class="subtitle">Reliable RoRo and container shipping for your car, motorcycle, or machinery.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="vehicle-step-1" class="service-step">
                <form id="vehicle-details-form">
                    <h3>Vehicle & Route</h3>
                    <div class="form-section two-column">
                        <div class="input-wrapper"><label for="vehicle-origin-port">Origin Port</label><input type="text" id="vehicle-origin-port" required placeholder="e.g., Southampton, GB"></div>
                        <div class="input-wrapper"><label for="vehicle-dest-port">Destination Port</label><input type="text" id="vehicle-dest-port" required placeholder="e.g., New York, US"></div>
                    </div>
                     <div class="form-section two-column">
                        <div class="input-wrapper"><label for="vehicle-make">Make</label><input type="text" id="vehicle-make" required placeholder="e.g., Toyota"></div>
                        <div class="input-wrapper"><label for="vehicle-model">Model</label><input type="text" id="vehicle-model" required placeholder="e.g., Camry"></div>
                        <div class="input-wrapper"><label for="vehicle-year">Year</label><input type="number" id="vehicle-year" required placeholder="e.g., 2022" min="1900" max="2025"></div>
                        <div class="input-wrapper"><label for="vehicle-condition">Condition</label>
                            <select id="vehicle-condition">
                                <option value="operable">Operable (Runs and Drives)</option>
                                <option value="inoperable">Inoperable (Needs towing/forklift)</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions"><button type="submit" class="main-submit-btn">Get Quote & Compliance</button></div>
                </form>
            </div>

            <!-- Step 2: Quote -->
            <div id="vehicle-step-2" class="service-step">
                <h3>AI-Powered Estimate</h3>
                <div id="vehicle-quote-container" class="payment-overview card"></div>
                <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="vehicle-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="vehicle-to-compliance-btn" class="main-submit-btn">Proceed</button>
                </div>
            </div>

            <!-- Step 3: Compliance -->
            <div id="vehicle-step-3" class="service-step">
                <h3>Compliance Documents</h3>
                <p class="subtitle">Please upload the following required documents for your vehicle shipment.</p>
                <div id="vehicle-compliance-checklist" class="compliance-checklist"></div>
                <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="vehicle-back-to-quote-btn" class="secondary-btn">Back</button>
                    <button type="button" id="vehicle-to-agreement-btn" class="main-submit-btn">Proceed to Agreement</button>
                </div>
            </div>
            
            <!-- Step 4: Agreement -->
            <div id="vehicle-step-4" class="service-step">
                 <h3>Agreement & Finalization</h3>
                 <div class="two-column">
                    <div>
                        <h4>Booking Summary</h4>
                        <div id="vehicle-agreement-summary" class="payment-overview"></div>
                        <div class="checkbox-wrapper" style="margin-top: 1.5rem;"><input type="checkbox" id="vehicle-compliance-ack"><label for="vehicle-compliance-ack">I acknowledge that all information and documents provided are accurate.</label></div>
                    </div>
                    <div>
                        <h4>Digital Signature</h4>
                        <div class="input-wrapper"><label for="vehicle-signer-name">Sign by Typing Your Full Name</label><input type="text" id="vehicle-signer-name"></div>
                        <label>Sign in the box below</label>
                        <canvas id="vehicle-signature-pad" width="400" height="150" style="border: 2px solid var(--border-color); border-radius: 8px; cursor: crosshair;"></canvas>
                    </div>
                 </div>
                 <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="vehicle-back-to-compliance-btn" class="secondary-btn">Back</button>
                    <button type="button" id="vehicle-confirm-booking-btn" class="main-submit-btn" disabled>Confirm Booking Request</button>
                </div>
            </div>

            <!-- Step 5: Confirmation -->
            <div id="vehicle-step-5" class="service-step">
                 <div class="confirmation-container">
                    <h3>Booking Request Sent!</h3>
                    <p>Your vehicle shipping request has been received. Our team will be in touch via email to finalize the details.</p>
                    <div class="confirmation-tracking"><h4>Booking ID</h4><div class="tracking-id-display" id="vehicle-booking-id"></div></div>
                    <div class="confirmation-actions">
                        <button id="vehicle-download-pdf-btn" class="secondary-btn">Download Summary (PDF)</button>
                        <button id="vehicle-new-shipment-btn" class="main-submit-btn">Book Another Vehicle</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- LOGIC ---
async function handleVehicleFormSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Analyzing your vehicle shipment...");

    const details: VehicleDetails = {
        originPort: (document.getElementById('vehicle-origin-port') as HTMLInputElement).value,
        destPort: (document.getElementById('vehicle-dest-port') as HTMLInputElement).value,
        make: (document.getElementById('vehicle-make') as HTMLInputElement).value,
        model: (document.getElementById('vehicle-model') as HTMLInputElement).value,
        year: parseInt((document.getElementById('vehicle-year') as HTMLInputElement).value),
        condition: (document.getElementById('vehicle-condition') as HTMLSelectElement).value as VehicleDetails['condition'],
        // Dummy values, not used in this simplified flow
        canRollOnDeck: true, length: 0, width: 0, height: 0, weight: 0
    };
    setState({ vehicleDetails: details });
    
    try {
        const { quote, complianceReport } = await getMockVehicleApiResponse(details);
        const docs: ComplianceDoc[] = complianceReport.requirements.map((r: any) => ({ ...r, status: 'pending', file: null }));
        setState({ vehicleQuote: quote, vehicleComplianceDocs: docs });
        
        const quoteContainer = document.getElementById('vehicle-quote-container');
        if (quoteContainer) {
            quoteContainer.innerHTML = `
                <div class="review-item"><span>Route:</span><strong>${details.originPort} &rarr; ${details.destPort}</strong></div>
                <div class="review-item"><span>Vehicle:</span><strong>${details.year} ${details.make} ${details.model}</strong></div>
                <hr>
                <div class="review-item total"><span>Estimated RoRo Cost:</span><strong>${State.currentCurrency.symbol}${quote.totalCost.toFixed(2)}</strong></div>
            `;
        }
        renderComplianceStep();
        goToVehicleStep(2);
    } catch (error) {
        console.error("Vehicle quote error:", error);
        showToast("Could not generate an estimate. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}

function renderComplianceStep() {
    const complianceContainer = document.getElementById('vehicle-compliance-checklist');
    if (!complianceContainer) return;

    complianceContainer.innerHTML = State.vehicleComplianceDocs.map(doc => `
        <div class="compliance-doc-item" id="${doc.id}" data-status="${doc.status}">
            <div class="compliance-doc-info"><h4>${doc.title} ${doc.required ? '<span>(Required)</span>' : ''}</h4><p>${doc.description}</p></div>
            <div class="file-drop-area"><div class="file-drop-area-idle"><span>Drop file or click</span></div><div class="file-drop-area-uploaded" style="display: none;"></div><input type="file" class="file-input" data-doc-id="${doc.id}"></div>
        </div>
    `).join('');
}


function initializeSignaturePad() {
    canvas = document.getElementById('vehicle-signature-pad') as HTMLCanvasElement;
    if (!canvas) return;
    ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#212121'; ctx.lineWidth = 2;

    const start = (e: MouseEvent | TouchEvent) => { painting = true; draw(e); };
    const end = () => { painting = false; ctx.beginPath(); validateAgreement(); };
    const draw = (e: MouseEvent | TouchEvent) => {
        if (!painting) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const pos = e instanceof MouseEvent ? e : e.touches[0];
        ctx.lineTo(pos.clientX - rect.left, pos.clientY - rect.top);
        ctx.stroke(); ctx.beginPath(); ctx.moveTo(pos.clientX - rect.left, pos.clientY - rect.top);
    };
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mouseup', end); canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', start); canvas.addEventListener('touchend', end); canvas.addEventListener('touchmove', draw);
}

function validateAgreement() {
    const ack = (document.getElementById('vehicle-compliance-ack') as HTMLInputElement).checked;
    const name = (document.getElementById('vehicle-signer-name') as HTMLInputElement).value.trim();
    const isSigned = canvas && !canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
    (document.getElementById('vehicle-confirm-booking-btn') as HTMLButtonElement).disabled = !(ack && name && !isSigned);
}

function generateVehicleSummaryPdf() {
    const { vehicleDetails, vehicleQuote, vehicleBookingId } = State;
    if (!vehicleDetails || !vehicleQuote || !vehicleBookingId) return;
    const doc = new jsPDF();
    doc.text('Vehicle Shipping Summary', 14, 20);
    doc.text(`Booking ID: ${vehicleBookingId}`, 14, 28);
    autoTable(doc, {
        startY: 35,
        head: [['Detail', 'Information']],
        body: [
            ['Route', `${vehicleDetails.originPort} -> ${vehicleDetails.destPort}`],
            ['Vehicle', `${vehicleDetails.year} ${vehicleDetails.make} ${vehicleDetails.model}`],
            ['Condition', vehicleDetails.condition],
            ['Carrier', vehicleQuote.carrierName],
            ['Est. Total Cost', `${State.currentCurrency.symbol}${vehicleQuote.totalCost.toFixed(2)}`]
        ]
    });
    doc.save(`Vcanship_VEH_${vehicleBookingId}.pdf`);
}

function attachVehicleEventListeners() {
    const page = document.getElementById('page-vehicle');
    if(!page) return;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('vehicle-details-form')?.addEventListener('submit', handleVehicleFormSubmit);
    
    // Nav
    document.getElementById('vehicle-back-to-details-btn')?.addEventListener('click', () => goToVehicleStep(1));
    document.getElementById('vehicle-to-compliance-btn')?.addEventListener('click', () => goToVehicleStep(3));
    document.getElementById('vehicle-back-to-quote-btn')?.addEventListener('click', () => goToVehicleStep(2));
    document.getElementById('vehicle-to-agreement-btn')?.addEventListener('click', () => {
         const summaryEl = document.getElementById('vehicle-agreement-summary');
         if (summaryEl) summaryEl.innerHTML = document.getElementById('vehicle-quote-container')!.innerHTML;
         goToVehicleStep(4);
    });
    document.getElementById('vehicle-back-to-compliance-btn')?.addEventListener('click', () => goToVehicleStep(3));
    document.getElementById('vehicle-confirm-booking-btn')?.addEventListener('click', () => {
        const bookingId = `VEH-${Date.now().toString().slice(-6)}`;
        setState({ vehicleBookingId: bookingId });
        (document.getElementById('vehicle-booking-id') as HTMLElement).textContent = bookingId;
        goToVehicleStep(5);
    });

    document.getElementById('vehicle-new-shipment-btn')?.addEventListener('click', startVehicle);
    document.getElementById('vehicle-download-pdf-btn')?.addEventListener('click', generateVehicleSummaryPdf);

    // Agreement
    document.getElementById('vehicle-compliance-ack')?.addEventListener('change', validateAgreement);
    document.getElementById('vehicle-signer-name')?.addEventListener('input', validateAgreement);
}

export function startVehicle() {
    setState({ currentService: 'vehicle' });
    resetVehicleState();
    renderVehiclePage();
    switchPage('vehicle');
    attachVehicleEventListeners();
    goToVehicleStep(1);
}
