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
  capacity_left?: string; // e.g., "12 TEU" or "2 t"
};

// Expanded mock data with structured origin/destination
const mockSchedules: Schedule[] = [
  { id: 's1', mode: 'SEA', carrier: 'Maersk', origin: { code: 'CNSHA', name: 'Shanghai' }, destination: { code: 'NLRTM', name: 'Rotterdam' }, route: 'Shanghai → Rotterdam', etd: '2024-07-27', eta: '2024-08-20', transit_days: 24, reliability_pct: 87, vessel: 'MSC Gulsun', capacity_left: '12 TEU' },
  { id: 's2', mode: 'SEA', carrier: 'CMA CGM', origin: { code: 'SGSIN', name: 'Singapore' }, destination: { code: 'GBFXT', name: 'Felixstowe' }, route: 'Singapore → Felixstowe', etd: '2024-07-25', eta: '2024-08-18', transit_days: 24, reliability_pct: 82, vessel: 'CMA CGM Marco Polo', capacity_left: '5 TEU' },
  { id: 's3', mode: 'AIR', carrier: 'MSC Air Cargo', origin: { code: 'ORD', name: 'Chicago O\'Hare' }, destination: { code: 'CAN', name: 'Guangzhou' }, route: 'ORD → CAN', etd: '2024-07-26', eta: '2024-07-28', transit_days: 2, reliability_pct: 92, flight: '5Y340', capacity_left: '2 t' },
  { id: 's4', mode: 'AIR', carrier: 'Atlas Air', origin: { code: 'LAX', name: 'Los Angeles' }, destination: { code: 'HKG', name: 'Hong Kong' }, route: 'LAX → HKG', etd: '2024-07-27', eta: '2024-07-29', transit_days: 2, reliability_pct: 89, flight: '5Y3411', capacity_left: '3 t' },
  { id: 's5', mode: 'SEA', carrier: 'Hapag-Lloyd', origin: { code: 'DEHAM', name: 'Hamburg' }, destination: { code: 'USNYC', name: 'New York' }, route: 'Hamburg → New York', etd: '2024-07-28', eta: '2024-08-10', transit_days: 13, reliability_pct: 91, vessel: 'Al Zubara', capacity_left: '25 TEU' },
  { id: 's6', mode: 'AIR', carrier: 'Lufthansa Cargo', origin: { code: 'FRA', name: 'Frankfurt' }, destination: { code: 'JFK', name: 'New York JFK' }, route: 'FRA → JFK', etd: '2024-07-25', eta: '2024-07-25', transit_days: 1, reliability_pct: 95, flight: 'LH8120', capacity_left: '1.5 t' },
  { id: 's7', mode: 'SEA', carrier: 'Evergreen', origin: { code: 'TWKHH', name: 'Kaohsiung' }, destination: { code: 'USLAX', name: 'Los Angeles' }, route: 'Kaohsiung → Los Angeles', etd: '2024-07-29', eta: '2024-08-15', transit_days: 17, reliability_pct: 78, vessel: 'Ever Ace', capacity_left: '8 TEU' },
  { id: 's8', mode: 'AIR', carrier: 'Cathay Cargo', origin: { code: 'HKG', name: 'Hong Kong' }, destination: { code: 'LHR', name: 'London' }, route: 'HKG → LHR', etd: '2024-07-28', eta: '2024-07-29', transit_days: 1, reliability_pct: 93, flight: 'CX251', capacity_left: '5 t' },
  { id: 's9', mode: 'SEA', carrier: 'ONE', origin: { code: 'JPYOK', name: 'Yokohama' }, destination: { code: 'SGSIN', name: 'Singapore' }, route: 'Yokohama → Singapore', etd: '2024-08-01', eta: '2024-08-09', transit_days: 8, reliability_pct: 94, vessel: 'ONE Competence', capacity_left: '30 TEU' },
  { id: 's10', mode: 'AIR', carrier: 'Emirates SkyCargo', origin: { code: 'DXB', name: 'Dubai' }, destination: { code: 'ORD', name: 'Chicago O\'Hare' }, route: 'DXB → ORD', etd: '2024-07-26', eta: '2024-07-27', transit_days: 1, reliability_pct: 96, flight: 'EK9911', capacity_left: '8 t' },
];

