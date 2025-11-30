import { t } from './i18n';
import { State, setState } from './state';
import { showToast, toggleLoading, switchPage } from './ui';
import { checkAndDecrementLookup, getChatbotResponse, getFclRatesFromBackend, getHsCodeSuggestions } from './api';
import { MARKUP_CONFIG } from './pricing';

// Types for FCL workflow
interface FclFormData {
    serviceType: string;
    originPort: string;
    destinationPort: string;
    cargoDescription: string;
    containerType: string;
    quantity: number;
    weight: number;
    weightUnit: string;
    hsCode: string;
    hsCodeDescription: string;
    commodityDescription: string;
}

interface FclQuote {
    id: string;
    route: string;
    serviceType: string;
    containers: string;
    baseCost: number;
    markup: number;
    totalCost: number;
    transitTime: string;
    carrier: string;
    breakdown: {
        oceanFreight: number;
        bunkerSurcharge: number;
        documentation: number;
        handling: number;
        insurance: number;
    };
}

interface ComplianceDocument {
    id: string;
    name: string;
    description: string;
    required: boolean;
    uploaded: boolean;
}

// State management
let currentStep: 'form' | 'quote' | 'payment' | 'confirmation' = 'form';
let fclFormData: FclFormData | null = null;
let fclQuote: FclQuote | null = null;
let complianceDocuments: ComplianceDocument[] = [];
let bookingId: string = '';

// Simple FCL implementation that matches working services
export function startFcl() {
    setState({ currentService: 'fcl' });
    
    // Check if returning from payment
    const confirmationData = sessionStorage.getItem('vcanship_show_confirmation');
    if (confirmationData) {
        try {
            const data = JSON.parse(confirmationData);
            if (data.service === 'fcl') {
                // Restore state for confirmation view
                fclQuote = data.quote;
                currentStep = 'confirmation';
                sessionStorage.removeItem('vcanship_show_confirmation');
                switchPage('fcl');
                setTimeout(() => renderConfirmationView(), 50);
                return;
            }
        } catch (e) {
            console.error('Error parsing confirmation data', e);
        }
    }
    
    // Reset to form view
    currentStep = 'form';
    fclFormData = null;
    fclQuote = null;
    complianceDocuments = [];
    
    switchPage('fcl');
    setTimeout(() => renderFclPage(), 50);
}

