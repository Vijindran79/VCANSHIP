// FIX: Add type definitions for the Web Speech API to resolve "Cannot find name 'SpeechRecognition'" error.
// This is a browser-specific API and its types are not included in the default TypeScript DOM library.
interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}
interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
}
interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    onstart: (event: Event) => void;
    onend: (event: Event) => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
}
declare var SpeechRecognition: {
    new(): SpeechRecognition;
};
declare var webkitSpeechRecognition: {
    new(): SpeechRecognition;
};

// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import * as monaco from 'monaco-editor';
import { DOMElements } from './dom';
import { State, setState, Address } from './state';
import { t } from './i18n';
import { mountService } from './router';
import { showToast } from './ui';

// Module-level store for editor instances to manage their lifecycle
let editors: Map<string, monaco.editor.IStandaloneCodeEditor> = new Map();

function cleanupApiHubEditors() {
    editors.forEach(editor => editor.dispose());
    editors.clear();
}


export function renderLandingPage() {
    const page = DOMElements.pageLanding;
    if (!page) return;

    page.innerHTML = `
      <section class="landing-hero-v2">
        <div class="hero-content-wrapper">
            <h1 id="hero-title-dynamic" class="hero-title-v2 fade-in-text">Global Shipping, Intelligently Simplified</h1>
            <p id="hero-subtitle-dynamic" class="hero-subtitle-v2 fade-in-text">Vcanship's AI-driven platform relentlessly finds the cheapest global shipping rates for parcels and freight.</p>
        </div>
      </section>

      <section class="landing-section services-overview">
        <div class="card parcel-promo-card-large service-promo-card card-glow" data-service="parcel">
            <div class="parcel-promo-logo">
                <i class="fa-solid fa-truck truck-icon"></i>
            </div>
            <h3 class="parcel-promo-title" data-i18n="landing.promo_card_title">Send a parcel — cheapest, fastest, and safest.</h3>
            <button class="main-submit-btn" data-i18n="landing.promo_card_cta">Get a Quote</button>
        </div>

        <h2 class="landing-section-title" style="margin-top: 4rem;" data-i18n="landing.other_services_title">Our Other Services</h2>
        <p class="landing-section-subtitle" data-i18n="landing.other_services_subtitle">From a single document to a full container load, we've got you covered.</p>
        
        <div class="services-overview-grid">
            <div class="service-promo-card card" data-service="airfreight">
                <i class="fa-solid fa-plane-departure card-icon card-icon-air"></i>
                <h4 data-i18n="landing.air_freight_title">Air Freight</h4>
                <p data-i18n="landing.air_freight_subtitle">Fast and reliable air cargo for time-sensitive shipments.</p>
            </div>
            <div class="service-promo-card card" data-service="fcl">
                <i class="fa-solid fa-boxes-stacked card-icon"></i>
                <h4 data-i18n="landing.fcl_title">Sea Freight FCL</h4>
                <p data-i18n="landing.fcl_subtitle">Exclusive use of a full container for your goods.</p>
            </div>
            <div class="service-promo-card card" data-service="lcl">
                <i class="fa-solid fa-boxes-packing card-icon"></i>
                <h4 data-i18n="landing.lcl_title">Sea Freight LCL</h4>
                <p data-i18n="landing.lcl_subtitle">Cost-effective shared container space for smaller loads.</p>
            </div>
            <div class="service-promo-card card" data-service="ecommerce">
                <i class="fa-solid fa-store card-icon"></i>
                <h4>${t('landing.ecommerce_title')}</h4>
                <p>${t('landing.ecommerce_subtitle')}</p>
            </div>
        </div>
      </section>

      <section class="landing-section seo-rotator-section">
        <div class="seo-rotator-container">
            <h2 id="seo-rotator-text-1" class="seo-rotator-line seo-rotator-text"></h2>
            <h2 id="seo-rotator-text-2" class="seo-rotator-line seo-rotator-text"></h2>
        </div>
      </section>

      <section class="landing-section secure-trade-promo">
        <div class="secure-trade-content">
            <div class="secure-trade-text">
                <h2 class="landing-section-title" data-i18n="landing.secure_trade_title">Trade with Confidence. Ship without Surprises.</h2>
                <p class="landing-section-subtitle" style="text-align: left; margin-left: 0; max-width: 500px;" data-i18n-html="landing.secure_trade_subtitle">Introducing <strong>Vcanship Secure Trade</strong>, our new escrow and verification service that eliminates risks for buyers and sellers in global trade.</p>
                <button class="main-submit-btn" data-service="secure-trade" data-i18n="landing.secure_trade_cta">Learn More & Start a Secure Trade</button>
            </div>
            <div class="secure-trade-steps">
                <div class="step-item"><span>1</span><div><h4 data-i18n="landing.secure_trade_step1_title">Buyer Pays Vcanship</h4><p data-i18n="landing.secure_trade_step1_desc">The buyer funds the transaction securely in our escrow account.</p></div></div>
                <div class="step-item"><span>2</span><div><h4 data-i18n="landing.secure_trade_step2_title">Seller Delivers to Us</h4><p data-i18n="landing.secure_trade_step2_desc">Seller delivers goods to a Vcanship warehouse for verification.</p></div></div>
                <div class="step-item"><span>3</span><div><h4 data-i18n="landing.secure_trade_step3_title">We Verify & Ship</h4><p data-i18n="landing.secure_trade_step3_desc">We inspect the cargo, send a report to the buyer, and ship upon approval.</p></div></div>
                <div class="step-item"><span>4</span><div><h4 data-i18n="landing.secure_trade_step4_title">Seller Gets Paid</h4><p data-i18n="landing.secure_trade_step4_desc">We release the funds to the seller once the shipment is underway.</p></div></div>
            </div>
        </div>
      </section>

      <section class="landing-section why-us-section">
        <h2 class="landing-section-title" data-i18n="landing.why_us_title">Why Vcanship?</h2>
        <p class="landing-section-subtitle" data-i18n="landing.why_us_subtitle">We're not just a platform; we're your logistics partner.</p>
        <div class="why-us-grid">
            <div class="feature-item">
                <i class="fa-solid fa-brain feature-item-icon"></i>
                <div><h4 data-i18n="landing.why_us_feature1_title">AI-Powered Insights</h4><p data-i18n="landing.why_us_feature1_desc">Our intelligent platform analyzes millions of data points to find you optimal routes and pricing.</p></div>
            </div>
            <div class="feature-item">
                <i class="fa-solid fa-globe feature-item-icon"></i>
                <div><h4 data-i18n="landing.why_us_feature2_title">Global Reach</h4><p data-i18n="landing.why_us_feature2_desc">Access a vast network of carriers and partners covering over 220 countries and territories.</p></div>
            </div>
            <div class="feature-item">
                <i class="fa-solid fa-magnifying-glass-dollar feature-item-icon"></i>
                <div><h4 data-i18n="landing.why_us_feature3_title">Transparent Pricing</h4><p data-i18n="landing.why_us_feature3_desc">No hidden fees. Get detailed cost breakdowns before you book, every single time.</p></div>
            </div>
        </div>
      </section>
    `;

    // --- SEO Rotator Logic ---
    const businessSeo = t('landing.seo.business').split('|');
    const emotionalSeo = t('landing.seo.emotional').split('|');

    const rotator1 = document.getElementById('seo-rotator-text-1');
    const rotator2 = document.getElementById('seo-rotator-text-2');

    let idx1 = 0;
    let idx2 = 0;

    if (rotator1) {
        rotator1.textContent = businessSeo[idx1];
        rotator1.classList.add('visible'); // Make text visible on initial load
        setInterval(() => {
            rotator1.classList.remove('visible');
            setTimeout(() => {
                idx1 = (idx1 + 1) % businessSeo.length;
                rotator1.textContent = businessSeo[idx1];
                rotator1.classList.add('visible');
            }, 500); // Wait for fade out
        }, 4000); // 4 seconds - AS REQUESTED
    }

    if (rotator2) {
        // Stagger the start for better visual flow
        setTimeout(() => {
            rotator2.textContent = emotionalSeo[idx2];
            rotator2.classList.add('visible');
            setInterval(() => {
                rotator2.classList.remove('visible');
                setTimeout(() => {
                    idx2 = (idx2 + 1) % emotionalSeo.length;
                    rotator2.textContent = emotionalSeo[idx2];
                    rotator2.classList.add('visible');
                }, 500); // Wait for fade out
            }, 4000); // 4 seconds - AS REQUESTED
        }, 2000); // 2 second delay for staggered start
    }

    // Start the hero rotation loop
    startHeroRotation();
}

