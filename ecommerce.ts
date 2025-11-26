// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State, setState, type EcomProduct } from './state';
import { switchPage, showToast } from "./ui";

const ECOM_STORAGE_KEY = 'vcanship_ecom_products';
const MOCK_PLATFORMS = ['Amazon', 'eBay', 'Shopify', 'Walmart', 'Etsy', 'Instagram', 'Facebook Marketplace', 'Google Shopping', 'TikTok Shop', 'Alibaba'];

let productImageBase64: string | null = null;
let specCounter = 0;

// --- DATA PERSISTENCE ---
function loadProductsFromStorage() {
    const storedProducts = localStorage.getItem(ECOM_STORAGE_KEY);
    if (storedProducts) {
        setState({ ecomProducts: JSON.parse(storedProducts) });
    } else {
        // If nothing is stored, initialize with an empty array.
        setState({ ecomProducts: [] });
    }
}

function saveProductsToStorage() {
    localStorage.setItem(ECOM_STORAGE_KEY, JSON.stringify(State.ecomProducts));
}

// --- VIEW ROUTING & RENDERING ---
function switchEcomView(view: 'dashboard' | 'form' | 'detail', productId: number | null = null) {
    setState({ ecomCurrentView: view, ecomViewingProductId: productId });
    renderCurrentEcomView();
}

function renderCurrentEcomView() {
    switch (State.ecomCurrentView) {
        case 'dashboard':
            renderDashboardView();
            break;
        case 'form':
            renderFormView();
            break;
        case 'detail':
            if (State.ecomViewingProductId !== null) {
                renderDetailView(State.ecomViewingProductId);
            }
            break;
    }
}

// --- CORE VIEWS ---
function renderDashboardView() {
    const container = document.getElementById('ecom-content-container');
    if (!container) return;
    
    container.innerHTML = `
        <div id="ecom-dashboard-view">
            <div class="ecom-view-header">
                <h2>Admin Dashboard</h2>
                <button id="ecom-add-new-product-btn" class="main-submit-btn">
                    <i class="fa-solid fa-plus"></i> Add New Product
                </button>
            </div>
            <div id="ecom-product-list-container"></div>
        </div>
    `;
    renderProductGrid();
}

function renderFormView(productToEdit?: EcomProduct) {
    const container = document.getElementById('ecom-content-container');
    if (!container) return;

    setState({ ecomEditingProductId: productToEdit?.id ?? null });

    container.innerHTML = `
        <div id="ecom-form-view">
            <button class="back-btn" id="ecom-back-to-dashboard-btn"><i class="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
            <div class="ecom-wizard-layout">
                <div class="ecom-wizard-form-panel card">
                     <h3 id="ecom-form-title">${productToEdit ? 'Edit Product' : 'Add New Product'}</h3>
                     <form id="ecom-product-form" novalidate>
                        <div class="form-section">
                            <h4>Core Details</h4>
                            <div class="input-wrapper"><label for="ecom-product-name">Product Name</label><input type="text" id="ecom-product-name" required></div>
                            <div class="input-wrapper"><label for="ecom-product-description">Description</label><textarea id="ecom-product-description" rows="4"></textarea></div>
                        </div>
                        <div class="form-section">
                           <h4>Image</h4>
                           <div id="ecom-image-drop-zone" class="image-drop-zone"><div id="ecom-image-drop-zone-idle"><i class="fa-solid fa-cloud-arrow-up"></i><p><strong>Click to upload</strong> or drag and drop</p></div><img id="ecom-image-preview" class="hidden"></div>
                           <input type="file" id="ecom-image-input" accept="image/png, image/jpeg, image/webp" class="hidden">
                           <button type="button" id="ecom-remove-image-btn" class="link-btn hidden" style="margin-top: 0.5rem;">Remove Image</button>
                       </div>
                       <div class="form-section">
                            <h4>Pricing & Stock</h4>
                             <div class="two-column" style="gap: 1.5rem;">
                                <div class="input-wrapper"><label for="ecom-product-price">Price (${State.currentCurrency.code})</label><input type="number" id="ecom-product-price" min="0" step="0.01" required></div>
                                <div class="input-wrapper"><label for="ecom-product-stock">Stock Quantity</label><input type="number" id="ecom-product-stock" min="0" required></div>
                            </div>
                        </div>
                        <div class="form-actions" style="margin-top: 2rem;">
                            <button type="submit" class="main-submit-btn">Save Product</button>
                        </div>
                    </form>
                </div>
                <div class="ecom-wizard-preview-panel">
                    <h3>Live Preview</h3>
                    <div id="ecom-live-preview-container"></div>
                </div>
            </div>
        </div>
    `;

    specCounter = 0;
    productImageBase64 = null;

    if (productToEdit) {
        (document.getElementById('ecom-product-name') as HTMLInputElement).value = productToEdit.name;
        (document.getElementById('ecom-product-description') as HTMLTextAreaElement).value = productToEdit.description;
        (document.getElementById('ecom-product-price') as HTMLInputElement).value = String(productToEdit.price);
        (document.getElementById('ecom-product-stock') as HTMLInputElement).value = String(productToEdit.stock);
        if (productToEdit.imageUrl) {
            productImageBase64 = productToEdit.imageUrl;
            updateImageView(productImageBase64);
        }
    }
    
    updateWizardPreview();
    attachFormListeners();
}

