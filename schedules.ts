// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { setState } from './state';
import { switchPage, showToast } from './ui';

// Type Definitions for a schedule entry
type Location = {
    code: string;
    name: string;
};

type Schedule = {
  id: string;
  mode: 'SEA' | 'AIR';
  carrier: string;
  origin: Location;
  destination: Location;
  route: string; // Kept for simple display
  etd: string;
  eta: string;
  transit_days: number;
  reliability_pct: number;
  vessel?: string;
  flight?: string;
  capacity_left?: string; // e.g., “12 TEU” or “2 t”
};

// Expanded mock data with structured origin/destination
const mockSchedules: Schedule[] = [
  { id: 's1', mode: 'SEA', carrier: 'Maersk', origin: { code: 'CNSHA', name: 'Shanghai'}, destination: { code: 'NLRTM', name: 'Rotterdam' }, route: 'Shanghai → Rotterdam', etd: '2024-07-27', eta: '2024-08-20', transit_days: 24, reliability_pct: 87, vessel: 'MSC Gulsun', capacity_left: '12 TEU' },
  { id: 's2', mode: 'SEA', carrier: 'CMA CGM', origin: { code: 'SGSIN', name: 'Singapore'}, destination: { code: 'GBFXT', name: 'Felixstowe' }, route: 'Singapore → Felixstowe', etd: '2024-07-25', eta: '2024-08-18', transit_days: 24, reliability_pct: 82, vessel: 'CMA CGM Marco Polo', capacity_left: '5 TEU' },
  { id: 's3', mode: 'AIR', carrier: 'MSC Air Cargo', origin: { code: 'ORD', name: 'Chicago O\'Hare'}, destination: { code: 'CAN', name: 'Guangzhou' }, route: 'ORD → CAN', etd: '2024-07-26', eta: '2024-07-28', transit_days: 2, reliability_pct: 92, flight: '5Y340', capacity_left: '2 t' },
  { id: 's4', mode: 'AIR', carrier: 'Atlas Air', origin: { code: 'LAX', name: 'Los Angeles'}, destination: { code: 'HKG', name: 'Hong Kong' }, route: 'LAX → HKG', etd: '2024-07-27', eta: '2024-07-29', transit_days: 2, reliability_pct: 89, flight: '5Y3411', capacity_left: '3 t' },
  { id: 's5', mode: 'SEA', carrier: 'Hapag-Lloyd', origin: { code: 'DEHAM', name: 'Hamburg'}, destination: { code: 'USNYC', name: 'New York' }, route: 'Hamburg → New York', etd: '2024-07-28', eta: '2024-08-10', transit_days: 13, reliability_pct: 91, vessel: 'Al Zubara', capacity_left: '25 TEU' },
  { id: 's6', mode: 'AIR', carrier: 'Lufthansa Cargo', origin: { code: 'FRA', name: 'Frankfurt'}, destination: { code: 'JFK', name: 'New York JFK' }, route: 'FRA → JFK', etd: '2024-07-25', eta: '2024-07-25', transit_days: 1, reliability_pct: 95, flight: 'LH8120', capacity_left: '1.5 t' },
  { id: 's7', mode: 'SEA', carrier: 'Evergreen', origin: { code: 'TWKHH', name: 'Kaohsiung'}, destination: { code: 'USLAX', name: 'Los Angeles' }, route: 'Kaohsiung → Los Angeles', etd: '2024-07-29', eta: '2024-08-15', transit_days: 17, reliability_pct: 78, vessel: 'Ever Ace', capacity_left: '8 TEU' },
  { id: 's8', mode: 'AIR', carrier: 'Cathay Cargo', origin: { code: 'HKG', name: 'Hong Kong'}, destination: { code: 'LHR', name: 'London' }, route: 'HKG → LHR', etd: '2024-07-28', eta: '2024-07-29', transit_days: 1, reliability_pct: 93, flight: 'CX251', capacity_left: '5 t' },
  { id: 's9', mode: 'SEA', carrier: 'ONE', origin: { code: 'JPYOK', name: 'Yokohama'}, destination: { code: 'SGSIN', name: 'Singapore' }, route: 'Yokohama → Singapore', etd: '2024-08-01', eta: '2024-08-09', transit_days: 8, reliability_pct: 94, vessel: 'ONE Competence', capacity_left: '30 TEU' },
  { id: 's10', mode: 'AIR', carrier: 'Emirates SkyCargo', origin: { code: 'DXB', name: 'Dubai'}, destination: { code: 'ORD', name: 'Chicago O\'Hare' }, route: 'DXB → ORD', etd: '2024-07-26', eta: '2024-07-27', transit_days: 1, reliability_pct: 96, flight: 'EK9911', capacity_left: '8 t' },
];