export function renderFclPage() {
    const page = document.getElementById('page-fcl');
    if (!page) {
        console.error('page-fcl element not found');
        return;
    }

    page.innerHTML = `
        <div class="fcl-elegant-container">
            <!-- Clean Header -->
            <div class="fcl-header">
                <div class="service-icon">
                    <i class="fas fa-ship"></i>
                </div>
                <div class="service-info">
                    <h1>FCL Sea Freight</h1>
                    <p>Book exclusive container usage for large volume shipments</p>
                </div>
            </div>

            <form id="fcl-form" class="fcl-elegant-form">
                <!-- Service Type Selection -->
                <div class="form-section">
                    <h3><i class="fas fa-route"></i> Service Type</h3>
                    <div class="service-type-grid">
                        <div class="service-option selected" data-service-type="port-to-port">
                            <div class="option-icon">
                                <i class="fas fa-anchor"></i>
                            </div>
                            <div class="option-content">
                                <h4>Port-to-Port</h4>
                                <p>You handle transport to/from ports</p>
                                <span class="option-badge">Most Popular</span>
                            </div>
                        </div>

                        <div class="service-option" data-service-type="door-to-port">
                            <div class="option-icon">
                                <i class="fas fa-home"></i>
                            </div>
                            <div class="option-content">
                                <h4>Door-to-Port</h4>
                                <p>We pick up from your door</p>
                            </div>
                        </div>

                        <div class="service-option" data-service-type="port-to-door">
                            <div class="option-icon">
                                <i class="fas fa-truck"></i>
                            </div>
                            <div class="option-content">
                                <h4>Port-to-Door</h4>
                                <p>We deliver to their door</p>
                            </div>
                        </div>

                        <div class="service-option" data-service-type="door-to-door">
                            <div class="option-icon">
                                <i class="fas fa-handshake"></i>
                            </div>
                            <div class="option-content">
                                <h4>Door-to-Door</h4>
                                <p>Complete end-to-end service</p>
                                <span class="option-badge premium">Premium</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Route Configuration -->
                <div class="form-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Route Details</h3>
                    <div class="route-grid">
                        <div class="route-field">
                            <label for="origin-port">Origin Port</label>
                            <div class="input-group">
                                <i class="fas fa-anchor"></i>
                                <input type="text" id="origin-port" placeholder="e.g., Shanghai or CNSHA" required>
                            </div>
                            <small>Enter UN/LOCODE or port name</small>
                        </div>

                        <div class="route-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>

                        <div class="route-field">
                            <label for="destination-port">Destination Port</label>
                            <div class="input-group">
                                <i class="fas fa-map-marker-alt"></i>
                                <input type="text" id="destination-port" placeholder="e.g., Los Angeles or USLAX" required>
                            </div>
                            <small>Enter UN/LOCODE or port name</small>
                        </div>
                    </div>
                </div>

                <!-- Cargo Details -->
                <div class="form-section">
                    <h3><i class="fas fa-boxes-stacked"></i> Cargo & Container Details</h3>
                    
                    <div class="input-wrapper">
                        <label for="cargo-description">Cargo Description</label>
                        <textarea id="cargo-description" placeholder="e.g., 15 pallets of consumer electronics" rows="3" required></textarea>
                        <small>Detailed description helps with compliance requirements</small>
                    </div>

                    <!-- HS Code Section -->
                    <div class="form-group">
                        <label for="hs-code">HS Code (Harmonized System Code)</label>
                        <div class="hs-code-input-group">
                            <input type="text" id="hs-code" placeholder="e.g., 8517.12.00" maxlength="10" pattern="[0-9]{4,10}">
                            <button type="button" id="hs-code-lookup-btn" class="lookup-btn">
                                <i class="fas fa-search"></i> Lookup
                            </button>
                        </div>
                        <small>Enter HS code or use lookup to find the correct classification</small>
                    </div>

                    <div class="form-group" id="hs-code-description-group" style="display: none;">
                        <label for="hs-code-description">HS Code Description</label>
                        <input type="text" id="hs-code-description" readonly>
                    </div>

                    
                    <div class="container-config">
                        <h4>Container Configuration</h4>
                        <div class="container-fields">
                            <div class="field-group">
                                <label for="container-type">Container Type</label>
                                <select id="container-type" required>
                                    <option value="20GP">20GP - 20ft General Purpose</option>
                                    <option value="40GP">40GP - 40ft General Purpose</option>
                                    <option value="40HC">40HC - 40ft High Cube</option>
                                </select>
                            </div>
                            
                            <div class="field-group">
                                <label for="quantity">Quantity</label>
                                <div class="quantity-control">
                                    <button type="button" class="qty-btn minus" data-target="quantity">-</button>
                                    <input type="number" id="quantity" value="1" min="1" max="50" required>
                                    <button type="button" class="qty-btn plus" data-target="quantity">+</button>
                                </div>
                            </div>
                            
                            <div class="field-group">
                                <label for="weight">Weight</label>
                                <div class="input-group">
                                    <input type="number" id="weight" value="1000" min="1" step="0.1" required>
                                    <select id="weight-unit" required>
                                        <option value="KG">KG</option>
                                        <option value="TON">TON</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Submit Button -->
                <div class="form-actions">
                    <button type="submit" class="submit-btn">
                        <i class="fas fa-search"></i>
                        <span>Get Quote & Compliance Analysis</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Service type selection
    document.querySelectorAll('.service-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            
            // Remove selected class from all options
            document.querySelectorAll('.service-option').forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            target.classList.add('selected');
        });
    });

    // Quantity controls
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const button = e.currentTarget as HTMLElement;
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId!) as HTMLInputElement;
            const isPlus = button.classList.contains('plus');
            
            let currentValue = parseInt(input.value) || 1;
            
            if (isPlus && currentValue < 50) {
                currentValue++;
            } else if (!isPlus && currentValue > 1) {
                currentValue--;
            }
            
            input.value = currentValue.toString();
        });
    });

    // Form submission
    const form = document.getElementById('fcl-form');
    const submitBtn = document.querySelector('.submit-btn') as HTMLElement;
    
    if (form && submitBtn) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Add loading state
            submitBtn.classList.add('loading');
            submitBtn.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Processing...</span>
            `;
            
            // Simulate processing
            setTimeout(() => {
                handleFormSubmit();
                
                // Reset button
                submitBtn.classList.remove('loading');
                submitBtn.innerHTML = `
                    <i class="fas fa-search"></i>
                    <span>Get Quote & Compliance Analysis</span>
                `;
            }, 1500);
        });
    }

    // HS Code lookup functionality
    const hsCodeLookupBtn = document.getElementById('hs-code-lookup-btn');
    const hsCodeInput = document.getElementById('hs-code') as HTMLInputElement;
    const hsCodeDescriptionGroup = document.getElementById('hs-code-description-group');
    const hsCodeDescriptionInput = document.getElementById('hs-code-description') as HTMLInputElement;

    if (hsCodeLookupBtn && hsCodeInput) {
        hsCodeLookupBtn.addEventListener('click', async () => {
            const hsCode = hsCodeInput.value.trim();
            if (!hsCode) {
                showToast('Please enter an HS Code to lookup', 'error');
                return;
            }

            await lookupHsCode(hsCode);
        });

        // Auto-lookup on HS code input change (with debounce)
        let hsCodeTimeout: NodeJS.Timeout;
        hsCodeInput.addEventListener('input', () => {
            clearTimeout(hsCodeTimeout);
            const hsCode = hsCodeInput.value.trim();
            
            if (hsCode.length >= 4) {
                hsCodeTimeout = setTimeout(() => {
                    lookupHsCode(hsCode);
                }, 500); // Reduced delay for faster response
            } else {
                // Hide description if code is too short
                if (hsCodeDescriptionGroup) {
                    hsCodeDescriptionGroup.style.display = 'none';
                }
            }
        });
    }
}

