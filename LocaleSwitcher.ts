// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
// --- INTERFACES & TYPES ---
import { showToast } from './ui';
import { setState } from './state';
import { t } from './i18n';

interface Locale {
    countryCode: string;
    countryName: string;
    currency: {
        code: string;
        symbol: string;
    };
}

interface Language {
    code: string;
    name: string;
}

// --- MODULE STATE ---
let locales: Locale[] = [];
let languages: Language[] = [];
let filteredLocales: Locale[] = [];

// Main state for the app
let selectedCountry: Locale | null = null;
let selectedLanguage: string | null = null;

// Temporary state for selections within the modal
let modalSelectedCountry: Locale | null = null;
let modalSelectedLanguage: string | null = null;
let modalSelectedCurrency: { code: string; symbol: string } | null = null;

let isModalOpen = false;

// --- DOM ELEMENT REFERENCES ---
const elements = {
    get modal() { return document.getElementById('locale-modal'); },
    get closeBtn() { return document.getElementById('close-locale-modal-btn') as HTMLButtonElement; },
    get cancelBtn() { return document.getElementById('cancel-locale-modal-btn') as HTMLButtonElement; },
    get confirmBtn() { return document.getElementById('confirm-locale-btn') as HTMLButtonElement; },
    get searchInput() { return document.getElementById('locale-search-input') as HTMLInputElement; },
    get countryList() { return document.getElementById('locale-modal-list') as HTMLUListElement; },
    get previewPanel() { return document.getElementById('locale-selection-preview'); },
    // Mobile button in menu
    get regionBtn() { return document.getElementById('settings-language-btn'); },
    // Desktop button in header
    get headerBtn() { return document.getElementById('header-locale-btn'); },
    get headerFlag() { return document.getElementById('header-locale-flag'); },
    get headerCountry() { return document.getElementById('header-locale-country'); },
    get headerInfo() { return document.getElementById('header-locale-info'); }
};

// --- UTILITIES ---

// FIX: Export 'countryCodeToFlag' to allow other modules to use it.
export function countryCodeToFlag(isoCode: string): string {
    if (!isoCode || isoCode.length !== 2 || !/^[A-Z]{2}$/.test(isoCode.toUpperCase())) {
        return '🏳️';
    }
    const base = 127397;
    return String.fromCodePoint(
        ...isoCode.toUpperCase().split('').map(char => base + char.charCodeAt(0))
    );
}

const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: number | undefined;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
};

// --- CORE LOGIC & EVENT DISPATCHING ---

function dispatchLocaleChangeEvent() {
    if (!selectedCountry || !selectedLanguage) return;

    // Update global state with the selected currency (which may differ from country's default)
    setState({ currentCurrency: selectedCountry.currency });

    const event = new CustomEvent('locale-change', {
        detail: {
            country: selectedCountry.countryCode,
            language: selectedLanguage,
            currency: selectedCountry.currency,
        },
    });
    window.dispatchEvent(event);
}

export function setLocaleByCountryName(countryName: string) {
    if (!locales.length) return;
    let searchTerm = countryName.toLowerCase().trim();
    const abbreviations: { [key: string]: string } = { 'uk': 'united kingdom', 'usa': 'united states', 'uae': 'united arab emirates', 'us': 'united states', 'gb': 'united kingdom' };
    if (abbreviations[searchTerm]) searchTerm = abbreviations[searchTerm];

    const country = locales.find(l => l.countryName.toLowerCase() === searchTerm || l.countryCode.toLowerCase() === searchTerm);

    if (country && country.countryCode !== selectedCountry?.countryCode) {
        selectedCountry = country;
        if (!selectedLanguage) {
            selectedLanguage = 'en';
            localStorage.setItem('vcanship_language', selectedLanguage);
        }
        localStorage.setItem('vcanship_country', selectedCountry.countryCode);
        updateHeaderControls();
        dispatchLocaleChangeEvent();
        showToast(`Currency auto-switched to ${country.currency.code}.`, 'info', 2000);
    }
}

// --- UI RENDERING & UPDATES ---

function updateHeaderControls() {
    if (!selectedCountry) return;

    if (elements.headerFlag) {
        elements.headerFlag.textContent = countryCodeToFlag(selectedCountry.countryCode);
    }
    if (elements.headerCountry) {
        elements.headerCountry.textContent = selectedCountry.countryName;
    }
    if (elements.headerInfo) {
        elements.headerInfo.textContent = `${selectedCountry.currency.code} (${selectedCountry.currency.symbol})`;
    }
}

