// inland.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetInlandState, Truck } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { MARKUP_CONFIG } from './pricing';

// --- MODULE STATE ---
let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, painting = false;

// --- MOCK API & DATA ---
async function getMockTrucksApiResponse(details: any): Promise<Truck[]> {
    await new Promise(res => setTimeout(res, 1500));
    const trucks: Omit<Truck, 'id'>[] = [
        { driverName: "John D.", driverRating: 4.8, etaPickupMin: 45, price: 450, vehicleType: "26t Rigid Truck", gps_lat: 0, gps_lon: 0 },
        { driverName: "Mike S.", driverRating: 4.9, etaPickupMin: 60, price: 510, vehicleType: "Curtain Sider", gps_lat: 0, gps_lon: 0 },
        { driverName: "Alex P.", driverRating: 4.6, etaPickupMin: 90, price: 380, vehicleType: "18t Rigid Truck", gps_lat: 0, gps_lon: 0 },
    ];
    return trucks.map(t => ({ ...t, id: `truck-${Math.random()}` }));
}

// --- UI & STEP MANAGEMENT ---
function goToInlandStep(step: number) {
    setState({ currentInlandStep: step });
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-inland .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`inland-step-${step}`)?.classList.add('active');

    if (step === 3) {
        initializeSignaturePad();
    }
}

