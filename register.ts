// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { State, setState, resetTradeFinanceState, TradeFinanceAssessment, ComplianceDoc } from './state';
import { switchPage, showToast, updateProgressBar, toggleLoading, updateLookupCounterUI } from './ui';
import { DOMElements } from './dom';
import { Type } from '@google/genai';
import { MARKUP_CONFIG } from './pricing';
import { checkAndDecrementLookup } from './api';

let conversationHistory: { role: string, parts: { text: string }[] }[] = [];
const MAX_CONVERSATION_TURNS = 3; 
let conversationTurns = 0;


// --- RENDER FUNCTION ---

function renderRegisterPage() {
    const page = DOMElements.register.page;
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div id="tf-main-view">
            <div class="tf-hero">
                <div class="tf-hero-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM2.25 7.93v8.519c0 .245.135.468.372.648L11.25 22.25v-9l-9-5.25Z" />
                    </svg>
                </div>
                <div>
                    <h2>Vcanship Trade Finance</h2>
                    <p class="subtitle" style="margin: 0; max-width: none;">Unlock working capital, mitigate risks, and streamline your global trade operations. Our solutions are integrated directly into your shipping workflow.</p>
                </div>
            </div>

            <div class="form-container" style="max-width: 100%;">
                 <div class="tf-product-cards">
                    <div class="tf-product-card" data-product="Invoice Financing">
                        <div class="tf-product-card-header">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81" /></svg>
                            <h4>Invoice Financing</h4>
                        </div>
                        <p>Convert your unpaid invoices into immediate cash. Stop waiting 30-90 days for customer payments.</p>
                        <ul>
                            <li><strong>Access up to 90%</strong> of your invoice value within 24 hours.</li>
                        </ul>
                    </div>
                     <div class="tf-product-card" data-product="PO Financing">
                        <div class="tf-product-card-header">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                            <h4>Purchase Order (PO) Financing</h4>
                        </div>
                        <p>Secure funds to pay your suppliers and fulfill large customer orders before you've been paid.</p>
                         <ul>
                            <li>Fulfill orders you couldn't otherwise afford to take on.</li>
                        </ul>
                    </div>
                    <div class="tf-product-card" data-product="Supply Chain Finance">
                        <div class="tf-product-card-header">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.25a.75.75 0 0 1-.75-.75V5.25c0-.414.336-.75.75-.75h19.5c.414 0 .75.336.75.75v14.25a.75.75 0 0 1-.75-.75h-4.5m-4.5 0H9" /></svg>
                            <h4>Supply Chain Finance</h4>
                        </div>
                        <p>Offer early payment to your suppliers, improving their cash flow while you maintain yours.</p>
                         <ul>
                            <li>Strengthen supplier relationships and negotiate better terms.</li>
                        </ul>
                    </div>
                </div>

                <div class="form-actions" style="margin-top: 2rem; justify-content: center;">
                    <button class="main-submit-btn" id="tf-start-application-btn" disabled>Select a Product to Start</button>
                </div>

                <div class="ai-advisor-container">
                    <h3>Need Help Choosing?</h3>
                    <p class="subtitle" style="margin: 0 0 1rem 0;">Describe your business needs to our AI Trade Advisor for a personalized recommendation.</p>
                    <div id="lookup-counter" class="lookup-counter"></div>
                    <div id="tf-chat-history" class="chat-history-tf">
                        <div class="chat-message-tf advisor-msg">
                            Hello! Please describe your business situation. For example, "I have a large purchase order from a new customer but need funds to pay my supplier."
                        </div>
                    </div>
                    <form id="tf-advisor-form" class="advisor-form">
                        <textarea id="tf-user-query" placeholder="Describe your situation here..." required></textarea>
                        <button type="submit" class="cta-button">Get Advice</button>
                    </form>
                </div>
            </div>
        </div>
        
        <div id="tf-application-view" class="hidden">
             <div class="form-container">
                <div id="tf-wizard-header" class="tf-wizard-header"></div>
                <div class="visual-progress-bar" id="progress-bar-trade-finance">
                    <div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div><div class="progress-step"></div>
                </div>
                
                <form id="tf-application-form" novalidate>
                    <!-- Step 1: Company Details -->
                    <div id="tf-step-1" class="service-step">
                        <h3>Step 1: Company Details</h3>
                        <div class="form-section two-column">
                            <div class="input-wrapper"><label for="tf-company-name">Company Name</label><input type="text" id="tf-company-name" required></div>
                            <div class="input-wrapper"><label for="tf-registration-number">Business Registration No.</label><input type="text" id="tf-registration-number" required></div>
                            <div class="input-wrapper"><label for="tf-contact-person">Contact Person</label><input type="text" id="tf-contact-person" required></div>
                            <div class="input-wrapper"><label for="tf-contact-email">Contact Email</label><input type="email" id="tf-contact-email" required></div>
                        </div>
                    </div>
                    
                     <!-- Step 2: Documents -->
                    <div id="tf-step-2" class="service-step">
                        <h3>Step 2: Upload Compliance Documents</h3>
                        <p class="subtitle">Drag & drop your files or click to upload.</p>
                        <div id="tf-compliance-checklist" class="compliance-checklist"></div>
                    </div>
                    
                     <!-- Step 3: Review -->
                    <div id="tf-step-3" class="service-step">
                        <h3>Step 3: Review & Submit</h3>
                        <div id="tf-review-pane" class="payment-overview"></div>
                    </div>
                    
                     <!-- Step 4: Confirmation -->
                    <div id="tf-step-4" class="service-step">
                        <div class="confirmation-container">
                             <h3>Application Received!</h3>
                             <p>Your application ID is <strong id="tf-application-id"></strong>. Our team will review your submission and be in touch within 2-3 business days.</p>
                             <div class="confirmation-actions">
                                <button type="button" class="secondary-btn" id="tf-download-summary-btn">Download Summary</button>
                                <button type="button" class="main-submit-btn" id="tf-back-to-services-btn">Back to Services</button>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="secondary-btn" id="tf-wizard-back-btn">Back</button>
                        <button type="button" class="main-submit-btn" id="tf-wizard-next-btn">Next</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    page.querySelector('.back-btn')?.addEventListener('click', () => {
        DOMElements.register.mainView.classList.remove('hidden');
        DOMElements.register.applicationView.classList.add('hidden');
        switchPage('landing');
    });
}