function renderSchedulesPage() {
    const page = document.getElementById('page-schedules');
    if (!page) return;

    page.innerHTML = `
        <button class="back-btn">Back to Services</button>
        <div class="service-page-header">
            <h2>Schedules & Trade Lanes</h2>
            <p class="subtitle">Explore global shipping schedules for major sea and air carriers.</p>
        </div>
        <div class="schedules-container">
            <aside class="schedules-filters-card card">
                 <h3>Filters</h3>
                 <div class="input-wrapper"><label for="schedules-origin-input">Origin</label><input type="text" id="schedules-origin-input" placeholder="e.g., Shanghai or CNSHA"></div>
                 <div class="input-wrapper"><label for="schedules-dest-input">Destination</label><input type="text" id="schedules-dest-input" placeholder="e.g., Rotterdam or NLRTM"></div>
                 <div class="input-wrapper"><label for="schedules-mode-select">Mode</label><select id="schedules-mode-select"><option value="">All Modes</option><option value="SEA">Sea</option><option value="AIR">Air</option></select></div>
                 <div class="input-wrapper"><label for="schedules-carrier-select">Carrier</label><select id="schedules-carrier-select"><option value="">All Carriers</option></select></div>
                 <button id="schedules-reset-btn" class="secondary-btn">Reset Filters</button>
            </aside>
            <main class="schedules-results-container">
                <div id="schedules-card-list" class="schedules-results-grid">
                    <!-- Schedule cards will be rendered here -->
                </div>
                 <div id="schedules-empty-state" class="schedules-empty-state hidden">
                    <i class="fa-solid fa-route empty-state-icon"></i>
                    <h3>No Schedules Found</h3>
                    <p>Try adjusting your filters or search for a different route.</p>
                </div>
            </main>
        </div>
    `;

    page.querySelector('.back-btn')?.addEventListener('click', () => switchPage('landing'));
}

/**
 * Renders the final, sorted list of schedules into the card list container.
 * @param schedules The array of schedules to render.
 */