function renderDetailView(productId: number) {
    const container = document.getElementById('ecom-content-container');
    const product = State.ecomProducts.find(p => p.id === productId);
    if (!container || !product) {
        showToast('Product not found.', 'error');
        switchEcomView('dashboard');
        return;
    }

    const imageContent = product.imageUrl 
        ? `<img src="${product.imageUrl}" alt="${product.name}" class="ecom-product-detail-image">`
        : `<div class="ecom-product-detail-image-placeholder"><i class="fa-solid fa-image"></i></div>`;

    container.innerHTML = `
        <div id="ecom-detail-view">
             <button class="back-btn" id="ecom-back-to-dashboard-btn"><i class="fa-solid fa-arrow-left"></i> Back to Dashboard</button>
             <div class="ecom-product-detail-layout">
                ${imageContent}
                <div class="ecom-product-detail-info">
                    <p class="ecom-product-category">${product.category}</p>
                    <h2 id="detail-product-name">${product.name}</h2>
                    <p class="ecom-product-detail-price" id="detail-product-price">${State.currentCurrency.symbol}${product.price.toFixed(2)}</p>
                    <p class="ecom-product-detail-stock"><strong>${product.stock}</strong> units in stock</p>
                    <p class="ecom-product-detail-description" id="detail-product-desc">${product.description}</p>
                    
                    <div class="ecom-mock-actions">
                         <button class="secondary-btn" id="mock-translate-btn">Translate (ES)</button>
                         <button class="secondary-btn" id="mock-currency-btn">Convert Currency (EUR)</button>
                    </div>
                </div>
             </div>
        </div>
    `;
}