// --- WIZARD LOGIC ---
function goToTfStep(step: number) {
    setState({ currentTradeFinanceStep: step });
    updateProgressBar('trade-finance', step - 1);

    document.querySelectorAll('#tf-application-form .service-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`tf-step-${step}`)?.classList.add('active');

    const backBtn = document.getElementById('tf-wizard-back-btn') as HTMLButtonElement;
    const nextBtn = document.getElementById('tf-wizard-next-btn') as HTMLButtonElement;
    const formActions = document.querySelector('#tf-application-form .form-actions');

    if (step === 4) { // Confirmation step
        formActions?.classList.add('hidden');
    } else {
        formActions?.classList.remove('hidden');
    }

    if (step === 1) {
        backBtn.style.visibility = 'hidden';
    } else {
        backBtn.style.visibility = 'visible';
    }

    if (step === 3) {
        nextBtn.textContent = 'Submit Application';
    } else {
        nextBtn.textContent = 'Next';
    }
}

// --- AI ADVISOR ---
async function handleAdvisorQuery(e: Event) {
    e.preventDefault();
    if (!checkAndDecrementLookup()) {
        return;
    }

    const { advisorForm, userQueryInput, chatHistory } = DOMElements.register;
    if (!advisorForm || !userQueryInput || !chatHistory || !State.api) return;

    const query = userQueryInput.value.trim();
    if (!query) return;

    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message-tf user-msg';
    userMsg.textContent = query;
    chatHistory.appendChild(userMsg);
    userQueryInput.value = '';
    conversationHistory.push({ role: 'user', parts: [{ text: query }] });
    conversationTurns++;

    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.className = 'chat-message-tf advisor-msg thinking-indicator';
    thinkingIndicator.innerHTML = `<span>Thinking</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>`;
    chatHistory.appendChild(thinkingIndicator);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    if (conversationTurns >= MAX_CONVERSATION_TURNS) {
        const supportMessage = `It seems your query is quite specific. For the best assistance, please start a general application and our experts will guide you, or contact them directly at <a href="mailto:support@vcanresources.com">support@vcanresources.com</a>.`;
        thinkingIndicator.remove();
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message-tf advisor-msg';
        botMsg.innerHTML = supportMessage;
        chatHistory.appendChild(botMsg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        conversationTurns = 0; // Reset
        return;
    }

    const aiResponseSchema = {
        type: Type.OBJECT,
        properties: {
            recommendedProduct: { type: Type.STRING, enum: ['Invoice Financing', 'PO Financing', 'Supply Chain Finance', 'None'] },
            reasoning: { type: Type.STRING },
        },
        required: ['recommendedProduct', 'reasoning']
    };

    try {
        const response = await State.api.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `System: You are a trade finance advisor for Vcanship. Recommend 'Invoice Financing', 'PO Financing', or 'Supply Chain Finance'. If unclear, recommend 'None'. Provide a brief reasoning.
            ${conversationHistory.map(c => `${c.role}: ${c.parts[0].text}`).join('\n')}
            user: ${query}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: aiResponseSchema
            }
        });

        const parsedResponse = JSON.parse(response.text);
        thinkingIndicator.remove();

        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message-tf advisor-msg';
        
        let botHtml = `<p>${parsedResponse.reasoning}</p>`;
        if (parsedResponse.recommendedProduct && parsedResponse.recommendedProduct !== 'None') {
            botHtml += `<p>I've highlighted the recommended option for you above. Click it to learn more and start an application.</p>`;
            document.querySelectorAll('.tf-product-card').forEach(c => c.classList.remove('highlighted', 'selected'));
            const recommendedCard = document.querySelector(`.tf-product-card[data-product="${parsedResponse.recommendedProduct}"]`);
            recommendedCard?.classList.add('highlighted');
        }
        
        botMsg.innerHTML = botHtml;
        chatHistory.appendChild(botMsg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        conversationHistory.push({ role: 'model', parts: [{ text: JSON.stringify(parsedResponse) }] });

    } catch (error) {
        console.error("AI Advisor Error:", error);
        thinkingIndicator.remove();
        const errorMsg = document.createElement('div');
        errorMsg.className = 'chat-message-tf advisor-msg';
        errorMsg.textContent = 'Sorry, I encountered an error. Please try again.';
        chatHistory.appendChild(errorMsg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

// --- APPLICATION WIZARD ---
function startApplication(product: string) {
    setState({ tradeFinanceProduct: product });
    DOMElements.register.mainView.classList.add('hidden');
    DOMElements.register.applicationView.classList.remove('hidden');

    const wizardHeader = document.getElementById('tf-wizard-header');
    if(wizardHeader) {
        wizardHeader.innerHTML = `
            <h3>Applying for: ${product} 
                <button type="button" id="tf-change-product-btn" class="link-btn">(Change)</button>
            </h3>
        `;
        document.getElementById('tf-change-product-btn')?.addEventListener('click', () => {
             DOMElements.register.mainView.classList.remove('hidden');
             DOMElements.register.applicationView.classList.add('hidden');
             setState({tradeFinanceProduct: null});
        });
    }

    goToTfStep(1);
}

function handleWizardNext() {
    const currentStep = State.currentTradeFinanceStep;
    if (currentStep === 3) {
        const bookingId = `TF-${Date.now().toString().slice(-6)}`;
        (document.getElementById('tf-application-id') as HTMLElement).textContent = bookingId;
        goToTfStep(4);
    } else {
        if (currentStep === 1) renderComplianceStep(State.tradeFinanceProduct!);
        if (currentStep === 2) renderReviewPane();
        goToTfStep(currentStep + 1);
    }
}

function handleTfFileUpload(file: File, docId: string) {
    const docIndex = State.tradeFinanceComplianceDocs.findIndex(d => d.id === docId);
    if (docIndex > -1) {
        const updatedDocs = [...State.tradeFinanceComplianceDocs];
        updatedDocs[docIndex] = { ...updatedDocs[docIndex], file, status: 'uploaded' };
        setState({ tradeFinanceComplianceDocs: updatedDocs });

        const docItem = document.getElementById(docId);
        if (!docItem) return;
        
        const idleView = docItem.querySelector('.file-drop-area-idle') as HTMLElement;
        const uploadedView = docItem.querySelector('.file-drop-area-uploaded') as HTMLElement;
        if (idleView && uploadedView) {
            idleView.style.display = 'none';
            uploadedView.style.display = 'flex';
            uploadedView.innerHTML = `
                <div class="file-info">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="file-icon"><path fill-rule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 18.375 9h-7.5A3.75 3.75 0 0 1 7.125 5.25V1.5H5.625Zm7.5 0v3.75c0 .621.504 1.125 1.125 1.125h3.75a3.75 3.75 0 0 1-3.75 3.75h-7.5a.75.75 0 0 0-.75.75v11.25c0 .414.336.75.75.75h12.75a.75.75 0 0 0 .75-.75V12.75a.75.75 0 0 0-.75-.75h-7.5a2.25 2.25 0 0 1-2.25-2.25V1.5h-1.5Z" clip-rule="evenodd" /></svg>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-status-badge">Uploaded</span>
                    </div>
                </div>
                <button type="button" class="remove-file-btn" data-doc-id="${docId}">&times;</button>
            `;
        }
    }
}

function handleTfFileRemove(docId: string) {
    const docIndex = State.tradeFinanceComplianceDocs.findIndex(d => d.id === docId);
    if (docIndex > -1) {
        const updatedDocs = [...State.tradeFinanceComplianceDocs];
        updatedDocs[docIndex] = { ...updatedDocs[docIndex], file: null, status: 'pending' };
        setState({ tradeFinanceComplianceDocs: updatedDocs });
        renderComplianceStep(State.tradeFinanceProduct!);
    }
}

function renderComplianceStep(product: string) {
    let docs: ComplianceDoc[] = [
        { id: 'tf-doc-incorp', title: 'Certificate of Incorporation', description: 'Legal proof of your company registration.', status: 'pending', file: null, required: true },
        { id: 'tf-doc-id', title: 'Director ID Documents', description: 'Passport or national ID for all company directors.', status: 'pending', file: null, required: true },
    ];

    if (product === 'Invoice Financing') {
        docs.push({ id: 'tf-doc-invoice', title: 'Sample Customer Invoice', description: 'A typical invoice you issue to your clients.', status: 'pending', file: null, required: true });
    } else if (product === 'PO Financing') {
        docs.push({ id: 'tf-doc-po', title: 'Purchase Order', description: 'The PO you need to fulfill.', status: 'pending', file: null, required: true });
        docs.push({ id: 'tf-doc-supplier', title: 'Supplier Quotation / Proforma', description: 'The invoice from your supplier for the goods.', status: 'pending', file: null, required: true });
    }
    setState({ tradeFinanceComplianceDocs: docs });

    DOMElements.register.complianceChecklist.innerHTML = docs.map(doc => `
        <div class="compliance-doc-item" id="${doc.id}" data-status="${doc.status}">
            <div class="compliance-doc-info">
                <h4>${doc.title} ${doc.required ? '<span>(Required)</span>' : ''}</h4>
                <p>${doc.description}</p>
            </div>
            <div class="file-drop-area">
                <div class="file-drop-area-idle">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="upload-icon"><path fill-rule="evenodd" d="M11.47 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06l-3.22-3.22V16.5a.75.75 0 0 1-1.5 0V4.81L8.03 8.03a.75.75 0 0 1-1.06-1.06l4.5-4.5ZM3 15.75A2.25 2.25 0 0 1 5.25 18h13.5A2.25 2.25 0 0 1 21 15.75v-3a.75.75 0 0 1 1.5 0v3A3.75 3.75 0 0 1 18.75 19.5H5.25A3.75 3.75 0 0 1 1.5 15.75v-3a.75.75 0 0 1 1.5 0v3Z" clip-rule="evenodd" /></svg>
                    <span>Drop file or click</span>
                </div>
                <div class="file-drop-area-uploaded" style="display: none;"></div>
                <input type="file" class="file-input" accept=".pdf,.doc,.docx,.jpg,.png" data-doc-id="${doc.id}">
            </div>
        </div>
    `).join('');
}

function renderReviewPane() {
    const reviewPane = document.getElementById('tf-review-pane');
    if(!reviewPane) return;
    
    reviewPane.innerHTML = `
        <div style="width: 100%;">
            <h4>Application Summary</h4>
            <div class="review-item"><span>Product:</span><strong>${State.tradeFinanceProduct}</strong></div>
            <div class="review-item"><span>Company:</span><strong>${(document.getElementById('tf-company-name') as HTMLInputElement).value}</strong></div>
            <div class="review-item"><span>Contact:</span><strong>${(document.getElementById('tf-contact-email') as HTMLInputElement).value}</strong></div>
            <hr>
            <h4>Uploaded Documents</h4>
            <ul>
                ${State.tradeFinanceComplianceDocs.filter(d => d.file).map(d => `<li>${d.title}: ${d.file!.name}</li>`).join('') || '<li>No documents uploaded.</li>'}
            </ul>
        </div>
    `;
}

// --- ATTACH EVENT LISTENERS ---
function attachRegisterEventListeners() {
    DOMElements.register.advisorForm?.addEventListener('submit', handleAdvisorQuery);

    document.getElementById('tf-wizard-next-btn')?.addEventListener('click', handleWizardNext);
    document.getElementById('tf-wizard-back-btn')?.addEventListener('click', () => goToTfStep(State.currentTradeFinanceStep - 1));
    document.getElementById('tf-back-to-services-btn')?.addEventListener('click', () => switchPage('landing'));

    function handleProductSelection(product: string) {
        document.querySelectorAll('.tf-product-card').forEach(c => c.classList.remove('selected', 'highlighted'));
        document.querySelector(`.tf-product-card[data-product="${product}"]`)?.classList.add('selected');
        setState({ tradeFinanceProduct: product });
        const startBtn = document.getElementById('tf-start-application-btn') as HTMLButtonElement;
        startBtn.disabled = false;
        startBtn.textContent = `Start ${product} Application`;
    }

    const page = DOMElements.register.page;
    page.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const productCard = target.closest<HTMLElement>('.tf-product-card');
        if (productCard?.dataset.product) {
            handleProductSelection(productCard.dataset.product);
        }

        const startAppBtn = target.closest<HTMLButtonElement>('#tf-start-application-btn');
        if (startAppBtn && !startAppBtn.disabled && State.tradeFinanceProduct) {
            startApplication(State.tradeFinanceProduct);
        }

        const removeFileBtn = target.closest<HTMLButtonElement>('.remove-file-btn');
        if (removeFileBtn?.dataset.docId) {
            handleTfFileRemove(removeFileBtn.dataset.docId);
        }
    });
    
    page.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if(target.classList.contains('file-input') && target.files?.[0] && target.dataset.docId) {
            handleTfFileUpload(target.files[0], target.dataset.docId);
        }
    });
}

// --- INITIALIZATION ---
export function startRegister() {
    setState({ currentService: 'register' });
    renderRegisterPage();
    switchPage('register');
    resetTradeFinanceState();
    updateLookupCounterUI();
    conversationHistory = [];
    conversationTurns = 0;
    attachRegisterEventListeners();
}