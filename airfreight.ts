// airfreight.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetAirfreightState, AirfreightCargoPiece, Quote, ComplianceDoc, AirfreightDetails } from './state';
import { switchPage, updateProgressBar, showToast, toggleLoading } from './ui';
import { getHsCodeSuggestions } from './api';
import { Type } from '@google/genai';
import { createQuoteCard } from './components';
import { blobToBase64 } from './utils';
import { MARKUP_CONFIG } from './pricing';

// --- MODULE STATE ---
let cargoPieces: AirfreightCargoPiece[] = [];
let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, painting = false;
let currentAirfreightQuotes: Quote[] = [];

function goToAirfreightStep(step: number) {
    setState({ currentAirfreightStep: step });
    updateProgressBar('trade-finance', step - 1);
    document.querySelectorAll('#page-airfreight .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`airfreight-step-${step}`)?.classList.add('active');

    if (step === 4) {
        initializeSignaturePad();
    }
}

function renderAirfreightPage() {
    const page = document.getElementById('page-airfreight');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Book Air Freight</h2>
            <p class="subtitle">Fast and reliable shipping for your time-sensitive cargo.</p>
        </div>
        <div class="form-container">
            <div class="visual-progress-bar" id="progress-bar-trade-finance">
                <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
            </div>

            <!-- Step 1: Details -->
            <div id="airfreight-step-1" class="service-step">
                <form id="airfreight-details-form">
                    <h3>Route & Cargo Details</h3>
                    <div class="form-section two-column">
                        <div class="input-wrapper"><label for="airfreight-origin">Origin Airport (IATA)</label><input type="text" id="airfreight-origin" required placeholder="e.g., LHR"></div>
                        <div class="input-wrapper"><label for="airfreight-destination">Destination Airport (IATA)</label><input type="text" id="airfreight-destination" required placeholder="e.g., JFK"></div>
                    </div>
                    <div class="form-section">
                        <div class="input-wrapper"><label for="airfreight-cargo-description">Detailed Cargo Description</label><textarea id="airfreight-cargo-description" required placeholder="e.g., 10 boxes of smartphone batteries"></textarea></div>
                        <div class="hs-code-suggester-wrapper">
                             <div class="input-wrapper">
                                <label for="airfreight-hs-code">HS Code (Harmonized System)</label>
                                <div class="hs-code-input-group">
                                    <input type="text" id="airfreight-hs-code" autocomplete="off" placeholder="Type description for suggestions">
                                    <button type="button" id="airfreight-hs-image-suggester-btn" class="secondary-btn hs-image-suggester-btn">
                                        <i class="fa-solid fa-camera"></i> Image
                                    </button>
                                </div>
                                <div class="hs-code-suggestions" id="airfreight-hs-code-suggestions"></div>
                                <input type="file" id="airfreight-hs-image-input" class="hidden" accept="image/*">
                                <p class="helper-text">Our AI can suggest a code from your description or an image.</p>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions"><button type="button" id="airfreight-to-dims-btn" class="main-submit-btn">Next: Dimensions</button></div>
                </form>
            </div>

            <!-- Step 2: Dimensions -->
            <div id="airfreight-step-2" class="service-step">
                <h3>Dimensions & Weight</h3>
                <div id="airfreight-cargo-list"></div>
                <button type="button" id="airfreight-add-piece-btn" class="secondary-btn">Add Piece</button>
                <div id="airfreight-cargo-summary" class="payment-overview" style="margin-top: 1rem;"></div>
                <div class="form-actions" style="justify-content: space-between">
                    <button type="button" id="airfreight-back-to-details-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-quote-btn" class="main-submit-btn">Get Quote & Compliance</button>
                </div>
            </div>

            <!-- Step 3: Quote & Compliance -->
            <div id="airfreight-step-3" class="service-step">
                <h3>Quote & Compliance</h3>
                <div class="results-layout-grid">
                    <main class="results-main-content">
                        <div id="airfreight-results-controls" class="results-controls"></div>
                        <div id="airfreight-quotes-container"></div>
                    </main>
                    <aside id="airfreight-sidebar-container" class="results-sidebar"></aside>
                </div>
                <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="airfreight-back-to-dims-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-to-agreement-btn" class="main-submit-btn" disabled>Proceed with Selected Quote</button>
                </div>
            </div>
            
            <!-- Step 4: Agreement -->
            <div id="airfreight-step-4" class="service-step">
                 <h3>Agreement & Finalization</h3>
                 <div class="two-column">
                    <div>
                        <h4>Booking Summary</h4>
                        <div id="airfreight-agreement-summary" class="payment-overview"></div>
                        <div class="checkbox-wrapper" style="margin-top: 1.5rem;"><input type="checkbox" id="airfreight-compliance-ack"><label for="airfreight-compliance-ack">I acknowledge my responsibility for providing the required compliance documents.</label></div>
                    </div>
                    <div>
                        <h4>Digital Signature</h4>
                        <div class="input-wrapper"><label for="airfreight-signer-name">Sign by Typing Your Full Name</label><input type="text" id="airfreight-signer-name"></div>
                        <label>Sign in the box below</label>
                        <canvas id="airfreight-signature-pad" width="400" height="150" style="border: 2px solid var(--border-color); border-radius: 8px; cursor: crosshair;"></canvas>
                    </div>
                 </div>
                 <div class="form-actions" style="justify-content: space-between;">
                    <button type="button" id="airfreight-back-to-compliance-btn" class="secondary-btn">Back</button>
                    <button type="button" id="airfreight-confirm-booking-btn" class="main-submit-btn" disabled>Confirm Booking Request</button>
                </div>
            </div>

            <!-- Step 5: Confirmation -->
            <div id="airfreight-step-5" class="service-step">
                <div class="confirmation-container">
                    <h3>Booking Request Confirmed!</h3>
                    <p>Your Air Freight booking is confirmed. Our operations team will be in touch to coordinate the next steps.</p>
                    <div class="confirmation-tracking"><h4>Booking ID</h4><div class="tracking-id-display" id="airfreight-booking-id"></div></div>
                    <div class="confirmation-actions">
                         <button id="airfreight-download-pdf-btn" class="secondary-btn">Download Summary (PDF)</button>
                         <button id="airfreight-new-shipment-btn" class="main-submit-btn">New Shipment</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}


function renderCargoPieces() {
    const list = document.getElementById('airfreight-cargo-list');
    if (!list) return;
    list.innerHTML = cargoPieces.map((item, index) => `
        <div class="airfreight-cargo-item card" data-index="${index}">
             <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 1rem; align-items: flex-end;">
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Pieces</label><input type="number" class="airfreight-cargo-pieces" value="${item.pieces}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Length(cm)</label><input type="number" class="airfreight-cargo-length" value="${item.length}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Width(cm)</label><input type="number" class="airfreight-cargo-width" value="${item.width}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Height(cm)</label><input type="number" class="airfreight-cargo-height" value="${item.height}" min="1" required></div>
                <div class="input-wrapper" style="margin-bottom: 0;"><label>Weight(kg)</label><input type="number" class="airfreight-cargo-weight" value="${item.weight}" min="1" required></div>
                <button type="button" class="secondary-btn airfreight-remove-piece-btn" style="margin-bottom: 0.5rem;">Remove</button>
            </div>
        </div>
    `).join('');
    updateCargoSummary();
}

function addCargoPiece() {
    cargoPieces.push({ id: Date.now(), pieces: 1, length: 50, width: 50, height: 50, weight: 20 });
    renderCargoPieces();
}

function updateAndRecalculateCargo(): number {
    const newItems: AirfreightCargoPiece[] = [];
    document.querySelectorAll('.airfreight-cargo-item').forEach(itemEl => {
        newItems.push({
            id: Date.now(),
            pieces: parseInt((itemEl.querySelector('.airfreight-cargo-pieces') as HTMLInputElement).value, 10) || 0,
            length: parseInt((itemEl.querySelector('.airfreight-cargo-length') as HTMLInputElement).value, 10) || 0,
            width: parseInt((itemEl.querySelector('.airfreight-cargo-width') as HTMLInputElement).value, 10) || 0,
            height: parseInt((itemEl.querySelector('.airfreight-cargo-height') as HTMLInputElement).value, 10) || 0,
            weight: parseInt((itemEl.querySelector('.airfreight-cargo-weight') as HTMLInputElement).value, 10) || 0,
        });
    });
    cargoPieces = newItems;
    return updateCargoSummary();
}

function updateCargoSummary(): number {
    const summaryEl = document.getElementById('airfreight-cargo-summary');
    if (!summaryEl) return 0;

    let totalVolume = 0;
    let totalWeight = 0;
    cargoPieces.forEach(item => {
        totalVolume += (item.length * item.width * item.height) / 1000000 * item.pieces; // CBM
        totalWeight += item.weight * item.pieces;
    });

    const chargeableWeight = Math.max(totalWeight, totalVolume * 167); // IATA standard: 1 CBM = 167 kg

    if (cargoPieces.length > 0) {
        summaryEl.innerHTML = `
            <div class="review-item"><span>Total Actual Weight:</span><strong>${totalWeight.toFixed(2)} kg</strong></div>
            <div class="review-item"><span>Total Volume:</span><strong>${totalVolume.toFixed(3)} m³</strong></div>
            <div class="review-item total"><span>Chargeable Weight:</span><strong>${chargeableWeight.toFixed(2)} kg</strong></div>
        `;
    } else {
        summaryEl.innerHTML = '';
    }
    return chargeableWeight;
}

async function handleGetQuote() {
    const chargeableWeight = updateAndRecalculateCargo();
    if (cargoPieces.length === 0) {
        showToast("Please add at least one cargo piece.", "error");
        return;
    }

    const details: AirfreightDetails = {
        originAirport: (document.getElementById('airfreight-origin') as HTMLInputElement).value,
        destAirport: (document.getElementById('airfreight-destination') as HTMLInputElement).value,
        cargoDescription: (document.getElementById('airfreight-cargo-description') as HTMLTextAreaElement).value,
        hsCode: (document.getElementById('airfreight-hs-code') as HTMLInputElement).value,
        cargoPieces: cargoPieces,
        chargeableWeight: chargeableWeight,
        serviceLevel: 'standard', 
        cargoCategory: '', 
    };
    setState({ airfreightDetails: details });
    
    toggleLoading(true, "Analyzing your shipment...");
    try {
        if (!State.api) throw new Error("API not initialized");
        
        const prompt = `Act as a logistics pricing expert for Air Freight. Provide a JSON response with realistic quotes from 3 different air carriers (e.g., Lufthansa Cargo, Emirates SkyCargo, Cathay Cargo) and a compliance checklist.
        - Origin Airport (IATA): ${details.originAirport}
        - Destination Airport (IATA): ${details.destAirport}
        - Chargeable Weight: ${details.chargeableWeight.toFixed(2)} kg
        - Cargo: ${details.cargoDescription}.
        - HS Code: ${details.hsCode || 'Not Provided'}.
        - Currency: ${State.currentCurrency.code}.
        
        The response must be a JSON object with keys "quotes" and "complianceReport".
        The "quotes" array should contain objects, each with carrierName, estimatedTransitTime, and totalCost. Apply a ${MARKUP_CONFIG.airfreight.standard * 100}% markup to a realistic base cost per kg to calculate totalCost.
        The "complianceReport" should have status, summary, and a list of requirements (each with title and description), including a check for dangerous goods if the cargo description mentions batteries, electronics, etc.
        Your response MUST be a single JSON object matching the provided schema.`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                quotes: {
                    type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                        carrierName: { type: Type.STRING },
                        estimatedTransitTime: { type: Type.STRING },
                        totalCost: { type: Type.NUMBER }
                    }}
                },
                complianceReport: {
                    type: Type.OBJECT, properties: {
                        status: { type: Type.STRING }, summary: { type: Type.STRING },
                        requirements: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: {
                            title: { type: Type.STRING }, description: { type: Type.STRING }
                        }}}
                    }
                }
            }
        };

        const result = await State.api.models.generateContent({
            model: "gemini-2.5-flash", contents: prompt,
            config: { responseMimeType: "application/json", responseSchema }
        });
        const parsedResult = JSON.parse(result.text);

        currentAirfreightQuotes = parsedResult.quotes.map((q: any) => ({
            ...q, carrierType: "Air Carrier", chargeableWeight: details.chargeableWeight,
            chargeableWeightUnit: "KG", weightBasis: "Chargeable Weight", isSpecialOffer: false,
            costBreakdown: {
                baseShippingCost: q.totalCost / (1 + MARKUP_CONFIG.airfreight.standard),
                fuelSurcharge: 0, estimatedCustomsAndTaxes: 0, optionalInsuranceCost: 0,
                ourServiceFee: q.totalCost - (q.totalCost / (1 + MARKUP_CONFIG.airfreight.standard))
            }, serviceProvider: 'Vcanship AI'
        }));

        const docs: ComplianceDoc[] = parsedResult.complianceReport.requirements.map((r: any) => ({ ...r, id: `doc-${r.title.replace(/\s/g, '-')}`, status: 'pending', file: null, required: true }));
        setState({ airfreightComplianceDocs: docs });

        renderQuoteAndComplianceStep(parsedResult.complianceReport);
        goToAirfreightStep(3);
    } catch (error) {
        showToast("Failed to get quote and compliance.", "error");
    } finally {
        toggleLoading(false);
    }
}