// --- COMPONENTS & HELPERS ---
function renderProductGrid() {
    const container = document.getElementById('ecom-product-list-container');
    if (!container) return;

    if (State.ecomProducts.length > 0) {
        container.innerHTML = `<div id="ecom-products-grid">${State.ecomProducts.map(createProductCard).join('')}</div>`;
    } else {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <h3>No Products Listed Yet</h3>
                <p>Start by advertising your first product to a global audience.</p>
                <button id="ecom-add-new-from-empty-btn" class="main-submit-btn" style="margin-top: 1rem;">Add Your First Product</button>
            </div>`;
    }
}

function createProductCard(product: EcomProduct): string {
    const imageContent = product.imageUrl 
        ? `<img src="${product.imageUrl}" alt="${product.name}" class="ecom-product-image">`
        : `<div class="ecom-product-image-placeholder"><i class="fa-solid fa-image"></i></div>`;

    const renderSyndicationStatus = (p: EcomProduct) => {
        const statuses = p.syndicationStatus ? Object.values(p.syndicationStatus) : [];
        const liveCount = statuses.filter(s => s === 'live').length;
        const totalCount = MOCK_PLATFORMS.length;
        
        // NEW: Add a map for platform logos
        const platformLogos: { [key: string]: string } = {
            'Amazon': 'amazon.com',
            'eBay': 'ebay.com',
            'Shopify': 'shopify.com',
            'Walmart': 'walmart.com',
            'Etsy': 'etsy.com',
            'Instagram': 'instagram.com',
            'Facebook Marketplace': 'facebook.com',
            'Google Shopping': 'google.com',
            'TikTok Shop': 'tiktok.com',
            'Alibaba': 'alibaba.com',
        };
        
        return `
            <div class="ecom-syndication-status">
                <h5>Syndication Status (${liveCount}/${totalCount} Live)</h5>
                <div class="ecom-platform-list">
                ${MOCK_PLATFORMS.map(platform => {
                    const domain = platformLogos[platform] || 'vcanship.com'; // Fallback domain
                    const logoUrl = `https://logo.clearbit.com/${domain}?size=24`;
                    return `
                        <div class="ecom-platform-status">
                            <span class="status-dot ${p.syndicationStatus?.[platform] || 'pending'}"></span>
                            <img src="${logoUrl}" alt="${platform} logo" class="platform-logo" onerror="this.style.display='none'">
                            <span>${platform}</span>
                        </div>
                    `;
                }).join('')}
                </div>
            </div>`;
    };
    
    return `
        <div class="ecom-product-card" data-product-id="${product.id}">
            <div class="ecom-product-card-image-wrapper" data-action="view-detail">
                ${imageContent}
            </div>
            <div class="ecom-product-card-body">
                <h4 class="ecom-product-title" data-action="view-detail">${product.name || 'Untitled Product'}</h4>
                ${renderSyndicationStatus(product)}
                <div class="ecom-product-card-footer">
                    <div class="ecom-stock-controls">
                        <button class="secondary-btn" data-action="decrease-stock">-</button>
                        <input type="number" value="${product.stock}" class="ecom-stock-input" min="0">
                        <button class="secondary-btn" data-action="increase-stock">+</button>
                    </div>
                    <div class="ecom-product-actions">
                        <button class="secondary-btn" data-action="edit-product">Edit</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateWizardPreview() {
    const livePreviewContainer = document.getElementById('ecom-live-preview-container');
    if (!livePreviewContainer) return;

    const data = getWizardData();
    const productForPreview: EcomProduct = { ...data, id: 0, status: 'Draft', syndicationStatus: {} };
    livePreviewContainer.innerHTML = createProductCard(productForPreview);
}

// --- CORE LOGIC ---
function handleFormSubmit(e: Event) {
    e.preventDefault();
    const productData = getWizardData();
    const isEditing = State.ecomEditingProductId !== null;

    if (!productData.name || productData.price <= 0) {
        showToast('Product Name and a valid Price are required.', 'error');
        return;
    }

    let product: EcomProduct;
    if (isEditing) {
        const existingProduct = State.ecomProducts.find(p => p.id === State.ecomEditingProductId)!;
        product = { ...existingProduct, ...productData };
        setState({ ecomProducts: State.ecomProducts.map(p => p.id === product.id ? product : p) });
    } else {
        const syndicationStatus = MOCK_PLATFORMS.reduce((acc, platform) => ({ ...acc, [platform]: 'pending' }), {});
        product = { ...productData, id: Date.now(), status: 'Live', syndicationStatus };
        setState({ ecomProducts: [...State.ecomProducts, product] });
        simulateSyndication(product.id);
    }
    
    saveProductsToStorage();
    showToast(isEditing ? 'Product updated successfully!' : 'Product added successfully!', 'success');
    switchEcomView('dashboard');
}

function simulateSyndication(productId: number) {
    const productIndex = State.ecomProducts.findIndex(p => p.id === productId);
    if (productIndex === -1) return;

    MOCK_PLATFORMS.forEach(platform => {
        setTimeout(() => {
            const currentProducts = [...State.ecomProducts];
            currentProducts[productIndex].syndicationStatus[platform] = 'syndicating';
            setState({ ecomProducts: currentProducts });
            saveProductsToStorage();
            if (State.ecomCurrentView === 'dashboard') renderProductGrid();
        }, Math.random() * 2000 + 500);

        setTimeout(() => {
            const currentProducts = [...State.ecomProducts];
            currentProducts[productIndex].syndicationStatus[platform] = Math.random() > 0.1 ? 'live' : 'failed';
            setState({ ecomProducts: currentProducts });
            saveProductsToStorage();
            if (State.ecomCurrentView === 'dashboard') renderProductGrid();
        }, Math.random() * 4000 + 2000);
    });
}

function handleStockUpdate(productId: number, change: number | 'input', value?: number) {
    const products = [...State.ecomProducts];
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    if (change === 'input') {
        products[productIndex].stock = value !== undefined ? Math.max(0, value) : 0;
    } else {
        products[productIndex].stock = Math.max(0, products[productIndex].stock + change);
    }

    setState({ ecomProducts: products });
    saveProductsToStorage();
    
    // Visually update only the changed input to avoid full re-render
    const input = document.querySelector(`.ecom-product-card[data-product-id="${productId}"] .ecom-stock-input`) as HTMLInputElement;
    if (input) input.value = String(products[productIndex].stock);
}


// --- EVENT LISTENERS ---
function attachFormListeners() {
    document.getElementById('ecom-product-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('ecom-product-form')?.addEventListener('input', updateWizardPreview);
    
    const imageInput = document.getElementById('ecom-image-input') as HTMLInputElement;
    const dropZone = document.getElementById('ecom-image-drop-zone');
    const removeBtn = document.getElementById('ecom-remove-image-btn');
    
    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) { showToast('Invalid file type.', 'error'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            productImageBase64 = reader.result as string;
            updateImageView(productImageBase64);
            updateWizardPreview();
        };
        reader.readAsDataURL(file);
    };

    imageInput?.addEventListener('change', () => imageInput.files?.[0] && handleFile(imageInput.files[0]));
    dropZone?.addEventListener('click', () => imageInput.click());
    dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone?.addEventListener('drop', e => { e.preventDefault(); e.dataTransfer?.files?.[0] && handleFile(e.dataTransfer.files[0]); });
    removeBtn?.addEventListener('click', () => { productImageBase64 = null; imageInput.value = ''; updateImageView(null); updateWizardPreview(); });
}

function attachMainListeners() {
    const page = document.getElementById('page-ecommerce');
    if (!page) return;

    page.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action || target.parentElement?.dataset.action || target.id;
        const card = target.closest<HTMLElement>('.ecom-product-card');
        const productId = card ? parseInt(card.dataset.productId || '0', 10) : 0;
        
        switch (action) {
            case 'ecom-add-new-product-btn':
            case 'ecom-add-new-from-empty-btn':
                switchEcomView('form');
                break;
            case 'ecom-back-to-dashboard-btn':
                switchEcomView('dashboard');
                break;
            case 'edit-product':
                const productToEdit = State.ecomProducts.find(p => p.id === productId);
                if (productToEdit) renderFormView(productToEdit);
                break;
            case 'view-detail':
                switchEcomView('detail', productId);
                break;
            case 'increase-stock':
                handleStockUpdate(productId, 1);
                break;
            case 'decrease-stock':
                handleStockUpdate(productId, -1);
                break;
            case 'mock-translate-btn':
                (document.getElementById('detail-product-name') as HTMLElement).textContent = "Nombre del Producto (Traducido)";
                (document.getElementById('detail-product-desc') as HTMLElement).textContent = "Esta es una descripción del producto simulada y traducida para demostrar la funcionalidad de localización.";
                showToast('Content translated to Spanish (mock).', 'info');
                break;
            case 'mock-currency-btn':
                const product = State.ecomProducts.find(p => p.id === State.ecomViewingProductId);
                if(product) {
                    const priceInEur = product.price * 0.93; // Mock conversion rate
                    (document.getElementById('detail-product-price') as HTMLElement).textContent = `€${priceInEur.toFixed(2)}`;
                    showToast('Price converted to EUR (mock).', 'info');
                }
                break;
        }
    });

    page.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('ecom-stock-input')) {
            const card = target.closest<HTMLElement>('.ecom-product-card');
            const productId = card ? parseInt(card.dataset.productId || '0', 10) : 0;
            handleStockUpdate(productId, 'input', parseInt(target.value, 10));
        }
    });
}

