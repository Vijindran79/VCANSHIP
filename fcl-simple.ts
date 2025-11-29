import { t } from './i18n';
import { State, setState } from './state';
import { showToast, toggleLoading } from './ui';

// Simple FCL implementation that matches working services
export function startFcl() {
    setState({ currentService: 'fcl' });
    renderFclPage();
}

export function renderFclPage() {
    const page = document.getElementById('page-fcl');
    if (!page) {
        console.error('page-fcl element not found');
        return;
    }

    page.innerHTML = `
        <div class="service-page">
            <div class="service-header">
                <div class="service-icon">
                    <i class="fas fa-ship"></i>
                </div>
                <div class="service-info">
                    <h1>FCL Sea Freight</h1>
                    <p>Book exclusive container usage for large volume shipments</p>
                </div>
            </div>

            <form id="fcl-form" class="service-form">
                <!-- Service Type Selection -->
                <div class="form-section">
                    <h3><i class="fas fa-route"></i> Service Type</h3>
                    <div class="service-type-grid">
                        <div class="service-type-option selected" data-service-type="port-to-port">
                            <i class="fas fa-anchor"></i>
                            <h4>Port-to-Port</h4>
                            <p>You handle transport to/from ports.</p>
                        </div>
                        <div class="service-type-option" data-service-type="door-to-port">
                            <i class="fas fa-home"></i>
                            <h4>Door-to-Port</h4>
                            <p>We pick up from your door.</p>
                        </div>
                        <div class="service-type-option" data-service-type="port-to-door">
                            <i class="fas fa-truck"></i>
                            <h4>Port-to-Door</h4>
                            <p>We deliver to their door.</p>
                        </div>
                        <div class="service-type-option" data-service-type="door-to-door">
                            <i class="fas fa-handshake"></i>
                            <h4>Door-to-Door</h4>
                            <p>We handle the entire journey.</p>
                        </div>
                    </div>
                </div>

                <!-- Origin -->
                <div class="form-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Origin</h3>
                    <div class="input-wrapper">
                        <label for="origin-port">Port of Loading</label>
                        <input type="text" id="origin-port" placeholder="e.g., Shanghai or CNSHA" required>
                        <small>Enter UN/LOCODE or port name</small>
                    </div>
                </div>

                <!-- Destination -->
                <div class="form-section">
                    <h3><i class="fas fa-map-marker-alt"></i> Destination</h3>
                    <div class="input-wrapper">
                        <label for="destination-port">Port of Discharge</label>
                        <input type="text" id="destination-port" placeholder="e.g., Los Angeles or USLAX" required>
                        <small>Enter UN/LOCODE or port name</small>
                    </div>
                </div>

                <!-- Cargo & Container Details -->
                <div class="form-section">
                    <h3><i class="fas fa-boxes-stacked"></i> Cargo & Container Details</h3>
                    <div class="input-wrapper">
                        <label for="cargo-description">Cargo Description</label>
                        <textarea id="cargo-description" placeholder="e.g., 15 pallets of consumer electronics" rows="3" required></textarea>
                    </div>
                    
                    <div class="container-config">
                        <div class="input-row">
                            <div class="input-wrapper">
                                <label for="container-type">Container Type</label>
                                <select id="container-type" required>
                                    <option value="20GP">20GP</option>
                                    <option value="40GP">40GP</option>
                                    <option value="40HC">40HC</option>
                                </select>
                            </div>
                            <div class="input-wrapper">
                                <label for="quantity">Quantity</label>
                                <input type="number" id="quantity" value="1" min="1" max="50" required>
                            </div>
                            <div class="input-wrapper">
                                <label for="weight">Weight</label>
                                <input type="number" id="weight" value="1000" min="1" step="0.1" required>
                            </div>
                            <div class="input-wrapper">
                                <label for="weight-unit">Unit</label>
                                <select id="weight-unit" required>
                                    <option value="KG">KG</option>
                                    <option value="TON">TON</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="main-submit-btn">
                        <i class="fas fa-search"></i> Get Quote & Compliance
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
    document.querySelectorAll('.service-type-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            document.querySelectorAll('.service-type-option').forEach(opt => opt.classList.remove('selected'));
            target.classList.add('selected');
        });
    });

    // Form submission
    const form = document.getElementById('fcl-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleFormSubmit();
        });
    }
}

function handleFormSubmit() {
    showToast('FCL quote request submitted successfully!', 'success');
    console.log('FCL form submitted');
}