let heroRotationInterval: any = null;

function startHeroRotation() {
    if (heroRotationInterval) clearInterval(heroRotationInterval);

    const messages = [
        {
            title: "Send Love, Not Just Parcels",
            subtitle: "Connect with family across the globe. We deliver your care packages with heart and speed."
        },
        {
            title: "One-Stop Logistics Solution",
            subtitle: "Parcel, Air Freight, FCL, LCL & More. Your business deserves the best rates and reliability."
        }
    ];

    let currentIndex = 0;

    heroRotationInterval = setInterval(() => {
        const titleEl = document.getElementById('hero-title-dynamic');
        const subtitleEl = document.getElementById('hero-subtitle-dynamic');

        if (!titleEl || !subtitleEl) return;

        // Fade out
        titleEl.style.opacity = '0';
        subtitleEl.style.opacity = '0';

        setTimeout(() => {
            currentIndex = (currentIndex + 1) % messages.length;

            titleEl.textContent = messages[currentIndex].title;
            subtitleEl.textContent = messages[currentIndex].subtitle;

            // Fade in
            titleEl.style.opacity = '1';
            subtitleEl.style.opacity = '1';
        }, 500); // Wait for fade out

    }, 4000); // 4 seconds rotation
}


export function renderHelpPage() {
    const page = DOMElements.pageHelp;
    if (!page) return;

    const faqs = t('help_page.faqs');
    if (!Array.isArray(faqs)) {
        console.error("FAQs translation is not an array. Got:", typeof faqs, faqs);
        // Fallback to empty array to prevent crash
        return;
    }

    const categories = [t('help_page.categories.all'), ...new Set(faqs.map(f => f.category))];
    const categoryIcons: { [key: string]: string } = {
        [t('help_page.categories.all')]: 'fa-solid fa-grip',
        [t('help_page.categories.general')]: 'fa-solid fa-circle-info',
        [t('help_page.categories.shipping')]: 'fa-solid fa-truck-fast',
        [t('help_page.categories.booking')]: 'fa-solid fa-calendar-check',
        [t('help_page.categories.billing')]: 'fa-solid fa-file-invoice-dollar',
        [t('help_page.categories.account')]: 'fa-solid fa-user-gear'
    };

    page.innerHTML = `
                                                                                                                                                                                        < div class="service-page-header" >
                                                                                                                                                                                            <h2 data - i18n="help_page.title" > Help Center </h2>
                                                                                                                                                                                                < p class="subtitle" data - i18n="help_page.subtitle" > Find answers to common questions about our services.</p>
                                                                                                                                                                                                    </div>
                                                                                                                                                                                                    < div class="help-center-container" >
                                                                                                                                                                                                        <div class="help-search-bar" >
                                                                                                                                                                                                            <i class="fa-solid fa-magnifying-glass" > </i>
                                                                                                                                                                                                                < input type = "search" id = "help-search-input" placeholder = "${t('help_page.search_placeholder')}" >
                                                                                                                                                                                                                    <button id="voice-search-btn" aria - label="${t('help_page.voice_search_aria')}" >
                                                                                                                                                                                                                        <i class="fa-solid fa-microphone" > </i>
                                                                                                                                                                                                                            </button>
                                                                                                                                                                                                                            </div>

                                                                                                                                                                                                                            < div class="faq-categories" >
                                                                                                                                                                                                                                ${categories.map(cat => `
                    <button class="faq-category-card" data-category="${cat}">
                        <i class="${categoryIcons[cat]}"></i>
                        <span>${cat}</span>
                    </button>
                `).join('')
        }
    </div>

        < div id = "faq-list" class="card" style = "padding: 1rem 2rem;" >
            <!--FAQs will be rendered here-- >
                </div>

                < div id = "faq-not-found" class="hidden" style = "text-align: center; padding: 2rem;" >
                    <p data - i18n="help_page.no_results" > No results found.Please try different keywords.</p>
                        </div>

                        < div class="card contact-support-card" >
                            <h3 data - i18n="help_page.still_have_questions" > Still have questions ? </h3>
                                < p data - i18n="help_page.support_desc" > Our support team is ready to help you with any issues.</p>
                                    < div class="form-actions" style = "justify-content: center; gap: 1rem;" >
                                        <a href="tel:+12513166847" class="secondary-btn" style = "text-decoration: none; display: inline-flex; align-items: center; gap: 0.75rem;" >
                                            <i class="fa-solid fa-phone" > </i>
                                                < span data - i18n="help_page.call_support" > Call Support </span>
                                                    </a>
                                                    < a href = "mailto:vg@vcnresources.com" class="main-submit-btn" >
                                                        <i class="fa-regular fa-envelope" > </i>
                                                            < span data - i18n="help_page.email_support" > Email Support </span>
                                                                </a>
                                                                </div>
                                                                < div class="contact-support-fallback" >
                                                                    <span data - i18n="help_page.copy_email_desc" > Or copy our email: </span>
                                                                        < div class="api-key-display" style = "margin-top: 0.5rem; justify-content: center;" >
                                                                            <code id="support-email-text" > vg@vcnresources.com</code>
                                                                                < button class="secondary-btn copy-btn" data - copy - target="#support-email-text" >
                                                                                    <i class="fa-regular fa-copy" > </i>
                                                                                        < span data - i18n="help_page.copy" > Copy </span>
                                                                                            </button>
                                                                                            </div>
                                                                                            </div>
                                                                                            </div>
                                                                                            </div>
                                                                                                `;

    const searchInput = page.querySelector('#help-search-input') as HTMLInputElement;
    const categoryContainer = page.querySelector('.faq-categories') as HTMLElement;
    const faqList = page.querySelector('#faq-list') as HTMLElement;
    const notFoundMessage = page.querySelector('#faq-not-found') as HTMLElement;

    let currentCategory = t('help_page.categories.all');
    let currentSearchTerm = '';

    function highlight(text: string, query: string): string {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function displayFaqs() {
        const filteredFaqs = faqs.filter((faq: any) => {
            const matchesCategory = currentCategory === t('help_page.categories.all') || faq.category === currentCategory;
            const matchesSearch = !currentSearchTerm ||
                faq.question.toLowerCase().includes(currentSearchTerm) ||
                faq.answer.toLowerCase().includes(currentSearchTerm);
            return matchesCategory && matchesSearch;
        });

        if (filteredFaqs.length === 0) {
            faqList.innerHTML = '';
            notFoundMessage.classList.remove('hidden');
        } else {
            faqList.innerHTML = filteredFaqs.map((faq: any) => `
                                                                                            < div class="faq-item" >
                                                                                                <div class="faq-question" > ${highlight(faq.question, currentSearchTerm)} </div>
                                                                                                    < div class="faq-answer" >
                                                                                                        <p>${highlight(faq.answer, currentSearchTerm)} </p>
                                                                                                            </div>
                                                                                                            </div>
                                                                                                                `).join('');
            notFoundMessage.classList.add('hidden');
        }
    }

    // Initial display
    categoryContainer.querySelector(`[data - category="${t('help_page.categories.all')}"]`)?.classList.add('active');
    displayFaqs();

    // Event Listeners
    searchInput.addEventListener('input', () => {
        currentSearchTerm = searchInput.value.toLowerCase().trim();
        displayFaqs();
    });

    categoryContainer.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const card = target.closest<HTMLButtonElement>('.faq-category-card');
        if (card) {
            currentCategory = card.dataset.category || t('help_page.categories.all');
            categoryContainer.querySelectorAll('.faq-category-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            displayFaqs();
        }
    });

    faqList.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        const question = target.closest('.faq-question');
        if (question) {
            question.parentElement?.classList.toggle('active');
        }
    });

    page.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            const targetSelector = btn.dataset.copyTarget;
            if (!targetSelector) return;

            const sourceElement = page.querySelector(targetSelector) as HTMLElement;
            if (!sourceElement) return;

            const textToCopy = sourceElement.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalIcon = btn.querySelector('i')?.className || 'fa-regular fa-copy';
                const originalText = btn.querySelector('span')?.textContent || t('help_page.copy');

                btn.classList.add('copied');
                if (btn.querySelector('i')) btn.querySelector('i')!.className = 'fa-solid fa-check';
                if (btn.querySelector('span')) btn.querySelector('span')!.textContent = t('help_page.copied');
                btn.disabled = true;

                setTimeout(() => {
                    btn.classList.remove('copied');
                    if (btn.querySelector('i')) btn.querySelector('i')!.className = originalIcon;
                    if (btn.querySelector('span')) btn.querySelector('span')!.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showToast('Failed to copy text.', 'error');
            });
        });
    });

    // --- Voice Search Logic ---
    const voiceSearchBtn = page.querySelector('#voice-search-btn') as HTMLButtonElement;
    const originalPlaceholder = searchInput.placeholder;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let recognition: SpeechRecognition | null = null;

    if (SpeechRecognitionAPI) {
        recognition = new SpeechRecognitionAPI();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        voiceSearchBtn.addEventListener('click', () => {
            if (voiceSearchBtn.classList.contains('listening')) {
                recognition?.stop();
            } else {
                recognition?.start();
            }
        });

        recognition.onstart = () => {
            voiceSearchBtn.classList.add('listening');
            searchInput.placeholder = 'Listening...';
        };

        recognition.onend = () => {
            voiceSearchBtn.classList.remove('listening');
            searchInput.placeholder = originalPlaceholder;
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            let errorMessage = 'An error occurred during voice recognition.';
            if (event.error === 'no-speech') {
                errorMessage = "I didn't hear anything. Please try again.";
            } else if (event.error === 'not-allowed') {
                errorMessage = "Microphone access was denied. Please allow access in your browser settings.";
            }
            showToast(errorMessage, 'error');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;

            // Trigger the input event to make the existing search logic run
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            searchInput.dispatchEvent(inputEvent);
        };

    } else {
        voiceSearchBtn.style.display = 'none';
        console.warn("Speech Recognition API not supported in this browser.");
    }
}
export function renderApiHubPage() {
    cleanupApiHubEditors();
    const page = DOMElements.pageApiHub;
    if (!page) return;

    const mockApiKey = `vcan_live_${'•'.repeat(20)} abcdef123`;

    const jsSnippet = `const apiKey = 'YOUR_API_KEY';
    const quoteData = {
        origin: { postcode: 'SW1A 0AA', country: 'GB' },
        destination: { postcode: '90210', country: 'US' },
        weight_kg: 2.5
    };

    fetch('https://api.vcanship.com/v1/parcel/rates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify(quoteData)
})
.then(response => response.json())
.then(data => console.log(data.quotes))
.catch(error => console.error('Error:', error));`;

    const pythonSnippet = `import requests

api_key = 'YOUR_API_KEY'
tracking_id = 'PAR-123456'

url = f"https://api.vcanship.com/v1/tracking/{tracking_id}"
headers = {
    "Authorization": f"Bearer {api_key}"
}

response = requests.get(url, headers=headers)

if response.status_code == 200:
    print(response.json())
else:
    print(f"Error: {response.status_code}")`;


    page.innerHTML = `
        <div class="service-page-header">
            <h2>API Hub</h2>
            <p class="subtitle">Integrate Vcanship's logistics capabilities into your applications.</p>
        </div>
        <div class="api-grid">
            <div class="api-key-card">
                <h3>Your API Key</h3>
                <p class="subtitle" style="text-align: left; margin: 0.5rem 0 1rem 0;">Use this key in the 'Authorization' header of your requests.</p>
                <div class="api-key-display">
                    <code id="api-key-text">${mockApiKey}</code>
                    <button class="secondary-btn copy-btn" data-copy-target="#api-key-text">
                        <i class="fa-regular fa-copy"></i>
                        <span>Copy</span>
                    </button>
                </div>
            </div>

            <div class="code-snippet-card">
                <h4>Get Parcel Rates (JavaScript)</h4>
                <div class="editor-wrapper">
                    <button class="secondary-btn copy-btn" data-editor-id="js-editor">
                        <i class="fa-regular fa-copy"></i>
                        <span>Copy</span>
                    </button>
                    <div id="js-editor-container" class="editor-container"></div>
                </div>
            </div>

            <div class="code-snippet-card">
                <h4>Track a Shipment (Python)</h4>
                <div class="editor-wrapper">
                    <button class="secondary-btn copy-btn" data-editor-id="python-editor">
                        <i class="fa-regular fa-copy"></i>
                        <span>Copy</span>
                    </button>
                    <div id="python-editor-container" class="editor-container"></div>
                </div>
            </div>
            
            <div class="use-case-card">
                <i class="fa-solid fa-store"></i>
                <h4>E-commerce Integration</h4>
                <p>Automate shipping cost calculation at checkout for your online store.</p>
            </div>
             <div class="use-case-card">
                <i class="fa-solid fa-boxes-stacked"></i>
                <h4>Warehouse Management</h4>
                <p>Integrate with your WMS to book freight and print labels automatically.</p>
            </div>
        </div>
    `;

    // Initialize Monaco Editors
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs';

    const jsEditor = monaco.editor.create(document.getElementById('js-editor-container')!, {
        value: jsSnippet,
        language: 'javascript',
        theme: theme,
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
    });
    editors.set('js-editor', jsEditor);

    const pythonEditor = monaco.editor.create(document.getElementById('python-editor-container')!, {
        value: pythonSnippet,
        language: 'python',
        theme: theme,
        readOnly: true,
        automaticLayout: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
    });
    editors.set('python-editor', pythonEditor);


    // Attach event listeners for copy buttons
    page.querySelectorAll('.copy-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            const targetSelector = btn.dataset.copyTarget;
            const editorId = btn.dataset.editorId;
            let textToCopy = '';

            if (targetSelector) {
                const sourceElement = page.querySelector(targetSelector) as HTMLElement;
                if (sourceElement) {
                    textToCopy = sourceElement.innerText;
                }
            } else if (editorId) {
                const editor = editors.get(editorId);
                if (editor) {
                    textToCopy = editor.getValue();
                }
            }

            if (!textToCopy) return;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalIcon = btn.querySelector('i')?.className || 'fa-regular fa-copy';
                const originalText = btn.querySelector('span')?.textContent || 'Copy';

                btn.classList.add('copied');
                if (btn.querySelector('i')) btn.querySelector('i')!.className = 'fa-solid fa-check';
                if (btn.querySelector('span')) btn.querySelector('span')!.textContent = 'Copied!';
                btn.disabled = true;

                setTimeout(() => {
                    btn.classList.remove('copied');
                    if (btn.querySelector('i')) btn.querySelector('i')!.className = originalIcon;
                    if (btn.querySelector('span')) btn.querySelector('span')!.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                showToast('Failed to copy text.', 'error');
            });
        });
    });
}
export function renderPrivacyPage() {
    const page = DOMElements.pagePrivacy;
    if (!page) return;
    page.innerHTML = `
        <div class="service-page-header"><h2>Privacy Policy</h2><p class="subtitle">Coming soon.</p></div>
    `;
}
export function renderTermsPage() {
    const page = DOMElements.pageTerms;
    if (!page) return;
    page.innerHTML = `
        <div class="service-page-header"><h2>Terms of Service</h2><p class="subtitle">Coming soon.</p></div>
    `;
}

