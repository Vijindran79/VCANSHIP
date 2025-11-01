// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State } from './state';
import { DOMElements } from './dom';
// FIX: Import 'switchPage' from './ui' to resolve compilation errors where the function was used but not defined in the current scope.
import { switchPage } from './ui';
import { mountService } from './router';
import { renderLandingPage, renderHelpPage, renderApiHubPage, renderPrivacyPage, renderTermsPage } from './static_pages';
import { renderDashboard } from './dashboard';
import { renderAddressBook, renderAccountSettings } from './account';
import { initializeSidebar } from './sidebar';

interface Translations {
  [key: string]: string | Translations;
}

let translations: Translations = {};
let currentLanguage = 'en';
const rtlLanguages = ['ar']; // List of Right-to-Left languages

/**
 * A simple key-based translation function (shortened to 't' for convenience).
 * It supports nested keys like 'home.title' and can return strings, objects, or arrays.
 * @param key The key for the translation string (e.g., 'parcel.title').
 * @returns The translated string or the key itself if not found.
 */
export function t(key: string): any {
  const keys = key.split('.');
  let result: any = translations;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  return result;
}

/**
 * Scans the document for elements with `data-i18n` attributes and populates them
 * with the corresponding translated text.
 */
export function translatePageAttributes() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const translation = t(key);
            if (typeof translation !== 'string') {
                console.warn(`Translation for key '${key}' is not a string.`);
                return;
            }
            if (element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', translation);
            } else if (element.hasAttribute('aria-label')) {
                element.setAttribute('aria-label', translation);
            } else {
                element.textContent = translation;
            }
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const key = element.getAttribute('data-i18n-html');
        if (key) {
            const translation = t(key);
            if (typeof translation === 'string') {
                (element as HTMLElement).innerHTML = translation;
            }
        }
    });
}


/**
 * Fetches and loads the translation file for the given language.
 * @param lang The language code (e.g., 'en', 'es').
 */
async function loadTranslations(lang: string): Promise<void> {
  try {
    // FIX: Add mappings for languages without dedicated files to prevent errors.
    // 'zh-TW' (Traditional Chinese) falls back to 'zh' (Simplified Chinese).
    // 'th' (Thai) falls back to 'en' (English).
    let langFile = lang;
    if (lang === 'zh-TW') {
        langFile = 'zh';
    } else if (lang === 'th') {
        langFile = 'en';
    }

    const response = await fetch(`./locales/${langFile}.json`);
    if (!response.ok) {
      throw new Error(`Could not load translation file for ${lang}`);
    }
    translations = await response.json();
    currentLanguage = lang;
    document.documentElement.lang = lang;
    
    // Set text direction
    if (rtlLanguages.includes(lang)) {
        document.documentElement.dir = 'rtl';
    } else {
        document.documentElement.dir = 'ltr';
    }

  } catch (error) {
    console.error(error);
    // Fallback to English if the selected language fails to load
    if (lang !== 'en') {
        await loadTranslations('en');
    } else {
        // If even English fails, we must throw to be caught by the initializer.
        throw error;
    }
  }
}

/**
 * Updates static text elements in the main HTML that are not part of dynamic templates.
 */
export function updateStaticUIText() {
    translatePageAttributes();
}

/**
 * Initializes the i18n system.
 * It loads the initial language translations and sets up a listener for locale changes.
 */
export async function initializeI18n() {
  try {
      const savedLanguage = localStorage.getItem('vcanship_language') || 'en';
      await loadTranslations(savedLanguage);
  } catch (error) {
      console.error("Fatal: Could not load critical translation files. UI text may not appear correctly.", error);
      // The app will continue, but with untranslated keys.
  }

  updateStaticUIText();

  window.addEventListener('locale-change', async (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail.language && detail.language !== currentLanguage) {
      await loadTranslations(detail.language);
      
      // Re-render all static and dynamic parts of the UI
      updateStaticUIText();
      initializeSidebar(); 

      // Re-render the current page's content to apply new translations seamlessly
      const currentPage = State.currentPage;
      if (State.currentService) {
        mountService(State.currentService);
      } else {
        switch (currentPage) {
          case 'landing': renderLandingPage(); break;
          case 'help': renderHelpPage(); break;
          case 'api-hub': renderApiHubPage(); break;
          case 'privacy': renderPrivacyPage(); break;
          case 'terms': renderTermsPage(); break;
          case 'dashboard': renderDashboard(); break;
          case 'address-book': renderAddressBook(); break;
          case 'settings': renderAccountSettings(); break;
          default:
            console.warn(`Unhandled page re-render for translation on page: ${currentPage}`);
            break;
        }
      }
    }
  });
}