function renderCountryList() {
    if (!elements.countryList) return;
    if (filteredLocales.length === 0) {
        elements.countryList.innerHTML = `<li class="helper-text" style="padding: 1rem; text-align: center;">No countries found.</li>`;
        return;
    }
    elements.countryList.innerHTML = filteredLocales.map(country => `
        <li class="locale-modal-list-item" role="option" id="country-${country.countryCode}" data-country-code="${country.countryCode}">
            <span class="locale-flag">${countryCodeToFlag(country.countryCode)}</span>
            <span class="locale-country-name">${country.countryName}</span>
            <span class="locale-currency-code">${country.currency.symbol} ${country.currency.code}</span>
        </li>
    `).join('');

    if (modalSelectedCountry) {
        const selectedItem = elements.countryList.querySelector(`[data-country-code="${modalSelectedCountry.countryCode}"]`);
        selectedItem?.classList.add('selected');
    }
}

// Get all unique currencies from locales
function getAllCurrencies(): { code: string; symbol: string }[] {
    const currencyMap = new Map<string, { code: string; symbol: string }>();
    locales.forEach(locale => {
        if (!currencyMap.has(locale.currency.code)) {
            currencyMap.set(locale.currency.code, locale.currency);
        }
    });
    return Array.from(currencyMap.values()).sort((a, b) => a.code.localeCompare(b.code));
}

function renderPreviewPanel() {
    if (!elements.previewPanel) return;
    if (!modalSelectedCountry) {
        elements.previewPanel.innerHTML = `<p class="helper-text">Select a country from the list to see options.</p>`;
        return;
    }

    // Initialize currency to country's default if not set
    if (!modalSelectedCurrency) {
        modalSelectedCurrency = modalSelectedCountry.currency;
    }

    const allCurrencies = getAllCurrencies();

    elements.previewPanel.innerHTML = `
        <div class="locale-preview-flag">${countryCodeToFlag(modalSelectedCountry.countryCode)}</div>
        <h4 class="locale-preview-name">${modalSelectedCountry.countryName}</h4>
        <div class="locale-preview-details" style="width: 100%;">
            <div class="input-wrapper" style="margin-bottom: 1rem;">
                <label for="modal-language-select">Language</label>
                <select id="modal-language-select">
                    ${languages.map(lang => `<option value="${lang.code}">${lang.name}</option>`).join('')}
                </select>
            </div>
            <div class="input-wrapper">
                 <label for="modal-currency-select" style="font-weight: 600; margin-bottom: 0.5rem; display: block;">Currency</label>
                 <select id="modal-currency-select" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--background-color); font-size: 1rem;">
                    ${allCurrencies.map(currency =>
        `<option value="${currency.code}" data-symbol="${currency.symbol}" ${currency.code === modalSelectedCurrency?.code ? 'selected' : ''}>
                            ${currency.symbol} ${currency.code}
                         </option>`
    ).join('')}
                 </select>
                 <p style="font-size: 0.85rem; color: var(--medium-gray); margin-top: 0.5rem;">
                    Default: ${modalSelectedCountry.currency.symbol} ${modalSelectedCountry.currency.code}
                 </p>
            </div>
        </div>
    `;

    const langSelect = document.getElementById('modal-language-select') as HTMLSelectElement;
    langSelect.value = modalSelectedLanguage || 'en';
    langSelect.addEventListener('change', () => {
        modalSelectedLanguage = langSelect.value;
        if (elements.confirmBtn) elements.confirmBtn.disabled = false;
    });

    const currencySelect = document.getElementById('modal-currency-select') as HTMLSelectElement;
    if (currencySelect) {
        currencySelect.value = modalSelectedCurrency?.code || modalSelectedCountry.currency.code;
        currencySelect.addEventListener('change', () => {
            const selectedOption = currencySelect.options[currencySelect.selectedIndex];
            const symbol = selectedOption.getAttribute('data-symbol') || '';
            const code = currencySelect.value;
            modalSelectedCurrency = { code, symbol };
            if (elements.confirmBtn) elements.confirmBtn.disabled = false;
        });
    }
}

// --- MODAL MANAGEMENT ---