// Mock HS Code data for testing when API quota is reached
const mockHsCodeData: { [key: string]: { description: string; commodityDescription: string } } = {
    '8517': { description: 'Telephone sets, including smartphones', commodityDescription: 'Mobile phones and communication devices' },
    '85171': { description: 'Line telephone sets with cordless handsets', commodityDescription: 'Cordless telephone systems' },
    '851712': { description: 'Telephones for cellular networks', commodityDescription: 'Mobile phones and smartphones' },
    '8517120': { description: 'Telephones for cellular networks or wireless networks', commodityDescription: 'Smartphones and mobile devices' },
    '85171200': { description: 'Telephones for cellular networks or other wireless networks', commodityDescription: 'Mobile phones, smartphones, and wireless communication devices' },
    '6203': { description: 'Men\'s or boys\' suits, ensembles, jackets, blazers, trousers', commodityDescription: 'Men\'s clothing and apparel' },
    '620342': { description: 'Men\'s or boys\' trousers and shorts, of cotton', commodityDescription: 'Cotton trousers and shorts for men' },
    '62034240': { description: 'Men\'s or boys\' trousers and breeches of cotton', commodityDescription: 'Cotton pants and trousers for men' },
    '8471': { description: 'Automatic data processing machines and units', commodityDescription: 'Computers and data processing equipment' },
    '847130': { description: 'Portable automatic data processing machines', commodityDescription: 'Laptops and portable computers' },
    '84713001': { description: 'Portable computers weighing not more than 10 kg', commodityDescription: 'Laptops, notebooks, and portable computers' },
    '9403': { description: 'Other furniture and parts thereof', commodityDescription: 'Furniture and furniture components' },
    '940310': { description: 'Metal furniture of a kind used in offices', commodityDescription: 'Office furniture made of metal' },
    '94031000': { description: 'Metal furniture of a kind used in offices', commodityDescription: 'Office desks, chairs, and metal furniture' }
};