function renderQuoteAndComplianceStep(complianceReport: any) {
    const sidebarContainer = document.getElementById('airfreight-sidebar-container');
    const controlsContainer = document.getElementById('airfreight-results-controls');
    
    if (sidebarContainer) {
        sidebarContainer.innerHTML = `
             <div class="results-section">
                <h3><i class="fa-solid fa-file-shield"></i> Compliance Report</h3>
                <div class="compliance-report">
                    <p>${complianceReport.summary}</p>
                    <ul>${complianceReport.requirements.map((req: any) => `<li><strong>${req.title}</strong></li>`).join('')}</ul>
                </div>
             </div>
             <div class="quote-confirmation-panel">
                <h4>This is an AI Estimate</h4>
                <p>An agent will contact you to confirm details and provide a final quote before booking.</p>
            </div>
        `;
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
    
    sortAndRenderAirfreightQuotes('price');
}


function sortAndRenderAirfreightQuotes(sortBy: 'price' | 'speed') {
    const quotesContainer = document.getElementById('airfreight-quotes-container');
    if (!quotesContainer) return;

    const sortedQuotes = [...currentAirfreightQuotes];
    const parseTransit = (time: string) => parseInt(time.split('-')[0]);

    if (sortBy === 'price') {
        sortedQuotes.sort((a, b) => a.totalCost - b.totalCost);
    } else {
        sortedQuotes.sort((a, b) => parseTransit(a.estimatedTransitTime) - parseTransit(b.estimatedTransitTime));
    }
    
    quotesContainer.innerHTML = sortedQuotes.map(q => createQuoteCard(q)).join('');

    document.querySelectorAll('#airfreight-results-controls .sort-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-sort') === sortBy);
    });
}