function openLocaleModal() {
    if (!elements.modal) return;
    modalSelectedCountry = selectedCountry;
    modalSelectedLanguage = selectedLanguage;
    modalSelectedCurrency = selectedCountry ? selectedCountry.currency : null;

    elements.modal.classList.add('active');
    isModalOpen = true;

    // Translate modal UI
    const titleEl = document.getElementById('locale-modal-title');
    const descEl = elements.modal.querySelector('.modal-desc');
    if (titleEl) titleEl.textContent = t('modals.locale.title');
    if (descEl) descEl.textContent = t('modals.locale.description');
    if (elements.cancelBtn) elements.cancelBtn.textContent = t('modals.locale.cancel');
    if (elements.confirmBtn) elements.confirmBtn.textContent = t('modals.locale.confirm');
    if (elements.searchInput) elements.searchInput.placeholder = t('modals.locale.search_placeholder');

    renderCountryList();
    renderPreviewPanel();

    if (elements.confirmBtn) elements.confirmBtn.disabled = true;
    elements.searchInput?.focus();
}

function closeLocaleModal() {
    if (!elements.modal) return;
    elements.modal.classList.remove('active');
    isModalOpen = false;
}

// --- EVENT HANDLERS ---

const handleSearch = debounce(() => {
    if (!elements.searchInput) return;
    const term = elements.searchInput.value.toLowerCase();
    filteredLocales = locales.filter(l =>
        l.countryName.toLowerCase().includes(term) ||
        l.countryCode.toLowerCase().includes(term)
    );
    renderCountryList();
}, 200);

function handleCountryPreview(e: Event) {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>('.locale-modal-list-item');
    if (item?.dataset.countryCode) {
        const country = locales.find(l => l.countryCode === item.dataset.countryCode);
        if (country) {
            modalSelectedCountry = country;
            // Set currency to country's default when country changes, but keep user's selection if they already changed it
            if (!modalSelectedCurrency || modalSelectedCurrency.code === selectedCountry?.currency.code) {
                modalSelectedCurrency = country.currency;
            }
            renderCountryList();
            renderPreviewPanel();
            if (elements.confirmBtn) elements.confirmBtn.disabled = false;
        }
    }
}

function handleConfirmSelection() {
    if (!modalSelectedCountry || !modalSelectedLanguage || !modalSelectedCurrency) return;

    selectedCountry = modalSelectedCountry;
    selectedLanguage = modalSelectedLanguage;

    // Override country's currency with user's selection
    selectedCountry.currency = modalSelectedCurrency;

    localStorage.setItem('vcanship_country', selectedCountry.countryCode);
    localStorage.setItem('vcanship_language', selectedLanguage);
    localStorage.setItem('vcanship_currency', JSON.stringify(modalSelectedCurrency));

    updateHeaderControls();
    dispatchLocaleChangeEvent();
    closeLocaleModal();
}

function attachEventListeners() {
    // Listener for the desktop header button
    if (elements.headerBtn) {
        elements.headerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openLocaleModal();
        });
    }

    // Listener for the mobile menu button - use direct event delegation
    const mobileLanguageBtn = document.getElementById('settings-language-btn');
    if (mobileLanguageBtn) {
        mobileLanguageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openLocaleModal();
        });
    }

    // Also use body delegation as backup
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#settings-language-btn') || target.closest('#header-locale-btn')) {
            e.preventDefault();
            e.stopPropagation();
            openLocaleModal();
        }
    });

    elements.searchInput?.addEventListener('input', handleSearch);
    elements.countryList?.addEventListener('click', handleCountryPreview);
    elements.confirmBtn?.addEventListener('click', handleConfirmSelection);
    elements.closeBtn?.addEventListener('click', closeLocaleModal);
    elements.cancelBtn?.addEventListener('click', closeLocaleModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            closeLocaleModal();
        }
    });

}

// --- INITIALIZATION ---