function renderEcomPageShell() {
    const page = document.getElementById('page-ecommerce');
    if (!page) return;
    page.innerHTML = `
        <div class="ecom-page-container">
            <button class="back-btn" id="ecom-back-to-main-dashboard">Back to Main Dashboard</button>
            <div id="ecom-content-container"></div>
        </div>
    `;
    document.getElementById('ecom-back-to-main-dashboard')?.addEventListener('click', () => switchPage('dashboard'));
}


// --- HELPERS ---
function getWizardData() {
    return {
        name: (document.getElementById('ecom-product-name') as HTMLInputElement).value,
        description: (document.getElementById('ecom-product-description') as HTMLTextAreaElement).value,
        price: parseFloat((document.getElementById('ecom-product-price') as HTMLInputElement).value) || 0,
        stock: parseInt((document.getElementById('ecom-product-stock') as HTMLInputElement).value, 10) || 0,
        imageUrl: productImageBase64 || '',
        // These fields are not in the simplified form but are part of the state
        category: 'Demo Category',
        brand: 'Demo Brand',
        specifications: [],
        productType: 'physical' as 'physical',
    };
}

function updateImageView(imageBase64: string | null) {
    const preview = document.getElementById('ecom-image-preview') as HTMLImageElement;
    const idleView = document.getElementById('ecom-image-drop-zone-idle');
    const removeBtn = document.getElementById('ecom-remove-image-btn');
    if (!preview || !idleView || !removeBtn) return;
    if (imageBase64) {
        preview.src = imageBase64;
        preview.classList.remove('hidden');
        idleView.classList.add('hidden');
        removeBtn.classList.remove('hidden');
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        idleView.classList.remove('hidden');
        removeBtn.classList.add('hidden');
    }
}

// --- INITIALIZATION ---
export function startEcom() {
    setState({ currentService: 'ecommerce' });
    switchPage('ecommerce');
    loadProductsFromStorage();
    renderEcomPageShell();
    attachMainListeners();
    
    // Handle initial view based on entry point
    const initialView = State.ecomInitialView;
    if (initialView === 'add-product') {
        switchEcomView('form');
    } else {
        switchEcomView('dashboard');
    }
    setState({ ecomInitialView: null }); // Reset for next time
}