function initializeSignaturePad() {
    canvas = document.getElementById('airfreight-signature-pad') as HTMLCanvasElement;
    if (!canvas) return;
    ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    
    const startPosition = (e: MouseEvent | TouchEvent) => { painting = true; draw(e); };
    const finishedPosition = () => { painting = false; ctx.beginPath(); validateAgreement(); };
    const draw = (e: MouseEvent | TouchEvent) => {
        if (!painting) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const pos = e instanceof MouseEvent ? e : e.touches[0];
        ctx.lineTo(pos.clientX - rect.left, pos.clientY - rect.top);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.clientX - rect.left, pos.clientY - rect.top);
    };

    canvas.addEventListener('mousedown', startPosition);
    canvas.addEventListener('mouseup', finishedPosition);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', startPosition);
    canvas.addEventListener('touchend', finishedPosition);
    canvas.addEventListener('touchmove', draw);
}

function validateAgreement() {
    const ack = (document.getElementById('airfreight-compliance-ack') as HTMLInputElement).checked;
    const name = (document.getElementById('airfreight-signer-name') as HTMLInputElement).value.trim();
    (document.getElementById('airfreight-confirm-booking-btn') as HTMLButtonElement).disabled = !(ack && name && !isCanvasBlank());
}

function isCanvasBlank() {
    if (!canvas) return true;
    return !canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0);
}