// HS Code lookup function with mock data fallback
async function lookupHsCode(hsCode: string) {
    try {
        const hsCodeLookupBtn = document.getElementById('hs-code-lookup-btn');
        const hsCodeDescriptionGroup = document.getElementById('hs-code-description-group');
        const hsCodeDescriptionInput = document.getElementById('hs-code-description') as HTMLInputElement;

        if (hsCodeLookupBtn) {
            hsCodeLookupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Looking up...';
            (hsCodeLookupBtn as HTMLButtonElement).disabled = true;
        }

        let data: any = null;

        try {
            // Try Google API backend first
            const response = await fetch('/api/hs-code-lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ hsCode })
            });

            if (response.ok) {
                data = await response.json();
            }
        } catch (apiError) {
            // API unavailable, fall back to mock data
        }

        // If API fails or quota exceeded, use mock data
        if (!data || !data.success) {
            // Try to find mock data by matching HS code prefixes
            let mockData = null;
            for (const [key, value] of Object.entries(mockHsCodeData)) {
                if (hsCode.startsWith(key) || key.startsWith(hsCode)) {
                    mockData = value;
                    break;
                }
            }

            if (mockData) {
                data = {
                    success: true,
                    description: mockData.description,
                    commodityDescription: mockData.commodityDescription
                };
            }
        }

        if (data && data.success && data.description) {
            // Show and populate the description field
            if (hsCodeDescriptionGroup && hsCodeDescriptionInput) {
                hsCodeDescriptionGroup.style.display = 'block';
                hsCodeDescriptionInput.value = data.description;
            }

            showToast('HS Code found and description loaded', 'success');
        } else {
            showToast('HS Code not found. Please verify the code.', 'error');
            if (hsCodeDescriptionGroup) {
                hsCodeDescriptionGroup.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('HS Code lookup error:', error);
        showToast('Failed to lookup HS Code. Please try again.', 'error');
        
        // Hide description group on error
        const hsCodeDescriptionGroup = document.getElementById('hs-code-description-group');
        if (hsCodeDescriptionGroup) {
            hsCodeDescriptionGroup.style.display = 'none';
        }
    } finally {
        // Reset lookup button
        const hsCodeLookupBtn = document.getElementById('hs-code-lookup-btn');
        if (hsCodeLookupBtn) {
            hsCodeLookupBtn.innerHTML = '<i class="fas fa-search"></i> Lookup';
            (hsCodeLookupBtn as HTMLButtonElement).disabled = false;
        }
    }
}

async function handleFormSubmit() {
    try {
        // Collect form data
        fclFormData = {
            serviceType: document.querySelector('.service-option.selected')?.getAttribute('data-service-type') || 'port-to-port',
            originPort: (document.getElementById('origin-port') as HTMLInputElement).value,
            destinationPort: (document.getElementById('destination-port') as HTMLInputElement).value,
            cargoDescription: (document.getElementById('cargo-description') as HTMLTextAreaElement).value,
            containerType: (document.getElementById('container-type') as HTMLSelectElement).value,
            quantity: parseInt((document.getElementById('quantity') as HTMLInputElement).value),
            weight: parseFloat((document.getElementById('weight') as HTMLInputElement).value),
            weightUnit: (document.getElementById('weight-unit') as HTMLSelectElement).value,
            hsCode: (document.getElementById('hs-code') as HTMLInputElement)?.value || '',
            hsCodeDescription: (document.getElementById('hs-code-description') as HTMLInputElement)?.value || '',
            commodityDescription: ''
        };

        // Generate quote with AI
        await generateQuote();
        
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('Failed to process request. Please try again.', 'error');
    }
}

// Mock quote data for testing when API quota is reached
function generateMockQuote(): any {
    const routes = [
        'Shanghai, China → Los Angeles, USA',
        'Hamburg, Germany → New York, USA',
        'Singapore → Rotterdam, Netherlands',
        'Dubai, UAE → London, UK',
        'Hong Kong → Vancouver, Canada'
    ];
    
    const carriers = ['COSCO SHIPPING', 'Maersk Line', 'MSC', 'CMA CGM', 'Hapag-Lloyd'];
    
    const route = routes[Math.floor(Math.random() * routes.length)];
    const carrier = carriers[Math.floor(Math.random() * carriers.length)];
    
    // Realistic FCL sea freight rates (much lower)
    const oceanFreight = Math.floor(Math.random() * 800) + 1200; // $1200-2000
    const bunkerSurcharge = Math.floor(oceanFreight * 0.08); // 8% instead of 15%
    const documentation = Math.floor(Math.random() * 100) + 75; // $75-175
    const handling = Math.floor(Math.random() * 150) + 100; // $100-250
    const insurance = Math.floor(Math.random() * 80) + 50; // $50-130
    
    const baseCost = oceanFreight + bunkerSurcharge + documentation + handling + insurance;
    const markup = Math.floor(baseCost * 0.08); // Reduced markup from 12% to 8%
    const totalCost = baseCost + markup;
    
    return {
        quote: {
            carrier: carrier,
            baseCost: baseCost,
            transitTime: `${Math.floor(Math.random() * 10) + 15}-${Math.floor(Math.random() * 5) + 20} days`,
            breakdown: {
                oceanFreight: oceanFreight,
                bunkerSurcharge: bunkerSurcharge,
                documentation: documentation,
                handling: handling,
                insurance: insurance
            }
        },
        compliance: [
            {
                id: "doc-1",
                name: "Commercial Invoice",
                description: "Detailed invoice showing goods value and description",
                required: true
            },
            {
                id: "doc-2",
                name: "Packing List",
                description: "Complete list of all items in the shipment",
                required: true
            },
            {
                id: "doc-3",
                name: "Bill of Lading",
                description: "Transport document issued by carrier",
                required: true
            },
            {
                id: "doc-4",
                name: "Certificate of Origin",
                description: "Document certifying country of manufacture",
                required: false
            }
        ]
    };
}

async function generateQuote() {
    try {
        toggleLoading(true, 'Generating quote with live rates...');
        
        let ratesData = null;
        let useRealRates = false;
        let useAiData = false;
        
        // First try: Real sea rates API (if available)
        try {
            if (typeof getFclRatesFromBackend === 'function') {
                const ratesParams = {
                    originPort: fclFormData!.originPort,
                    destinationPort: fclFormData!.destinationPort,
                    containerType: fclFormData!.containerType,
                    totalWeightTon: fclFormData!.weight / (fclFormData!.weightUnit === 'kg' ? 1000 : 1)
                };
                
                ratesData = await getFclRatesFromBackend(ratesParams);
                if (ratesData && ratesData.quotes && ratesData.quotes.length > 0) {
                    useRealRates = true;
                }
            } else {
                console.log('getFclRatesFromBackend function not available');
            }
        } catch (apiError) {
            console.log('Real sea rates API not available, trying AI system...', apiError);
        }
        
        // Second try: AI system (if real rates failed)
        if (!useRealRates) {
            try {
                const canProceed = await checkAndDecrementLookup();
                if (canProceed) {
                    const prompt = `As a global logistics expert, analyze this FCL shipment and provide a JSON response:

SHIPMENT DETAILS:
- Service: ${fclFormData!.serviceType.replace('-', ' to ').toUpperCase()}
- Route: ${fclFormData!.originPort} to ${fclFormData!.destinationPort}
- Container: ${fclFormData!.quantity}x ${fclFormData!.containerType} (${fclFormData!.weight}${fclFormData!.weightUnit})
- Cargo: ${fclFormData!.cargoDescription}

Provide a JSON response with this exact structure:
{
  "quote": {
    "carrier": "Major shipping line name",
    "baseCost": number,
    "transitTime": "X-Y days",
    "breakdown": {
      "oceanFreight": number,
      "bunkerSurcharge": number,
      "documentation": number,
      "handling": number,
      "insurance": number
    }
  },
  "compliance": [
    {
      "id": "doc-1",
      "name": "Document name",
      "description": "Why needed",
      "required": true
    }
  ]
}

Generate realistic pricing and identify required documents based on cargo and route.`;

                    const response = await getChatbotResponse(prompt, []);
                    const aiData = parseAIResponse(response);
                    if (aiData) {
                        ratesData = {
                            quotes: [aiData.quote],
                            complianceReport: {
                                status: 'info',
                                summary: 'AI-generated compliance analysis',
                                requirements: aiData.compliance.map(doc => ({
                                    title: doc.name,
                                    description: doc.description
                                }))
                            }
                        };
                        useAiData = true;
                    }
                }
            } catch (aiError) {
                console.log('AI system not available, using mock data...');
            }
        }
        
        // Third try: Mock data (if both real rates and AI failed)
        if (!useRealRates && !useAiData) {
            const mockData = generateMockQuote();
            ratesData = {
                quotes: [mockData.quote],
                complianceReport: {
                    status: 'info',
                    summary: 'Standard FCL compliance requirements apply.',
                    requirements: mockData.compliance.map(doc => ({
                        title: doc.name,
                        description: doc.description
                    }))
                }
            };
        }
        
        if (ratesData && ratesData.quotes && ratesData.quotes.length > 0) {
            const bestQuote = ratesData.quotes[0];
            const markup = bestQuote.baseCost * MARKUP_CONFIG.fcl.standard;
            
            fclQuote = {
                id: `FCL-${Date.now()}`,
                route: `${fclFormData!.originPort} → ${fclFormData!.destinationPort}`,
                serviceType: fclFormData!.serviceType,
                containers: `${fclFormData!.quantity}x ${fclFormData!.containerType}`,
                baseCost: bestQuote.baseCost,
                markup: markup,
                totalCost: bestQuote.baseCost + markup,
                transitTime: bestQuote.transitTime || '15-25 days',
                carrier: bestQuote.carrier || 'Major Shipping Line',
                breakdown: bestQuote.breakdown || {
                    oceanFreight: Math.round(bestQuote.baseCost * 0.75),
                    bunkerSurcharge: Math.round(bestQuote.baseCost * 0.08),
                    documentation: Math.round(bestQuote.baseCost * 0.05),
                    handling: Math.round(bestQuote.baseCost * 0.07),
                    insurance: Math.round(bestQuote.baseCost * 0.05)
                }
            };

            complianceDocuments = ratesData.complianceReport.requirements.map((req, index) => ({
                id: `doc-${index + 1}`,
                name: req.title,
                description: req.description,
                required: true,
                uploaded: false
            }));

            currentStep = 'quote';
            renderQuoteView();
            
            const rateSource = useRealRates ? 'live sea rates' : useAiData ? 'AI analysis' : 'backup system';
            showToast(`Quote generated successfully using ${rateSource}!`, 'success');
        } else {
            throw new Error('No rates available');
        }
        
    } catch (error) {
        console.error('Quote generation error:', error);
        showToast('Failed to generate quote. Please try again.', 'error');
    } finally {
        toggleLoading(false);
    }
}

function parseAIResponse(response: string): any {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Failed to parse AI response:', error);
        return null;
    }
}


