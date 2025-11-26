// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State, type Address } from './state';
import { showToast } from './ui';
import { t } from './i18n';
import { getAddressesFromBackend, addAddressToBackend, updateAddressOnBackend, deleteAddressFromBackend } from './api';


// Local cache for the address book to prevent re-fetching on every render
let addressCache: Address[] = [];
let isCacheStale = true;


// --- ADDRESS BOOK ---

export async function renderAddressBook() {
    const page = DOMElements.pageAddressBook;
    if (!page) return;

    // Show a loading state
    page.innerHTML = `<div class="loading-spinner"></div>`;

    if (isCacheStale) {
        addressCache = await getAddressesFromBackend();
        isCacheStale = false;
    }

    const addressesHtml = addressCache.length > 0
        ? addressCache.map(addr => `
            <div class="address-card">
                <div class="address-card-header">
                    <h4>${addr.label} ${addr.isDefault ? `<span class="default-badge">${t('account.address_book.default_badge')}</span>` : ''}</h4>
                    <div class="address-card-actions">
                        <button class="secondary-btn edit-address-btn" data-id="${addr.id}">${t('account.address_book.edit')}</button>
                        <button class="secondary-btn delete-address-btn" data-id="${addr.id}">${t('account.address_book.delete')}</button>
                    </div>
                </div>
                <div class="address-card-body">
                    <p>${addr.name}</p>
                    <p>${addr.street}, ${addr.city}, ${addr.postcode}</p>
                    <p>${addr.country}</p>
                </div>
            </div>
        `).join('')
        : `
        <div class="address-empty-state-card">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="empty-state-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <h3>${t('account.address_book.empty_state_title')}</h3>
            <p>${t('account.address_book.empty_state_desc')}</p>
            <button id="add-address-from-empty-btn" class="main-submit-btn">${t('account.address_book.empty_state_cta')}</button>
        </div>
        `;

    page.innerHTML = `
        <div class="service-page-header">
            <h2 data-i18n="account.address_book.title">Address Book</h2>
            <p class="subtitle" data-i18n="account.address_book.subtitle">Manage your saved addresses for faster bookings.</p>
        </div>
        <div class="account-grid">
            <div class="address-list">
                ${addressesHtml}
            </div>
            <div class="form-container">
                <h3 id="address-form-title">${t('account.address_book.form_title_add')}</h3>
                <form id="address-form">
                    <input type="hidden" id="address-id">
                    <div class="input-wrapper"><label for="address-label">${t('account.address_book.label_label')}</label><input type="text" id="address-label" required></div>
                    <div class="input-wrapper"><label for="address-name">${t('account.address_book.name_label')}</label><input type="text" id="address-name" required></div>
                    <div class="input-wrapper"><label for="address-street">${t('account.address_book.street_label')}</label><input type="text" id="address-street" required></div>
                    <div class="input-wrapper"><label for="address-city">${t('account.address_book.city_label')}</label><input type="text" id="address-city" required></div>
                    <div class="input-wrapper"><label for="address-country">${t('account.address_book.country_label')}</label><input type="text" id="address-country" required></div>
                    <div class="form-actions">
                        <button type="button" id="cancel-edit-btn" class="secondary-btn hidden">${t('account.address_book.cancel')}</button>
                        <button type="submit" class="main-submit-btn">${t('account.address_book.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    attachAddressBookListeners();
}

async function handleAddressFormSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const id = (form.querySelector('#address-id') as HTMLInputElement).value;

    const addressData = {
        label: (form.querySelector('#address-label') as HTMLInputElement).value,
        name: (form.querySelector('#address-name') as HTMLInputElement).value,
        street: (form.querySelector('#address-street') as HTMLInputElement).value,
        city: (form.querySelector('#address-city') as HTMLInputElement).value,
        country: (form.querySelector('#address-country') as HTMLInputElement).value,
        company: '', // Placeholder
        postcode: '', // Placeholder
        isDefault: false, // Placeholder for now
    };

    let success = false;
    if (id) { // Editing existing
        const updatedAddress = await updateAddressOnBackend(id, addressData);
        if (updatedAddress) {
            showToast(t('toast.address_updated'), 'success');
            success = true;
        }
    } else { // Adding new
        const newAddress = await addAddressToBackend(addressData);
        if (newAddress) {
            showToast(t('toast.address_added'), 'success');
            success = true;
        }
    }

    if (success) {
        isCacheStale = true; // Invalidate cache
        await renderAddressBook(); // Re-render the whole page
    }
}

function handleEditAddress(id: string) {
    const address = addressCache.find(addr => addr.id === id);
    if (!address) return;

    const form = document.getElementById('address-form') as HTMLFormElement;
    (form.querySelector('#address-id') as HTMLInputElement).value = String(id);
    (form.querySelector('#address-label') as HTMLInputElement).value = address.label;
    (form.querySelector('#address-name') as HTMLInputElement).value = address.name;
    (form.querySelector('#address-street') as HTMLInputElement).value = address.street;
    (form.querySelector('#address-city') as HTMLInputElement).value = address.city;
    (form.querySelector('#address-country') as HTMLInputElement).value = address.country;

    (document.getElementById('address-form-title') as HTMLElement).textContent = t('account.address_book.form_title_edit');
    (document.getElementById('cancel-edit-btn') as HTMLElement).classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteAddress(id: string) {
    if (confirm(t('confirm.delete_address'))) {
        const success = await deleteAddressFromBackend(id);
        if (success) {
            showToast(t('toast.address_deleted'), 'success');
            isCacheStale = true; // Invalidate cache
            await renderAddressBook();
        }
    }
}

function cancelEdit() {
    (document.getElementById('address-form') as HTMLFormElement).reset();
    (document.getElementById('address-id') as HTMLInputElement).value = '';
    (document.getElementById('address-form-title') as HTMLElement).textContent = t('account.address_book.form_title_add');
    (document.getElementById('cancel-edit-btn') as HTMLElement).classList.add('hidden');
}


function attachAddressBookListeners() {
    // Note: Event listeners are attached to the page, so they persist across re-renders.
    // We only need to set them up once when the main view is rendered.
    // A more robust solution might use event delegation on the `page` element.
    const form = document.getElementById('address-form');
    if (form && !(form as any)._submitListenerAttached) {
        form.addEventListener('submit', handleAddressFormSubmit);
        (form as any)._submitListenerAttached = true;
    }

    const editButtons = document.querySelectorAll('.edit-address-btn');
    editButtons.forEach(btn => {
        const id = (btn as HTMLElement).dataset.id;
        if (id && !(btn as any)._clickListenerAttached) {
            btn.addEventListener('click', () => handleEditAddress(id));
            (btn as any)._clickListenerAttached = true;
        }
    });

    const deleteButtons = document.querySelectorAll('.delete-address-btn');
    deleteButtons.forEach(btn => {
        const id = (btn as HTMLElement).dataset.id;
        if (id && !(btn as any)._clickListenerAttached) {
            btn.addEventListener('click', () => handleDeleteAddress(id));
            (btn as any)._clickListenerAttached = true;
        }
    });

    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn && !(cancelBtn as any)._clickListenerAttached) {
        cancelBtn.addEventListener('click', cancelEdit);
        (cancelBtn as any)._clickListenerAttached = true;
    }

    const addFromEmptyBtn = document.getElementById('add-address-from-empty-btn');
    if (addFromEmptyBtn && !(addFromEmptyBtn as any)._clickListenerAttached) {
        addFromEmptyBtn.addEventListener('click', () => {
            const form = document.getElementById('address-form');
            const firstInput = document.getElementById('address-label');
            if (form) {
                form.scrollIntoView({ behavior: 'smooth' });
                firstInput?.focus();
            }
        });
        (addFromEmptyBtn as any)._clickListenerAttached = true;
    }
}


// --- ACCOUNT SETTINGS ---

export function renderAccountSettings() {
    const page = DOMElements.pageSettings;
    if (!page || !State.currentUser) return;

    page.innerHTML = `
         <div class="service-page-header">
            <h2 data-i18n="account.settings.title">Account Settings</h2>
            <p class="subtitle" data-i18n="account.settings.subtitle">Manage your profile and communication preferences.</p>
        </div>
        <div class="form-container">
            <form id="settings-form">
                <div class="form-section">
                    <h3 data-i18n="account.settings.profile_title">Profile Information</h3>
                    <div class="input-wrapper">
                        <label for="settings-name" data-i18n="account.settings.name_label">Full Name</label>
                        <input type="text" id="settings-name" value="${State.currentUser.name}" required>
                    </div>
                     <div class="input-wrapper">
                        <label for="settings-email" data-i18n="account.settings.email_label">Email Address</label>
                        <input type="email" id="settings-email" value="${State.currentUser.email}" required>
                    </div>
                </div>
                 <div class="form-section">
                    <h3 data-i18n="account.settings.password_title">Change Password</h3>
                    <div class="input-wrapper"><label for="current-password" data-i18n="account.settings.current_password_label">Current Password</label><input type="password" id="current-password"></div>
                    <div class="input-wrapper"><label for="new-password" data-i18n="account.settings.new_password_label">New Password</label><input type="password" id="new-password"></div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="main-submit-btn" data-i18n="account.settings.save">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast(t('toast.settings_saved'), 'success');
    });
}


// --- INITIALIZATION ---

export function initializeAccountPages() {
    const pageObservers = [
        { el: DOMElements.pageAddressBook, renderFn: renderAddressBook },
        { el: DOMElements.pageSettings, renderFn: renderAccountSettings }
    ];

    pageObservers.forEach(({ el, renderFn }) => {
        if (el) {
            const observer = new MutationObserver(async (mutations) => {
                if (mutations.some(m => m.attributeName === 'class' && (m.target as HTMLElement).classList.contains('active'))) {
                    if (State.isLoggedIn) {
                        await renderFn();
                    } else {
                        el.innerHTML = `<div class="form-container"><p>${t('errors.login_required')}</p></div>`;
                    }
                }
            });
            observer.observe(el, { attributes: true });
        }
    });
}