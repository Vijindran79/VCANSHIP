// validation.ts

// A map of country codes to their postcode validation rules.
const postcodeValidations: { [key: string]: { regex: RegExp; placeholder: string; errorMessage: string; } } = {
    GB: {
        regex: /^(GIR 0AA|[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})$/i,
        placeholder: "e.g., SW1A 1AA",
        errorMessage: "Please enter a valid UK postcode format (e.g., SW1A 1AA)."
    },
    US: {
        regex: /^\d{5}(-\d{4})?$/,
        placeholder: "e.g., 90210 or 90210-1234",
        errorMessage: "Please enter a valid 5 or 9-digit ZIP code."
    },
    CA: {
        regex: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
        placeholder: "e.g., A1A 1A1",
        errorMessage: "Please enter a valid Canadian postal code format (e.g., A1A 1A1)."
    },
    AU: {
        regex: /^\d{4}$/,
        placeholder: "e.g., 2000",
        errorMessage: "Please enter a valid 4-digit Australian postcode."
    },
    DE: {
        regex: /^\d{5}$/,
        placeholder: "e.g., 10117",
        errorMessage: "Please enter a valid 5-digit German postal code."
    },
    FR: {
        regex: /^\d{5}$/,
        placeholder: "e.g., 75001",
        errorMessage: "Please enter a valid 5-digit French postal code."
    },
    IN: {
        regex: /^\d{6}$/,
        placeholder: "e.g., 110001",
        errorMessage: "Please enter a valid 6-digit Indian PIN code."
    },
};

const defaultValidation = {
    regex: /^.{2,15}$/,
    placeholder: "Enter postcode",
    errorMessage: "Please enter a valid postcode (2-15 characters)."
};

// Common names and abbreviations mapped to ISO 2-letter codes.
const countryNameToCodeMap: { [key: string]: string } = {
    'united kingdom': 'GB', 'uk': 'GB', 'britain': 'GB',
    'united states': 'US', 'usa': 'US', 'america': 'US', 'united states of america': 'US',
    'canada': 'CA',
    'australia': 'AU',
    'germany': 'DE', 'deutschland': 'DE',
    'france': 'FR',
    'india': 'IN',
    'china': 'CN',
    'japan': 'JP',
    'brazil': 'BR',
    'netherlands': 'NL'
};

/**
 * Normalizes a country name or code to a 2-letter ISO code.
 * @param countryInput The user's input for the country.
 * @returns A 2-letter ISO code or the original input if not found.
 */
function normalizeCountryToCode(countryInput: string): string {
    const lowerInput = countryInput.toLowerCase().trim();
    if (lowerInput.length === 2) {
        return lowerInput.toUpperCase();
    }
    return countryNameToCodeMap[lowerInput] || lowerInput.toUpperCase();
}

/**
 * Gets the validation rules for a given country.
 * @param country The country name or 2-letter code.
 * @returns An object with regex, placeholder, and error message.
 */
export function getPostcodeValidation(country: string) {
    const countryCode = normalizeCountryToCode(country);
    return postcodeValidations[countryCode] || defaultValidation;
}


/**
 * Attaches dynamic postcode validation to a form group.
 * @param countryInputEl The input element for the country.
 * @param postcodeEl The input element for the postcode.
 */
export function attachDynamicPostcodeValidation(countryInputEl: HTMLInputElement, postcodeEl: HTMLInputElement) {
    const updateValidation = () => {
        const validation = getPostcodeValidation(countryInputEl.value);
        postcodeEl.placeholder = validation.placeholder;
        postcodeEl.pattern = validation.regex.source;
        postcodeEl.dataset.errorMessage = validation.errorMessage;
        
        // Clear any existing validation error message if the country changes
        const wrapper = postcodeEl.closest('.input-wrapper');
        if (wrapper && wrapper.classList.contains('input-error')) {
            wrapper.classList.remove('input-error');
            const errorEl = wrapper.querySelector('.error-text');
            if(errorEl) {
                errorEl.classList.add('hidden');
                errorEl.textContent = '';
            }
        }
    };

    countryInputEl.addEventListener('change', updateValidation);
    countryInputEl.addEventListener('blur', updateValidation);
    
    // Initial call in case the field is pre-populated
    if (countryInputEl.value) {
        updateValidation();
    }
}