function generateAirfreightSummaryPdf() {
    const { airfreightDetails, airfreightQuote, airfreightBookingId } = State;
    if (!airfreightDetails || !airfreightQuote || !airfreightBookingId) {
        showToast('Cannot generate PDF, missing data.', 'error'); return;
    }
    const doc = new jsPDF();
    doc.text('Air Freight Booking Summary', 14, 20);
    doc.text(`Booking ID: ${airfreightBookingId}`, 14, 28);

    autoTable(doc, {
        startY: 35,
        head: [['Detail', 'Information']],
        body: [
            ['Route', `${airfreightDetails.originAirport} -> ${airfreightDetails.destAirport}`],
            ['Cargo', airfreightDetails.cargoDescription],
            ['Chargeable Weight', `${airfreightDetails.chargeableWeight.toFixed(2)} KG`],
            ['Carrier', airfreightQuote.carrierName],
            ['Est. Transit', airfreightQuote.estimatedTransitTime],
            ['Est. Total Cost', `${State.currentCurrency.symbol}${airfreightQuote.totalCost.toFixed(2)}`]
        ]
    });

    const cargoData = airfreightDetails.cargoPieces.map(c => [c.pieces, `${c.length}x${c.width}x${c.height}cm`, `${c.weight}kg`]);
    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Pieces', 'Dimensions', 'Weight']],
        body: cargoData
    });
    
    doc.save(`Vcanship_AIR_${airfreightBookingId}.pdf`);
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