function renderQuoteView() {
    const page = document.getElementById('page-fcl');
    if (!page || !fclQuote) return;

    page.innerHTML = `
        <div class="fcl-elegant-container">
            <!-- Quote Header -->
            <div class="fcl-header">
                <div class="service-icon">
                    <i class="fas fa-calculator"></i>
                </div>
                <div class="service-info">
                    <h1>FCL Quote Generated</h1>
                    <p>Review your quote and compliance requirements</p>
                </div>
            </div>

            <div class="quote-container">
                <!-- Quote Details -->
                <div class="quote-card">
                    <div class="quote-header">
                        <h3><i class="fas fa-file-invoice-dollar"></i> Quote Details</h3>
                        <div class="quote-id">Quote ID: ${fclQuote.id}</div>
                    </div>
                    
                    <div class="quote-summary">
                        <div class="quote-route">
                            <h4>${fclQuote.route}</h4>
                            <p>${fclQuote.serviceType.replace('-', ' to ').toUpperCase()}</p>
                        </div>
                        
                        <div class="quote-details">
                            <div class="detail-item">
                                <span class="label">Carrier:</span>
                                <span class="value">${fclQuote.carrier}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Container:</span>
                                <span class="value">${fclQuote.containers}</span>
                            </div>
                            <div class="detail-item">
                                <span class="label">Transit Time:</span>
                                <span class="value">${fclQuote.transitTime}</span>
                            </div>
                        </div>
                    </div>

                    <div class="cost-breakdown">
                        <h4>Cost Breakdown</h4>
                        <div class="breakdown-items">
                            <div class="breakdown-item">
                                <span>Ocean Freight</span>
                                <span>$${fclQuote.breakdown.oceanFreight.toLocaleString()}</span>
                            </div>
                            <div class="breakdown-item">
                                <span>Bunker Surcharge</span>
                                <span>$${fclQuote.breakdown.bunkerSurcharge.toLocaleString()}</span>
                            </div>
                            <div class="breakdown-item">
                                <span>Documentation</span>
                                <span>$${fclQuote.breakdown.documentation.toLocaleString()}</span>
                            </div>
                            <div class="breakdown-item">
                                <span>Handling</span>
                                <span>$${fclQuote.breakdown.handling.toLocaleString()}</span>
                            </div>
                            <div class="breakdown-item">
                                <span>Insurance</span>
                                <span>$${fclQuote.breakdown.insurance.toLocaleString()}</span>
                            </div>
                            <div class="breakdown-item subtotal">
                                <span>Subtotal</span>
                                <span>$${fclQuote.baseCost.toLocaleString()}</span>
                            </div>
                            <div class="breakdown-item">
                                <span>Service Fee</span>
                                <span>$${fclQuote.markup.toLocaleString()}</span>
                            </div>
                            <div class="breakdown-item total">
                                <span>Total Cost</span>
                                <span>$${fclQuote.totalCost.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Compliance Documents -->
                <div class="compliance-card">
                    <div class="compliance-header">
                        <h3><i class="fas fa-shield-check"></i> Compliance Requirements</h3>
                        <p>Required documents for your shipment</p>
                    </div>
                    
                    <div class="compliance-list">
                        ${complianceDocuments.map(doc => `
                            <div class="compliance-item ${doc.required ? 'required' : 'optional'}">
                                <div class="doc-info">
                                    <h4>${doc.name}</h4>
                                    <p>${doc.description}</p>
                                </div>
                                <div class="doc-status">
                                    ${doc.required ? '<span class="required-badge">Required</span>' : '<span class="optional-badge">Optional</span>'}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Payment Method Selection -->
                <div class="payment-method-section">
                    <h4><i class="fas fa-credit-card"></i> Select Payment Method</h4>
                    <div class="payment-methods">
                        ${fclQuote.totalCost <= 5000 ? `
                        <div class="payment-option" data-method="card">
                            <input type="radio" id="payment-card" name="payment-method" value="card" checked>
                            <label for="payment-card">
                                <i class="fas fa-credit-card"></i>
                                <span>Credit/Debit Card</span>
                                <small>Instant payment • Up to $5,000</small>
                            </label>
                        </div>
                        ` : ''}
                        <div class="payment-option" data-method="bank">
                            <input type="radio" id="payment-bank" name="payment-method" value="bank" ${fclQuote.totalCost > 5000 ? 'checked' : ''}>
                            <label for="payment-bank">
                                <i class="fas fa-university"></i>
                                <span>Bank Transfer</span>
                                <small>1-3 business days • No limit</small>
                            </label>
                        </div>
                        <div class="payment-option" data-method="wire">
                            <input type="radio" id="payment-wire" name="payment-method" value="wire">
                            <label for="payment-wire">
                                <i class="fas fa-globe"></i>
                                <span>International Wire</span>
                                <small>Same day • Large amounts</small>
                            </label>
                        </div>
                        ${fclQuote.totalCost >= 10000 ? `
                        <div class="payment-option" data-method="credit">
                            <input type="radio" id="payment-credit" name="payment-method" value="credit">
                            <label for="payment-credit">
                                <i class="fas fa-handshake"></i>
                                <span>Trade Credit</span>
                                <small>30-day terms • For established customers</small>
                            </label>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="quote-actions">
                    <button type="button" class="secondary-btn" onclick="goBackToForm()">
                        <i class="fas fa-arrow-left"></i> Modify Quote
                    </button>
                    <button type="button" class="submit-btn" onclick="proceedToPayment()">
                        <i class="fas fa-arrow-right"></i> Continue to Payment
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Make functions globally available
(window as any).goBackToForm = function() {
    currentStep = 'form';
    renderFclPage();
};

(window as any).proceedToPayment = async function() {
    try {
        currentStep = 'payment';
        
        // Store quote data for payment
        setState({
            paymentContext: {
                service: 'fcl',
                quote: fclQuote as any,
                shipmentId: bookingId,
                origin: fclFormData!.originPort,
                destination: fclFormData!.destinationPort,
                addons: []
            }
        });

        // Redirect to payment page
        const { switchPage } = await import('./ui');
        switchPage('payment');
        
    } catch (error) {
        console.error('Payment redirect error:', error);
        showToast('Failed to proceed to payment. Please try again.', 'error');
    }
};

function renderConfirmationView() {
    const page = document.getElementById('page-fcl');
    if (!page || !fclQuote) return;

    if (!bookingId) {
        bookingId = `FCL-${Date.now().toString().slice(-6)}`;
    }

    page.innerHTML = `
        <div class="fcl-elegant-container">
            <!-- Confirmation Header -->
            <div class="fcl-header success">
                <div class="service-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="service-info">
                    <h1>Booking Confirmed!</h1>
                    <p>Your FCL shipment has been successfully booked</p>
                </div>
            </div>

            <div class="confirmation-container">
                <!-- Booking Details -->
                <div class="confirmation-card">
                    <div class="confirmation-header">
                        <h3><i class="fas fa-clipboard-check"></i> Booking Confirmation</h3>
                        <div class="booking-id">Booking ID: ${bookingId}</div>
                    </div>
                    
                    <div class="booking-summary">
                        <div class="summary-item">
                            <span class="label">Route:</span>
                            <span class="value">${fclQuote.route}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Service:</span>
                            <span class="value">${fclQuote.serviceType.replace('-', ' to ').toUpperCase()}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Container:</span>
                            <span class="value">${fclQuote.containers}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Carrier:</span>
                            <span class="value">${fclQuote.carrier}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Transit Time:</span>
                            <span class="value">${fclQuote.transitTime}</span>
                        </div>
                        ${fclFormData.hsCode ? `
                        <div class="summary-item">
                            <span class="label">HS Code:</span>
                            <span class="value">${fclFormData.hsCode}</span>
                        </div>
                        ` : ''}
                        ${fclFormData.hsCodeDescription ? `
                        <div class="summary-item">
                            <span class="label">HS Description:</span>
                            <span class="value">${fclFormData.hsCodeDescription}</span>
                        </div>
                        ` : ''}
                        <div class="summary-item total">
                            <span class="label">Total Paid:</span>
                            <span class="value">$${fclQuote.totalCost.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <!-- Next Steps -->
                <div class="next-steps-card">
                    <h3><i class="fas fa-list-check"></i> Next Steps</h3>
                    <div class="steps-list">
                        <div class="step-item">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4>Prepare Documentation</h4>
                                <p>Gather all required compliance documents</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4>Container Delivery</h4>
                                <p>Coordinate container pickup/delivery as per service type</p>
                            </div>
                        </div>
                        <div class="step-item">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h4>Track Shipment</h4>
                                <p>Monitor your shipment progress online</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="confirmation-actions">
                    <button type="button" class="secondary-btn" onclick="downloadPDF()">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                    <button type="button" class="secondary-btn" onclick="trackShipment()">
                        <i class="fas fa-map-location-dot"></i> Track Shipment
                    </button>
                    <button type="button" class="submit-btn" onclick="bookAgain()">
                        <i class="fas fa-plus"></i> Book Another Shipment
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Make functions globally available
(window as any).downloadPDF = async function() {
    try {
        showToast('Generating PDF...', 'info');
        
        // Import jsPDF dynamically
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(102, 126, 234);
        doc.text('FCL Booking Confirmation', 20, 30);
        
        // Booking ID
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Booking ID: ${bookingId}`, 20, 50);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 60);
        
        // Shipment Details
        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Shipment Details', 20, 80);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(`Route: ${fclQuote!.route}`, 20, 95);
        doc.text(`Service: ${fclQuote!.serviceType.replace('-', ' to ').toUpperCase()}`, 20, 105);
        doc.text(`Container: ${fclQuote!.containers}`, 20, 115);
        doc.text(`Carrier: ${fclQuote!.carrier}`, 20, 125);
        
        // HS Code information
        let yPos = 135;
        if (fclFormData!.hsCode) {
            doc.text(`HS Code: ${fclFormData!.hsCode}`, 20, yPos);
            yPos += 10;
            if (fclFormData!.hsCodeDescription) {
                doc.text(`HS Description: ${fclFormData!.hsCodeDescription}`, 20, yPos);
                yPos += 10;
            }
        }
        if (fclFormData!.commodityDescription) {
            doc.text(`Commodity: ${fclFormData!.commodityDescription}`, 20, yPos);
            yPos += 10;
        }
        doc.text(`Transit Time: ${fclQuote!.transitTime}`, 20, 135);
        
        // Cost Breakdown
        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Cost Breakdown', 20, 155);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        yPos = Math.max(yPos + 20, 170);
        doc.text(`Ocean Freight: $${fclQuote!.breakdown.oceanFreight.toLocaleString()}`, 20, yPos);
        doc.text(`Bunker Surcharge: $${fclQuote!.breakdown.bunkerSurcharge.toLocaleString()}`, 20, yPos + 10);
        doc.text(`Documentation: $${fclQuote!.breakdown.documentation.toLocaleString()}`, 20, yPos + 20);
        doc.text(`Handling: $${fclQuote!.breakdown.handling.toLocaleString()}`, 20, yPos + 30);
        doc.text(`Insurance: $${fclQuote!.breakdown.insurance.toLocaleString()}`, 20, yPos + 40);
        doc.text(`Service Fee: $${fclQuote!.markup.toLocaleString()}`, 20, yPos + 50);
        
        // Total
        doc.setFontSize(12);
        doc.setTextColor(102, 126, 234);
        doc.text(`Total: $${fclQuote!.totalCost.toLocaleString()}`, 20, yPos + 70);
        
        // Compliance Documents
        doc.setFontSize(14);
        doc.text('Required Documents', 20, yPos + 90);
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        complianceDocuments.forEach((doc_item, index) => {
            if (doc_item.required) {
                doc.text(`${index + 1}. ${doc_item.name}`, 25, yPos + 105 + (index * 10));
            }
        });
        
        // Save PDF
        doc.save(`FCL-Booking-${bookingId}.pdf`);
        showToast('PDF downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showToast('Failed to generate PDF', 'error');
    }
};

(window as any).trackShipment = function() {
    showToast('Tracking feature will be available once shipment is dispatched', 'info');
};

(window as any).bookAgain = function() {
    // Reset state
    currentStep = 'form';
    fclFormData = null;
    fclQuote = null;
    complianceDocuments = [];
    bookingId = '';
    
    // Render form again
    renderFclPage();
    showToast('Ready for new booking!', 'success');
};

// Export function for payment completion callback
(window as any).completeFclBooking = function() {
    currentStep = 'confirmation';
    renderConfirmationView();
};