export async function initializeLocaleSwitcher() {
    // Always attach event listeners first, even if JSON loading fails
    attachEventListeners();

    try {
        // Try multiple paths in case of routing issues
        const tryFetch = async (url: string): Promise<Response> => {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const contentType = response.headers.get('content-type') || '';
                    if (contentType.includes('application/json')) {
                        return response;
                    }
                }
            } catch (e) {
                // Continue to next attempt
            }
            // Try alternative paths
            const altPaths = [
                url.startsWith('./') ? url.substring(2) : `./${url}`,
                url.startsWith('/') ? url : `/${url}`
            ];
            for (const altPath of altPaths) {
                try {
                    const response = await fetch(altPath);
                    if (response.ok) {
                        const contentType = response.headers.get('content-type') || '';
                        if (contentType.includes('application/json')) {
                            return response;
                        }
                    }
                } catch (e) {
                    continue;
                }
            }
            throw new Error(`Could not fetch ${url} as JSON`);
        };

        const [localesResponse, languagesResponse] = await Promise.all([
            tryFetch('./locales.json'),
            tryFetch('./languages.json')
        ]);

        const localesText = await localesResponse.text();
        const languagesText = await languagesResponse.text();

        // Parse JSON with error handling
        try {
            locales = JSON.parse(localesText);
        } catch (e) {
            console.error('Failed to parse locales.json:', e);
            throw new Error('Invalid JSON in locales.json');
        }

        try {
            languages = JSON.parse(languagesText);
        } catch (e) {
            console.error('Failed to parse languages.json:', e);
            throw new Error('Invalid JSON in languages.json');
        }
        filteredLocales = [...locales];

        let initialCountryCode = localStorage.getItem('vcanship_country');
        if (!initialCountryCode) {
            try {
                const geoResponse = await fetch('https://ipapi.co/json/');
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (locales.some(l => l.countryCode === geoData.country_code)) {
                        initialCountryCode = geoData.country_code;
                        showToast(`Welcome! Your region has been set to ${geoData.country_name}.`, 'info');
                    }
                }
            } catch (geoError) {
                console.warn('Could not detect user country.', geoError);
            }
        }

        if (!initialCountryCode) initialCountryCode = 'GB';

        const savedLanguage = localStorage.getItem('vcanship_language');
        const savedCurrency = localStorage.getItem('vcanship_currency');
        const initialCountry = locales.find(l => l.countryCode === initialCountryCode) || locales[0];

        selectedCountry = initialCountry;
        selectedLanguage = (savedLanguage && languages.some(l => l.code === savedLanguage))
            ? savedLanguage
            : 'en';

        // Restore saved currency or use country's default
        if (savedCurrency) {
            try {
                const currency = JSON.parse(savedCurrency);
                selectedCountry.currency = currency;
            } catch (e) {
                console.warn('Failed to parse saved currency', e);
            }
        }

        localStorage.setItem('vcanship_country', selectedCountry.countryCode);
        localStorage.setItem('vcanship_language', selectedLanguage);
        localStorage.setItem('vcanship_currency', JSON.stringify(selectedCountry.currency));

        updateHeaderControls();
        dispatchLocaleChangeEvent();

    } catch (error) {
        console.error('Failed to load locale data, but buttons will still work:', error);
        // Use fallback data so the modal can still open
        if (locales.length === 0) {
            locales = [
                { countryCode: 'GB', countryName: 'United Kingdom', currency: { code: 'GBP', symbol: '£' } },
                { countryCode: 'US', countryName: 'United States', currency: { code: 'USD', symbol: '$' } },
                { countryCode: 'CA', countryName: 'Canada', currency: { code: 'CAD', symbol: 'C$' } },
                { countryCode: 'AU', countryName: 'Australia', currency: { code: 'AUD', symbol: 'A$' } },
                { countryCode: 'DE', countryName: 'Germany', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'FR', countryName: 'France', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'IT', countryName: 'Italy', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'ES', countryName: 'Spain', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'NL', countryName: 'Netherlands', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'BE', countryName: 'Belgium', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'CH', countryName: 'Switzerland', currency: { code: 'CHF', symbol: 'CHF' } },
                { countryCode: 'AT', countryName: 'Austria', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'SE', countryName: 'Sweden', currency: { code: 'SEK', symbol: 'kr' } },
                { countryCode: 'NO', countryName: 'Norway', currency: { code: 'NOK', symbol: 'kr' } },
                { countryCode: 'DK', countryName: 'Denmark', currency: { code: 'DKK', symbol: 'kr' } },
                { countryCode: 'FI', countryName: 'Finland', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'PL', countryName: 'Poland', currency: { code: 'PLN', symbol: 'zł' } },
                { countryCode: 'CZ', countryName: 'Czech Republic', currency: { code: 'CZK', symbol: 'Kč' } },
                { countryCode: 'IE', countryName: 'Ireland', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'PT', countryName: 'Portugal', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'GR', countryName: 'Greece', currency: { code: 'EUR', symbol: '€' } },
                { countryCode: 'JP', countryName: 'Japan', currency: { code: 'JPY', symbol: '¥' } },
                { countryCode: 'CN', countryName: 'China', currency: { code: 'CNY', symbol: '¥' } },
                { countryCode: 'IN', countryName: 'India', currency: { code: 'INR', symbol: '₹' } },
                { countryCode: 'SG', countryName: 'Singapore', currency: { code: 'SGD', symbol: 'S$' } },
                { countryCode: 'MY', countryName: 'Malaysia', currency: { code: 'MYR', symbol: 'RM' } },
                { countryCode: 'TH', countryName: 'Thailand', currency: { code: 'THB', symbol: '฿' } },
                { countryCode: 'ID', countryName: 'Indonesia', currency: { code: 'IDR', symbol: 'Rp' } },
                { countryCode: 'PH', countryName: 'Philippines', currency: { code: 'PHP', symbol: '₱' } },
                { countryCode: 'VN', countryName: 'Vietnam', currency: { code: 'VND', symbol: '₫' } },
                { countryCode: 'KR', countryName: 'South Korea', currency: { code: 'KRW', symbol: '₩' } },
                { countryCode: 'TW', countryName: 'Taiwan', currency: { code: 'TWD', symbol: 'NT$' } },
                { countryCode: 'HK', countryName: 'Hong Kong', currency: { code: 'HKD', symbol: 'HK$' } },
                { countryCode: 'AE', countryName: 'United Arab Emirates', currency: { code: 'AED', symbol: 'د.إ' } },
                { countryCode: 'SA', countryName: 'Saudi Arabia', currency: { code: 'SAR', symbol: '﷼' } },
                { countryCode: 'IL', countryName: 'Israel', currency: { code: 'ILS', symbol: '₪' } },
                { countryCode: 'TR', countryName: 'Turkey', currency: { code: 'TRY', symbol: '₺' } },
                { countryCode: 'ZA', countryName: 'South Africa', currency: { code: 'ZAR', symbol: 'R' } },
                { countryCode: 'EG', countryName: 'Egypt', currency: { code: 'EGP', symbol: 'E£' } },
                { countryCode: 'NG', countryName: 'Nigeria', currency: { code: 'NGN', symbol: '₦' } },
                { countryCode: 'KE', countryName: 'Kenya', currency: { code: 'KES', symbol: 'KSh' } },
                { countryCode: 'BR', countryName: 'Brazil', currency: { code: 'BRL', symbol: 'R$' } },
                { countryCode: 'MX', countryName: 'Mexico', currency: { code: 'MXN', symbol: '$' } },
                { countryCode: 'AR', countryName: 'Argentina', currency: { code: 'ARS', symbol: '$' } },
                { countryCode: 'CL', countryName: 'Chile', currency: { code: 'CLP', symbol: '$' } },
                { countryCode: 'CO', countryName: 'Colombia', currency: { code: 'COP', symbol: '$' } },
                { countryCode: 'PE', countryName: 'Peru', currency: { code: 'PEN', symbol: 'S/.' } },
                { countryCode: 'NZ', countryName: 'New Zealand', currency: { code: 'NZD', symbol: 'NZ$' } }
            ];
            filteredLocales = [...locales];
        }
        if (languages.length === 0) {
            languages = [
                { code: 'en', name: 'English' },
                { code: 'es', name: 'Spanish' },
                { code: 'fr', name: 'French' },
                { code: 'de', name: 'German' },
                { code: 'it', name: 'Italian' },
                { code: 'pt', name: 'Portuguese' },
                { code: 'nl', name: 'Dutch' },
                { code: 'pl', name: 'Polish' },
                { code: 'ru', name: 'Russian' },
                { code: 'zh', name: 'Chinese' },
                { code: 'ja', name: 'Japanese' },
                { code: 'ko', name: 'Korean' },
                { code: 'ar', name: 'Arabic' },
                { code: 'hi', name: 'Hindi' },
                { code: 'th', name: 'Thai' }
            ];
        }

        // Initialize with defaults if needed
        if (!selectedCountry && locales.length > 0) {
            selectedCountry = locales[0];
            selectedLanguage = 'en';
            updateHeaderControls();
        }
    }
}