function renderSchedulesPage() {
  const page = document.getElementById('page-schedules');
  if (!page) return;

  page.innerHTML = `
        <button class="back-btn static-link" data-page="landing"><i class="fa-solid fa-arrow-left"></i> Back to Services</button>
        <div class="service-page-header">
            <h2>🗓️ Shipping Schedules</h2>
            <p class="subtitle">View live sailing and flight schedules from major carriers worldwide.</p>
        </div>

        <div class="schedules-container">
            <div class="schedules-filters card">
                <h3>Filter Schedules</h3>
                <div class="filter-row">
                    <div class="input-wrapper">
                        <label for="filter-origin">Origin</label>
                        <input type="text" id="filter-origin" placeholder="e.g., Shanghai, CNSHA">
                    </div>
                    <div class="input-wrapper">
                        <label for="filter-destination">Destination</label>
                        <input type="text" id="filter-destination" placeholder="e.g., Rotterdam, NLRTM">
                    </div>
                    <div class="input-wrapper">
                        <label for="filter-mode">Mode</label>
                        <select id="filter-mode">
                            <option value="">All Modes</option>
                            <option value="SEA">Sea Freight</option>
                            <option value="AIR">Air Freight</option>
                        </select>
                    </div>
                    <div class="input-wrapper">
                        <label for="filter-carrier">Carrier</label>
                        <input type="text" id="filter-carrier" placeholder="e.g., Maersk">
                    </div>
                </div>
                <button id="apply-filters-btn" class="main-submit-btn">Apply Filters</button>
            </div>

            <div id="schedules-results" class="schedules-results">
                <!-- Results will be rendered here -->
            </div>
        </div>
    `;

  renderSchedules(mockSchedules);
  attachSchedulesListeners();
}

function renderSchedules(schedules: Schedule[]) {
  const resultsContainer = document.getElementById('schedules-results');
  if (!resultsContainer) return;

  if (schedules.length === 0) {
    resultsContainer.innerHTML = '<p class="no-results">No schedules found matching your criteria.</p>';
    return;
  }

  const html = schedules.map(s => `
        <div class="schedule-card card">
            <div class="schedule-header">
                <span class="mode-badge ${s.mode.toLowerCase()}">${s.mode}</span>
                <h4>${s.carrier}</h4>
                <span class="reliability-badge" style="background: ${s.reliability_pct >= 90 ? '#4caf50' : s.reliability_pct >= 80 ? '#ff9800' : '#f44336'}">
                    ${s.reliability_pct}% On-Time
                </span>
            </div>
            <div class="schedule-route">
                <div class="route-point">
                    <strong>${s.origin.name}</strong>
                    <small>${s.origin.code}</small>
                </div>
                <div class="route-arrow">→</div>
                <div class="route-point">
                    <strong>${s.destination.name}</strong>
                    <small>${s.destination.code}</small>
                </div>
            </div>
            <div class="schedule-details">
                <div class="detail-item">
                    <i class="fa-solid fa-calendar-day"></i>
                    <div>
                        <small>ETD</small>
                        <strong>${s.etd}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fa-solid fa-calendar-check"></i>
                    <div>
                        <small>ETA</small>
                        <strong>${s.eta}</strong>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fa-solid fa-clock"></i>
                    <div>
                        <small>Transit</small>
                        <strong>${s.transit_days} days</strong>
                    </div>
                </div>
                ${s.vessel ? `
                <div class="detail-item">
                    <i class="fa-solid fa-ship"></i>
                    <div>
                        <small>Vessel</small>
                        <strong>${s.vessel}</strong>
                    </div>
                </div>
                ` : ''}
                ${s.flight ? `
                <div class="detail-item">
                    <i class="fa-solid fa-plane"></i>
                    <div>
                        <small>Flight</small>
                        <strong>${s.flight}</strong>
                    </div>
                </div>
                ` : ''}
                ${s.capacity_left ? `
                <div class="detail-item">
                    <i class="fa-solid fa-box"></i>
                    <div>
                        <small>Capacity</small>
                        <strong>${s.capacity_left}</strong>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `).join('');

  resultsContainer.innerHTML = html;
}

function attachSchedulesListeners() {
  const applyBtn = document.getElementById('apply-filters-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const origin = (document.getElementById('filter-origin') as HTMLInputElement)?.value.toLowerCase();
      const destination = (document.getElementById('filter-destination') as HTMLInputElement)?.value.toLowerCase();
      const mode = (document.getElementById('filter-mode') as HTMLSelectElement)?.value as 'SEA' | 'AIR' | '';
      const carrier = (document.getElementById('filter-carrier') as HTMLInputElement)?.value.toLowerCase();

      let filtered = mockSchedules;

      if (origin) {
        filtered = filtered.filter(s =>
          s.origin.name.toLowerCase().includes(origin) ||
          s.origin.code.toLowerCase().includes(origin)
        );
      }

      if (destination) {
        filtered = filtered.filter(s =>
          s.destination.name.toLowerCase().includes(destination) ||
          s.destination.code.toLowerCase().includes(destination)
        );
      }

      if (mode) {
        filtered = filtered.filter(s => s.mode === mode);
      }

      if (carrier) {
        filtered = filtered.filter(s => s.carrier.toLowerCase().includes(carrier));
      }

      renderSchedules(filtered);
      showToast(`Found ${filtered.length} schedule(s)`, 'info');
    });
  }
}

export function startSchedules() {
  const page = document.getElementById('page-schedules');
  if (page) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class' && (mutation.target as HTMLElement).classList.contains('active')) {
          renderSchedulesPage();
        }
      }
    });
    observer.observe(page, { attributes: true });
  }
}