function renderScheduleCards(schedules: Schedule[]) {
    // Sort by ETD, ascending
    schedules.sort((a, b) => new Date(a.etd).getTime() - new Date(b.etd).getTime());

    const cardList = document.getElementById('schedules-card-list');
    const emptyState = document.getElementById('schedules-empty-state');
    
    if (!cardList || !emptyState) return;

    if (schedules.length === 0) {
        cardList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    cardList.innerHTML = ''; // Clear previous results
    emptyState.classList.add('hidden');

    const modeIcons = {
        SEA: `<i class="fa-solid fa-ship mode-icon"></i>`,
        AIR: `<i class="fa-solid fa-plane-up mode-icon"></i>`,
    };

    // Map of carrier names to their correct domains for logo fetching
    const carrierDomainMap: { [key: string]: string } = {
        'Maersk': 'maersk.com',
        'CMA CGM': 'cma-cgm.com',
        'MSC Air Cargo': 'msc.com',
        'Atlas Air': 'atlasair.com',
        'Hapag-Lloyd': 'hapag-lloyd.com',
        'Lufthansa Cargo': 'lufthansa-cargo.com',
        'Evergreen': 'evergreen-marine.com',
        'Cathay Cargo': 'cathaycargo.com',
        'ONE': 'one-line.com',
        'Emirates SkyCargo': 'skycargo.com'
    };

    schedules.forEach(s => {
        const reliabilityClass = s.reliability_pct >= 90 ? 'high' : s.reliability_pct >= 80 ? 'medium' : 'low';
        const carrierName = s.carrier || 'Carrier';

        // Use the map for known domains, otherwise fall back to guessing
        const domain = carrierDomainMap[carrierName] || `${carrierName.toLowerCase().replace(/\s|&/g, '').replace(/\./g, '').replace('group', '')}.com`;
        const logoUrl = `https://logo.clearbit.com/${domain}?size=40`;


        const card = document.createElement('div');
        card.className = 'schedule-card';
        card.innerHTML = `
            <div class="schedule-card-header">
                <img src="${logoUrl}" alt="${carrierName}" class="carrier-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="carrier-logo-fallback" style="display: none;">${carrierName.charAt(0)}</div>
                <div class="carrier-info">
                    <h4>${carrierName}</h4>
                    <span>${s.vessel || s.flight || 'N/A'}</span>
                </div>
                ${modeIcons[s.mode]}
            </div>
            <div class="schedule-card-route">
                <div class="route-point">
                    <strong>${s.origin.code}</strong>
                    <span>${s.origin.name}</span>
                </div>
                <div class="route-line"></div>
                <div class="route-point">
                    <strong>${s.destination.code}</strong>
                    <span>${s.destination.name}</span>
                </div>
            </div>
            <div class="schedule-card-details">
                <div class="schedule-detail-item"><label>ETD</label><strong>${s.etd}</strong></div>
                <div class="schedule-detail-item"><label>ETA</label><strong>${s.eta}</strong></div>
                <div class="schedule-detail-item"><label>Transit Time</label><strong>${s.transit_days} days</strong></div>
                <div class="schedule-detail-item"><label>On-Time Reliability</label><strong><span class="reliability-dot ${reliabilityClass}"></span> ${s.reliability_pct}%</strong></div>
            </div>
            <div class="schedule-card-footer">
                <span class="capacity-info">Capacity: <strong>${s.capacity_left || 'Available'}</strong></span>
                <button class="cta-button">Book Now</button>
            </div>
        `;
        card.querySelector('.cta-button')?.addEventListener('click', () => {
            showToast(`Booking for ${carrierName} is coming soon.`, 'info');
        });
        cardList.appendChild(card);
    });
}


/**
 * Updates the carrier dropdown with options derived from a list of schedules.
 * @param schedules The schedules to source carrier names from.
 */
function updateCarrierDropdown(schedules: Schedule[]) {
    const carrierSelect = DOMElements.schedules.carrierSelect;
    const currentSelection = carrierSelect.value;

    const uniqueCarriers = [...new Set(schedules.map(s => s.carrier))].sort();

    carrierSelect.innerHTML = `<option value="">All carriers</option>`; // Reset options

    uniqueCarriers.forEach(carrier => {
        const option = document.createElement('option');
        option.value = carrier;
        option.textContent = carrier;
        carrierSelect.appendChild(option);
    });

    // Restore previous selection if it's still a valid option in the new list
    if (uniqueCarriers.includes(currentSelection)) {
        carrierSelect.value = currentSelection;
    }
}

/**
 * Filters schedules based on all inputs and re-renders the table and carrier dropdown.
 */
function applyFiltersAndRender() {
    const originFilter = DOMElements.schedules.originInput.value.toLowerCase().trim();
    const destFilter = DOMElements.schedules.destInput.value.toLowerCase().trim();
    const modeFilter = DOMElements.schedules.modeSelect.value;
    
    // 1. First pass: Filter by route and mode to determine available carriers
    const routeFilteredSchedules = mockSchedules.filter(s => {
        const originMatch = !originFilter || 
            s.origin.name.toLowerCase().includes(originFilter) ||
            s.origin.code.toLowerCase().includes(originFilter);
            
        const destMatch = !destFilter ||
            s.destination.name.toLowerCase().includes(destFilter) ||
            s.destination.code.toLowerCase().includes(destFilter);

        const modeMatch = !modeFilter || s.mode === modeFilter;

        return originMatch && destMatch && modeMatch;
    });

    // 2. Update the carrier dropdown with only the relevant carriers
    updateCarrierDropdown(routeFilteredSchedules);

    // 3. Second pass: Filter the already filtered list by the selected carrier
    const carrierFilter = DOMElements.schedules.carrierSelect.value;
    const finalFilteredSchedules = routeFilteredSchedules.filter(s => {
        return !carrierFilter || s.carrier === carrierFilter;
    });

    // 4. Render the final result to the table
    renderScheduleCards(finalFilteredSchedules);
}


/**
 * Initializes the Schedules & Trade Lanes page.
 */
export const startSchedules = () => {
    setState({ currentService: 'schedules' });
    renderSchedulesPage();
    switchPage('schedules');
    
    // The main filtering inputs that affect the carrier dropdown
    const primaryFilterElements = [
        DOMElements.schedules.originInput,
        DOMElements.schedules.destInput,
        DOMElements.schedules.modeSelect,
    ];
    primaryFilterElements.forEach(el => el.addEventListener('input', applyFiltersAndRender));

    // The carrier dropdown itself just re-filters the existing list without changing other dropdowns
    DOMElements.schedules.carrierSelect.addEventListener('change', applyFiltersAndRender);

    // The reset button clears all filters and re-renders
    const resetBtn = document.getElementById('schedules-reset-btn');
    resetBtn?.addEventListener('click', () => {
        DOMElements.schedules.originInput.value = '';
        DOMElements.schedules.destInput.value = '';
        DOMElements.schedules.modeSelect.value = '';
        // The carrier dropdown will be reset automatically by applyFiltersAndRender
        applyFiltersAndRender();
    });

    // Initial render
    applyFiltersAndRender();
};