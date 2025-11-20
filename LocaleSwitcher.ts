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
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
};

// --- CORE LOGIC & EVENT DISPATCHING ---

function dispatchLocaleChangeEvent() {
  if (!selectedCountry || !selectedLanguage) return;
  
  // Update global state
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

    if(modalSelectedCountry) {
        const selectedItem = elements.countryList.querySelector(`[data-country-code="${modalSelectedCountry.countryCode}"]`);
        selectedItem?.classList.add('selected');
    }
}

function renderPreviewPanel() {
    if (!elements.previewPanel) return;
    if (!modalSelectedCountry) {
        elements.previewPanel.innerHTML = `<p class="helper-text">Select a country from the list to see options.</p>`;
        return;
    }
    
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
                 <label style="font-weight: 600; margin-bottom: 0.5rem; display: block;">Currency</label>
                 <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--background-color); border-radius: 8px; border: 1px solid var(--border-color);">
                     <span style="font-size: 1.5rem; font-weight: bold;">${modalSelectedCountry.currency.symbol}</span>
                     <span style="font-weight: 600; font-size: 1.1rem;">${modalSelectedCountry.currency.code}</span>
                 </div>
            </div>
        </div>
    `;

    const langSelect = document.getElementById('modal-language-select') as HTMLSelectElement;
    langSelect.value = modalSelectedLanguage || 'en';
    langSelect.addEventListener('change', () => {
        modalSelectedLanguage = langSelect.value;
        if (elements.confirmBtn) elements.confirmBtn.disabled = false;
    });
}

// --- MODAL MANAGEMENT ---

function openLocaleModal() {
    if (!elements.modal) return;
    modalSelectedCountry = selectedCountry;
    modalSelectedLanguage = selectedLanguage;

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
            renderCountryList();
            renderPreviewPanel();
            if (elements.confirmBtn) elements.confirmBtn.disabled = false;
        }
    }
}

function handleConfirmSelection() {
    if (!modalSelectedCountry || !modalSelectedLanguage) return;
    
    selectedCountry = modalSelectedCountry;
    selectedLanguage = modalSelectedLanguage;
    
    localStorage.setItem('vcanship_country', selectedCountry.countryCode);
    localStorage.setItem('vcanship_language', selectedLanguage);

    updateHeaderControls();
    dispatchLocaleChangeEvent();
    closeLocaleModal();
}

function attachEventListeners() {
    // Listener for the desktop header button
    elements.headerBtn?.addEventListener('click', openLocaleModal);

    // Listener for the mobile menu button
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#settings-language-btn')) {
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
    try {
        const [localesResponse, languagesResponse] = await Promise.all([
            fetch('./locales.json'),
            fetch('./languages.json')
        ]);
        if (!localesResponse.ok) throw new Error(`HTTP error! status: ${localesResponse.status}`);
        if (!languagesResponse.ok) throw new Error(`HTTP error! status: ${languagesResponse.status}`);
        
        locales = await localesResponse.json();
        languages = await languagesResponse.json();
        filteredLocales = [...locales];

        attachEventListeners();

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
        const initialCountry = locales.find(l => l.countryCode === initialCountryCode) || locales[0];

        selectedCountry = initialCountry;
        selectedLanguage = (savedLanguage && languages.some(l => l.code === savedLanguage))
            ? savedLanguage
            : 'en';
        
        localStorage.setItem('vcanship_country', selectedCountry.countryCode);
        localStorage.setItem('vcanship_language', selectedLanguage);

        updateHeaderControls();
        dispatchLocaleChangeEvent();

    } catch (error) {
        console.error('Failed to initialize Locale Switcher:', error);
    }
}