function attachAirfreightEventListeners() {
    const page = document.getElementById('page-airfreight');
    if (!page) return;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
    
    page.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (target.closest('.sort-btn')) {
            sortAndRenderAirfreightQuotes(target.dataset.sort as 'price' | 'speed');
        }
        const selectBtn = target.closest<HTMLButtonElement>('.select-quote-btn');
        if (selectBtn?.dataset.quote) {
            const quote: Quote = JSON.parse(selectBtn.dataset.quote.replace(/&quot;/g, '"'));
            setState({ airfreightQuote: quote });
            document.querySelectorAll('#airfreight-quotes-container .quote-card').forEach(c => c.classList.remove('selected'));
            selectBtn.closest('.quote-card')?.classList.add('selected');
            (document.getElementById('airfreight-to-agreement-btn') as HTMLButtonElement).disabled = false;
        }
         if (target.closest('#airfreight-hs-image-suggester-btn')) {
            document.getElementById('airfreight-hs-image-input')?.click();
        }
    });
    
    // Nav
    document.getElementById('airfreight-to-dims-btn')?.addEventListener('click', () => goToAirfreightStep(2));
    document.getElementById('airfreight-back-to-details-btn')?.addEventListener('click', () => goToAirfreightStep(1));
    document.getElementById('airfreight-to-quote-btn')?.addEventListener('click', handleGetQuote);
    document.getElementById('airfreight-back-to-dims-btn')?.addEventListener('click', () => goToAirfreightStep(2));
    document.getElementById('airfreight-to-agreement-btn')?.addEventListener('click', () => {
        const summaryEl = document.getElementById('airfreight-agreement-summary');
        if (summaryEl && State.airfreightQuote) {
             summaryEl.innerHTML = `
                <div class="review-item"><span>Carrier:</span><strong>${State.airfreightQuote.carrierName}</strong></div>
                <div class="review-item"><span>Transit Time:</span><strong>~${State.airfreightQuote.estimatedTransitTime}</strong></div>
                <hr>
                <div class="review-item total"><span>Est. Total Cost:</span><strong>${State.currentCurrency.symbol}${State.airfreightQuote.totalCost.toFixed(2)}</strong></div>
            `;
        }
        goToAirfreightStep(4);
    });
    document.getElementById('airfreight-back-to-compliance-btn')?.addEventListener('click', () => goToAirfreightStep(3));
    document.getElementById('airfreight-confirm-booking-btn')?.addEventListener('click', () => {
        const bookingId = `AIR-${Date.now().toString().slice(-6)}`;
        setState({ airfreightBookingId: bookingId });
        (document.getElementById('airfreight-booking-id') as HTMLElement).textContent = bookingId;
        goToAirfreightStep(5);
    });
    document.getElementById('airfreight-new-shipment-btn')?.addEventListener('click', startAirfreight);
    document.getElementById('airfreight-download-pdf-btn')?.addEventListener('click', generateAirfreightSummaryPdf);

    // Cargo pieces
    document.getElementById('airfreight-add-piece-btn')?.addEventListener('click', addCargoPiece);
    const cargoList = document.getElementById('airfreight-cargo-list');
    cargoList?.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.airfreight-remove-piece-btn')) {
            const index = parseInt((e.target as HTMLElement).closest<HTMLElement>('.airfreight-cargo-item')?.dataset.index || '-1');
            if (index > -1) {
                cargoPieces.splice(index, 1);
                renderCargoPieces();
            }
        }
    });
    cargoList?.addEventListener('change', updateAndRecalculateCargo);

    // Agreement
    document.getElementById('airfreight-compliance-ack')?.addEventListener('change', validateAgreement);
    document.getElementById('airfreight-signer-name')?.addEventListener('input', validateAgreement);

    // HS Code Suggester
    let hsCodeTimeout: number;
    const descInput = document.getElementById('airfreight-cargo-description') as HTMLInputElement;
    const hsCodeInput = document.getElementById('airfreight-hs-code') as HTMLInputElement;
    const suggestionsContainer = document.getElementById('airfreight-hs-code-suggestions');
    descInput?.addEventListener('input', () => {
        clearTimeout(hsCodeTimeout);
        if (!suggestionsContainer) return;
        const query = descInput.value.trim();
        if (query.length < 5) {
            suggestionsContainer.classList.remove('active'); return;
        }
        hsCodeTimeout = window.setTimeout(async () => {
            const suggestions = await getHsCodeSuggestions(query);
            if (suggestions.length > 0) {
                suggestionsContainer.innerHTML = suggestions.map(s => `<div class="hs-code-suggestion-item" data-code="${s.code}"><strong>${s.code}</strong> - ${s.description}</div>`).join('');
                suggestionsContainer.classList.add('active');
                if (hsCodeInput.value === '') hsCodeInput.value = suggestions[0].code;
            } else {
                suggestionsContainer.classList.remove('active');
            }
        }, 500);
    });
    suggestionsContainer?.addEventListener('click', e => {
        const item = (e.target as HTMLElement).closest<HTMLElement>('.hs-code-suggestion-item');
        if (item?.dataset.code) {
            hsCodeInput.value = item.dataset.code;
            suggestionsContainer.classList.remove('active');
        }
    });

    const hsImageInput = document.getElementById('airfreight-hs-image-input') as HTMLInputElement;
    hsImageInput?.addEventListener('change', () => {
        const file = hsImageInput.files?.[0];
        if (file) {
            suggestHsCodeFromImage(file, 'airfreight-hs-code');
        }
    });
}

export function startAirfreight() {
    setState({ currentService: 'airfreight' });
    resetAirfreightState();
    cargoPieces = [];
    renderAirfreightPage();
    switchPage('airfreight');
    attachAirfreightEventListeners();
    goToAirfreightStep(1);
    addCargoPiece();
}