export function initializeStaticPages() {
    // Inject Bloomberg-style ticker banner with all major carriers and e-commerce platforms
    const tickerBanner = document.getElementById('top-ticker-banner');
    if (tickerBanner) {
        // Shipping Carriers - Parcel
        const parcelCarriers = [
            { name: 'FedEx', domain: 'fedex.com', type: 'carrier' },
            { name: 'UPS', domain: 'ups.com', type: 'carrier' },
            { name: 'DHL', domain: 'dhl.com', type: 'carrier' },
            { name: 'USPS', domain: 'usps.com', type: 'carrier' },
            { name: 'Royal Mail', domain: 'royalmail.com', type: 'carrier' },
            { name: 'China Post', domain: 'chinapost.com.cn', type: 'carrier' },
            { name: 'EMS', domain: 'ems.com.cn', type: 'carrier' }
        ];

        // Shipping Carriers - Sea Freight
        const seaCarriers = [
            { name: 'Maersk', domain: 'maersk.com', type: 'carrier' },
            { name: 'PIL', domain: 'pil.com.sg', type: 'carrier' },
            { name: 'CMA CGM', domain: 'cma-cgm.com', type: 'carrier' },
            { name: 'Hapag-Lloyd', domain: 'hapag-lloyd.com', type: 'carrier' },
            { name: 'ONE', domain: 'one-line.com', type: 'carrier' },
            { name: 'Evergreen', domain: 'evergreen-line.com', type: 'carrier' }
        ];

        // Air Cargo Companies
        const airCargoCarriers = [
            { name: 'Cathay Pacific Cargo', domain: 'cathaycargo.com', type: 'carrier' },
            { name: 'Emirates SkyCargo', domain: 'skycargo.com', type: 'carrier' },
            { name: 'Qatar Airways Cargo', domain: 'qrcargo.com', type: 'carrier' },
            { name: 'Turkish Cargo', domain: 'turkishcargo.com', type: 'carrier' },
            { name: 'Air France KLM Martinair Cargo', domain: 'airfranceklm.com', type: 'carrier' },
            { name: 'Singapore Airlines Cargo', domain: 'sialcargo.com', type: 'carrier' },
            { name: 'Cargolux', domain: 'cargolux.com', type: 'carrier' },
            { name: 'Korean Air Cargo', domain: 'koreanaircargo.com', type: 'carrier' },
            { name: 'ANA Cargo', domain: 'ana.co.jp', type: 'carrier' },
            { name: 'Lufthansa Cargo', domain: 'lufthansa-cargo.com', type: 'carrier' },
            { name: 'Atlas Air', domain: 'atlasair.com', type: 'carrier' }
        ];

        // E-commerce Platforms
        const ecommercePlatforms = [
            { name: 'Amazon', domain: 'amazon.com', type: 'ecommerce' },
            { name: 'eBay', domain: 'ebay.com', type: 'ecommerce' },
            { name: 'Walmart', domain: 'walmart.com', type: 'ecommerce' },
            { name: 'Shopify', domain: 'shopify.com', type: 'ecommerce' },
            { name: 'Alibaba', domain: 'alibaba.com', type: 'ecommerce' },
            { name: 'Etsy', domain: 'etsy.com', type: 'ecommerce' },
            { name: 'Shopee', domain: 'shopee.com', type: 'ecommerce' },
            { name: 'Flipkart', domain: 'flipkart.com', type: 'ecommerce' },
            { name: 'Rakuten', domain: 'rakuten.com', type: 'ecommerce' },
            { name: 'Mercado Libre', domain: 'mercadolibre.com', type: 'ecommerce' }
        ];

        // Combine all brands - carriers first, then e-commerce
        const allBrands = [
            ...parcelCarriers,
            ...seaCarriers,
            ...airCargoCarriers,
            ...ecommercePlatforms
        ];

        const getTickerLogoUrl = (brand: { name: string; domain: string }) => {
            // Try multiple logo sources for better reliability
            return `https://logo.clearbit.com/${brand.domain}?size=40`;
        };

        // Create ticker items - duplicate for seamless infinite scroll
        let tickerHtml = '';
        const brandsForTicker = [...allBrands, ...allBrands]; // Duplicate for seamless loop

        // Add VcanShip logo at strategic intervals (every 10 items)
        let itemCount = 0;
        brandsForTicker.forEach((brand) => {
            // Insert VcanShip branding every 10 items for prominent visibility
            if (itemCount > 0 && itemCount % 10 === 0) {
                tickerHtml += `<div class="ticker-item ticker-item-vcanship" data-type="vcanship">
                    <svg class="ticker-logo ticker-vcanship-logo" viewBox="0 0 200 50" width="120" height="30">
                        <text x="10" y="40" style="fill: white; font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 40px;">Vcan</text>
                        <text x="105" y="40" style="fill: rgba(255, 255, 255, 0.9); font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 40px;">Ship</text>
                    </svg>
                    <span class="ticker-brand-name" style="font-weight: 600; color: rgba(255, 255, 255, 1);">Your Global Shipping Partner</span>
                </div>`;
            }

            // Show brand name prominently - logos may be blocked by ad blockers
            // Use brand name as primary display, logo is optional
            const brandIcon = brand.type === 'carrier' ? '🚢' : '🛒';
            tickerHtml += `<div class="ticker-item" data-type="${brand.type}"><span class="ticker-icon-fallback">${brandIcon}</span><img src="${getTickerLogoUrl(brand)}" alt="${brand.name}" class="ticker-logo" loading="lazy" onerror="this.style.display='none'; this.previousElementSibling.style.display='inline-block';" onload="this.style.display='block'; this.previousElementSibling.style.display='none';"><span class="ticker-brand-name">${brand.name}</span></div>`;
            itemCount++;
        });

        // Wrap in container for proper animation - single horizontal line
        tickerBanner.innerHTML = `<div class="ticker-wrapper"><div class="ticker-content">${tickerHtml}</div></div>`;
    }

    // CRITICAL FIX: Don't automatically render landing page - let routing handle it
    // This prevents content mixing when navigating to other pages
    // renderLandingPage(); // REMOVED - Let routing system handle page rendering
}