function renderInlandPage() {
    const page = document.getElementById('page-inland');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Book Inland Trucking</h2>
            <p class="subtitle">Reliable FTL and LTL services for your domestic and cross-border needs.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="inland-step-1" class="service-step">
                <form id="inland-details-form">
                    <h3>Route & Cargo</h3>
                     <div class="form-section two-column">
                        <div class="input-wrapper"><label for="inland-origin">Origin (City, Country)</label><input type="text" id="inland-origin" required placeholder="e.g., London, GB"></div>
                        <div class="input-wrapper"><label for="inland-destination">Destination (City, Country)</label><input type="text" id="inland-destination" required placeholder="e.g., Manchester, GB"></div>
                    </div>
                     <div class="form-section two-column">
                        <div class="input-wrapper">
                            <label for="inland-load-type">Load Type</label>
                            <select id="inland-load-type">
                                <option value="FTL">Full Truckload (FTL)</option>
                                <option value="LTL">Less than Truckload (LTL)</option>
                            </select>
                        </div>
                        <div class="input-wrapper"><label for="inland-cargo-weight">Cargo Weight (kg)</label><input type="number" id="inland-cargo-weight" required min="1"></div>
                    </div>
                    <div class="form-actions"><button type="submit" class="main-submit-btn">Find Trucks</button></div>
                </form>
            </div>

            <!-- Step 2: Truck Board -->
            <div id="inland-step-2" class="service-step">
                <h3>AI-Generated Available Trucks</h3>
                <div id="inland-truck-board" class="results-grid"></div>
                <div class="form-actions" style="justify-content: flex-start;">
                    <button type="button" id="inland-back-to-details" class="secondary-btn">Back</button>
                </div>
            </div>

            <!-- Step 3: Agreement -->
            <div id="inland-step-3" class="service-step">
                 <h3>Agreement & Finalization</h3>
                 <div class="two-column">
                    <div>
                        <h4>Booking Summary</h4>
                        <div id="inland-agreement-summary" class="payment-overview"></div>
                        <div class="checkbox-wrapper" style="margin-top: 1.5rem;"><input type="checkbox" id="inland-terms-ack"><label for="inland-terms-ack">I agree to the terms of carriage and confirm the details are correct.</label></div>
                    </div>
                    <div>
                        <h4>Digital Signature</h4>
                        <div class="input-wrapper"><label for="inland-signer-name">Sign by Typing Your Full Name</label><input type="text" id="inland-signer-name"></div>
                        <label>Sign in the box below</label>
                        <canvas id="inland-signature-pad" width="400" height="150" style="border: 2px solid var(--border-color); border-radius: 8px; cursor: crosshair;"></canvas>
                    </div>
                 </div>
                 <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="inland-back-to-board-btn" class="secondary-btn">Back</button>
                    <button type="button" id="inland-confirm-booking-btn" class="main-submit-btn" disabled>Confirm Booking</button>
                </div>
            </div>
            
            <!-- Step 4: Confirmation -->
            <div id="inland-step-4" class="service-step">
                <div class="confirmation-container">
                    <h3>Booking Confirmed!</h3>
                    <p>Your truck is booked. The driver will contact you upon arrival at the pickup location.</p>
                    <div class="confirmation-tracking"><h4>Booking ID</h4><div class="tracking-id-display" id="inland-booking-id"></div></div>
                    <div class="confirmation-actions">
                        <button id="inland-download-bol-btn" class="secondary-btn">Download Bill of Lading (PDF)</button>
                        <button id="inland-new-shipment-btn" class="main-submit-btn">New Booking</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- LOGIC ---
async function handleInlandFormSubmit(e: Event) {
    e.preventDefault();
    toggleLoading(true, "Finding available trucks...");

    const details = {
        originAddress: (document.getElementById('inland-origin') as HTMLInputElement).value,
        destAddress: (document.getElementById('inland-destination') as HTMLInputElement).value,
        // FIX: Cast the value from the select element to the expected 'FTL' | 'LTL' literal type.
        loadType: (document.getElementById('inland-load-type') as HTMLSelectElement).value as 'FTL' | 'LTL',
        weight: parseInt((document.getElementById('inland-cargo-weight') as HTMLInputElement).value),
        cargoDescription: '', // Simplified
        selectedTruck: null,
    };
    setState({ inlandDetails: details });
    
    try {
        const trucks = await getMockTrucksApiResponse(details);
        setState({ availableTrucks: trucks });
        
        const truckBoard = document.getElementById('inland-truck-board');
        if (truckBoard) {
            truckBoard.innerHTML = trucks.map((truck: any) => {
                const markup = MARKUP_CONFIG.inland.standard;
                const finalPrice = truck.price * (1 + markup);
                return `
                    <div class="quote-card">
                        <div class="quote-card-header"><h4>${truck.vehicleType}</h4></div>
                        <div class="quote-card-body">
                            <div class="quote-card-details">
                                <div class="detail-item"><span>Driver</span><strong>${truck.driverName} (${truck.driverRating} ★)</strong></div>
                                <div class="detail-item"><span>ETA to Pickup</span><strong>~${truck.etaPickupMin} mins</strong></div>
                            </div>
                            <div class="quote-card-price"><strong>${State.currentCurrency.symbol}${finalPrice.toFixed(2)}</strong></div>
                        </div>
                        <div class="quote-card-actions"><button class="main-submit-btn inland-book-truck-btn" data-truck-id="${truck.id}">Select & Book</button></div>
                    </div>
                `;
            }).join('');
        }
        goToInlandStep(2);
    } catch (error) {
        console.error("Inland quote error:", error);
        showToast("Could not find available trucks. Please try again.", "error");
    } finally {
        toggleLoading(false);
    }
}

function handleSelectTruck(truckId: string) {
    const selectedTruck = State.availableTrucks.find(t => t.id === truckId);
    if (!selectedTruck || !State.inlandDetails) return;

    setState({ inlandDetails: { ...State.inlandDetails, selectedTruck }});

    const summaryEl = document.getElementById('inland-agreement-summary');
    if (summaryEl) {
        const markup = MARKUP_CONFIG.inland.standard;
        const finalPrice = selectedTruck.price * (1 + markup);
        summaryEl.innerHTML = `
            <div class="review-item"><span>Route:</span><strong>${State.inlandDetails.originAddress} &rarr; ${State.inlandDetails.destAddress}</strong></div>
            <div class="review-item"><span>Vehicle:</span><strong>${selectedTruck.vehicleType}</strong></div>
            <div class="review-item"><span>Driver:</span><strong>${selectedTruck.driverName} (${selectedTruck.driverRating} ★)</strong></div>
            <hr>
            <div class="review-item total"><span>Total Cost:</span><strong>${State.currentCurrency.symbol}${finalPrice.toFixed(2)}</strong></div>
        `;
    }
    goToInlandStep(3);
}

function initializeSignaturePad() {
    canvas = document.getElementById('inland-signature-pad') as HTMLCanvasElement;
    if (!canvas) return;
    ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#212121'; ctx.lineWidth = 2;

    const start = (e: MouseEvent | TouchEvent) => { painting = true; draw(e); };
    const end = () => { painting = false; ctx.beginPath(); setState({ inlandSignatureDataUrl: canvas.toDataURL() }); validateAgreement(); };
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
    const ack = (document.getElementById('inland-terms-ack') as HTMLInputElement).checked;
    const name = (document.getElementById('inland-signer-name') as HTMLInputElement).value.trim();
    const isSigned = !!State.inlandSignatureDataUrl;
    (document.getElementById('inland-confirm-booking-btn') as HTMLButtonElement).disabled = !(ack && name && isSigned);
}

function generateBolPdf() {
    const { inlandDetails } = State;
    if (!inlandDetails || !inlandDetails.selectedTruck || !inlandDetails.bookingId) return;
    const doc = new jsPDF();
    doc.text('Bill of Lading (BOL)', 14, 20);
    doc.text(`Booking ID: ${inlandDetails.bookingId}`, 14, 28);
    autoTable(doc, {
        startY: 35,
        head: [['Detail', 'Information']],
        body: [
            ['Shipper (Origin)', inlandDetails.originAddress],
            ['Consignee (Destination)', inlandDetails.destAddress],
            ['Carrier', `${inlandDetails.selectedTruck.driverName} (${inlandDetails.selectedTruck.vehicleType})`],
            ['Load Type', inlandDetails.loadType],
            ['Weight', `${inlandDetails.weight} kg`],
            ['Signature on File', 'Yes'],
        ]
    });
    doc.save(`Vcanship_BOL_${inlandDetails.bookingId}.pdf`);
}

function attachInlandEventListeners() {
    const page = document.getElementById('page-inland');
    if(!page) return;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
    document.getElementById('inland-details-form')?.addEventListener('submit', handleInlandFormSubmit);
    
    document.getElementById('inland-truck-board')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest<HTMLButtonElement>('.inland-book-truck-btn');
        if (button?.dataset.truckId) {
            handleSelectTruck(button.dataset.truckId);
        }
    });

    // Nav
    document.getElementById('inland-back-to-details')?.addEventListener('click', () => goToInlandStep(1));
    document.getElementById('inland-back-to-board-btn')?.addEventListener('click', () => goToInlandStep(2));
    document.getElementById('inland-confirm-booking-btn')?.addEventListener('click', () => {
        const bookingId = `TRK-${Date.now().toString().slice(-6)}`;
        setState({ inlandDetails: { ...State.inlandDetails!, bookingId }});
        (document.getElementById('inland-booking-id') as HTMLElement).textContent = bookingId;
        goToInlandStep(4);
    });
    
    document.getElementById('inland-new-shipment-btn')?.addEventListener('click', startInland);
    document.getElementById('inland-download-bol-btn')?.addEventListener('click', generateBolPdf);

    // Agreement
    document.getElementById('inland-terms-ack')?.addEventListener('change', validateAgreement);
    document.getElementById('inland-signer-name')?.addEventListener('input', validateAgreement);
}

export function startInland() {
    setState({ currentService: 'inland' });
    resetInlandState();
    renderInlandPage();
    switchPage('inland');
    attachInlandEventListeners();
    goToInlandStep(1);
}
