// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { GoogleGenAI, Chat } from "@google/genai";

// --- TYPE DEFINITIONS ---

export type Service = 'parcel' | 'baggage' | 'fcl' | 'lcl' | 'airfreight' | 'vehicle' | 'warehouse' | 'ecommerce' | 'schedules' | 'register' | 'service-provider-register' | 'railway' | 'inland' | 'bulk' | 'rivertug' | 'secure-trade';
export type Page = Service | 'landing' | 'dashboard' | 'address-book' | 'settings' | 'help' | 'api-hub' | 'privacy' | 'terms' | 'results' | 'payment' | 'confirmation';

export interface Currency {
    code: string;
    symbol: string;
}

export interface Address {
    name: string;
    street: string;
    city: string;
    postcode: string;
    country: string;
    email?: string;
    phone?: string;
}

export interface Quote {
    carrierName: string;
    carrierType: string;
    estimatedTransitTime: string;
    chargeableWeight: number;
    chargeableWeightUnit: string;
    weightBasis: string;
    isSpecialOffer: boolean;
    totalCost: number;
    costBreakdown: {
        baseShippingCost: number;
        fuelSurcharge: number;
        estimatedCustomsAndTaxes: number;
        optionalInsuranceCost: number;
        ourServiceFee: number;
    };
    serviceProvider: string;
    notes?: string;
}

export interface DropOffLocation {
    name: string;
    address: string;
    distance: string;
    hours: string;
    offersLabelPrinting: boolean;
}

// FIX: Redefined ApiResponse to match the actual structure of the quote response object.
export interface ApiResponse {
    itemWarning?: string | null;
    complianceReport: any;
    quotes: Quote[];
    costSavingOpportunities: any[];
    nextSteps: string;
}

// E-commerce Types
export type ProductType = 'physical' | 'external';
export interface EcomProduct {
    id: number;
    name: string;
    description: string;
    category: string;
    brand: string;
    specifications: { key: string; value: string }[];
    price: number;
    stock: number;
    imageUrl: string;
    productType: ProductType;
    externalLink?: string;
    status: 'Live' | 'Draft' | 'Out of Stock';
    syndicationStatus: { [platform: string]: 'pending' | 'syndicating' | 'live' | 'failed' };
}

// Baggage Types
export type BaggageServiceType = 'door-to-door' | 'door-to-airport' | 'airport-to-door' | 'airport-to-airport';
export interface BaggageDetails {
    serviceType: BaggageServiceType;
    pickupType: 'address' | 'location';
    deliveryType: 'address' | 'location';
    pickupAddress: Address | null;
    pickupLocation: string | null;
    deliveryAddress: Address | null;
    deliveryLocation: string | null;
    weight: number;
    serviceLevel: string;
    extraInsurance: boolean;
    insuredValue: number;
    purchasedTracker: boolean;
    shipmentId: string;
}

// FCL Types
export type FclServiceType = 'port-to-port' | 'door-to-port' | 'port-to-door' | 'door-to-door';
export interface FclContainer {
    type: string;
    quantity: number;
    weight: number;
    weightUnit: 'TON' | 'KG';
}
export interface FclDetails {
    serviceType: FclServiceType;
    pickupType: 'address' | 'location';
    deliveryType: 'address' | 'location';
    pickupAddress: { name: string; country: string } | null;
    deliveryAddress: { name: string; country: string } | null;
    pickupPort: string | null;
    deliveryPort: string | null;
    cargoDescription: string;
    hsCode: string;
    containers: FclContainer[];
}
export interface FclFlashSlot {
    id: string;
    route: string;
    container: string;
    etd: string;
    price: number;
    slotsTotal: number;
    slotsSold: number;
}
export interface ComplianceDoc {
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'uploaded' | 'verified';
    file: File | null;
    required: boolean;
}


// LCL Types
export type LclServiceLevel = 'standard' | 'priority' | 'express';
export interface LclCargoItem {
    id: number;
    pieces: number;
    length: number;
    width: number;
    height: number;
    weight: number;
}
export interface LclDetails {
    originAddress: string;
    destAddress: string;
    cargoDescription: string;
    hsCode: string;
    cargoItems: LclCargoItem[];
    isStackable: boolean;
    isHazardous: boolean;
    imdgClass: string | null;
    totalCbm?: number;
    chargeableWeight?: number;
    serviceLevel: LclServiceLevel;
    forwardingChoice: 'vcanship' | 'booking_only';
}

// Vehicle Types
export type ShippingMethod = 'roro' | 'container' | 'lolo' | 'heavylift';
export interface VehicleDetails {
    originPort: string;
    destPort: string;
    make: string;
    model: string;
    year: number;
    condition: 'new' | 'used' | 'operable' | 'inoperable';
    canRollOnDeck: boolean;
    length: number;
    width: number;
    height: number;
    weight: number;
}

// Bulk & Charter Types
export interface BulkDetails {
    cargoType: string;
    cargoQuantity: number;
    cargoDescription: string;
    originPort: string;
    destPort: string;
}


// Railway Types
export type RailwayCargoType = 'standard-container' | 'bulk-wagon' | 'special-cargo';
export type RailwayServiceLevel = 'standard' | 'express-block-train';
export interface RailwayDetails {
    originTerminal: string;
    destTerminal: string;
    cargoDescription: string;
    cargoType: RailwayCargoType;
    serviceLevel: RailwayServiceLevel;
}

// River Tug Types
export type BargeType = 'deck' | 'hopper' | 'tank' | 'spud';
export interface RiverTugDetails {
    originPort: string;
    destPort: string;
    cargoDescription: string;
    cargoVolume: number;
    bargeType: BargeType;
    isHazardous: boolean;
}

// Inland Types
export interface Truck {
    id: string;
    driverName: string;
    driverRating: number;
    etaPickupMin: number;
    price: number;
    vehicleType: string;
    gps_lat: number;
    gps_lon: number;
}
export interface InlandDetails {
    originAddress: string;
    destAddress: string;
    loadType: 'FTL' | 'LTL';
    cargoDescription: string;
    weight: number;
    selectedTruck: Truck | null;
    bookingId?: string;
}

// Warehouse Types
export interface Facility {
    id: string;
    name: string;
    country: string;
    types: string[];
    lat: number;
    lon: number;
    availability: number;
    price: number;
}
export type WarehouseServiceLevel = 'standard' | 'value-added';
export interface WarehouseDetails {
    selectedFacility: Facility | null;
    cargoDescription: string;
    palletCount: number;
    requiresTempControl: boolean;
    tempMin?: number;
    isHazardous: boolean;
    unNumber: string | null;
    serviceLevel?: WarehouseServiceLevel;
}

// Airfreight Types
export type AirfreightServiceLevel = 'standard' | 'priority' | 'charter';
export interface AirfreightCargoPiece {
    id: number;
    pieces: number;
    length: number;
    width: number;
    height: number;
    weight: number;
}
export interface AirfreightDetails {
    cargoCategory: string;
    cargoDescription: string;
    hsCode: string;
    originAirport: string;
    destAirport: string;
    cargoPieces: AirfreightCargoPiece[];
    chargeableWeight: number;
    serviceLevel: AirfreightServiceLevel;
}


// Trade Finance Types
export interface TradeFinanceAssessment {
    recommendedProduct: 'Invoice Financing' | 'PO Financing' | 'Supply Chain Finance' | 'None';
    reasoning: string;
}

// Secure Trade Types
export interface SecureTradeDetails {
    sellerEmail: string;
    goodsDescription: string;
    goodsValue: number;
}

// Deal/Promotion Type
export interface Deal {
  id: string;
  service: Service;
  title: string;
  description: string;
  origin: { city: string; countryCode: string; };
  destination: { city: string; countryCode: string; };
  price: string;
  urgencyText: string;
}
export interface Promotion {
    id: string;
    service: Service | 'general';
    title: string;
    description: string;
    origin?: { city: string; countryCode: string; };
    destination?: { city: string; countryCode: string; };
    price?: string;
    urgencyText?: string;
    theme: string;
}

export const shipmentHistory = [
    { id: 'PAR-827192', service: 'parcel', date: '2024-07-15', origin: 'London, GB', destination: 'New York, US', status: 'Delivered', cost: 45.50, carrier: 'DHL', isOnTime: true },
    { id: 'FCL-391820', service: 'fcl', date: '2024-07-10', origin: 'Shanghai, CN', destination: 'Los Angeles, US', status: 'In Transit', cost: 3200.00, carrier: 'Maersk', isOnTime: true },
    { id: 'BGG-109283', service: 'baggage', date: '2024-07-20', origin: 'Sydney, AU', destination: 'London, GB', status: 'Booked', cost: 180.00, carrier: 'FedEx', isOnTime: true },
    { id: 'LCL-481029', service: 'lcl', date: '2024-06-25', origin: 'Hamburg, DE', destination: 'Dubai, AE', status: 'Delivered', cost: 450.00, carrier: 'Kuehne+Nagel', isOnTime: false },
    { id: 'PAR-817290', service: 'parcel', date: '2024-07-18', origin: 'Tokyo, JP', destination: 'Paris, FR', status: 'In Transit', cost: 65.20, carrier: 'UPS', isOnTime: true },
    { id: 'VEH-291837', service: 'vehicle', date: '2024-06-15', origin: 'Busan, KR', destination: 'Jebel Ali, AE', status: 'Delivered', cost: 1500.00, carrier: 'Hoegh Autoliners', isOnTime: true },
    { id: 'AIR-991283', service: 'airfreight', date: '2024-07-22', origin: 'Frankfurt, DE', destination: 'Chicago, US', status: 'Booked', cost: 2100.00, carrier: 'Lufthansa Cargo', isOnTime: true },
    { id: 'PAR-712389', service: 'parcel', date: '2024-07-05', origin: 'Hong Kong, HK', destination: 'London, GB', status: 'Delivered', cost: 35.00, carrier: 'DHL', isOnTime: true },
];


// --- APP STATE ---

export interface AppState {
    api: GoogleGenAI | null;
    currentPage: Page;
    currentService: Service | null;
    isLoggedIn: boolean;
    currentUser: { name: string; email: string } | null;
    postLoginRedirectService: Service | string | null;
    subscriptionTier: 'guest' | 'free' | 'pro';
    aiLookupsRemaining: number;
    currentCurrency: Currency;

    // Parcel Service
    parcelOrigin: Partial<Address> | null;
    parcelDestination: Partial<Address> | null;
    parcelInitialWeight?: number;
    parcelInitialLength?: number;
    parcelInitialWidth?: number;
    parcelInitialHeight?: number;
    parcelPickupType: 'pickup' | 'dropoff';
    parcelSelectedQuote: Quote | null;
    parcelInsuranceAdded: boolean;
    parcelDeclaredValue: number;
    parcelInsuranceCost: number;
    parcelPremiumTrackingAdded: boolean;
    parcelPremiumTrackingCost: number;

    // E-commerce Service
    ecomProducts: EcomProduct[];
    ecomEditingProductId: number | null;
    ecomProductType: ProductType;
    ecomInitialView: 'add-product' | 'my-products' | 'hub' | null;
    ecomCurrentView: 'dashboard' | 'form' | 'detail';
    ecomViewingProductId: number | null;

    // Baggage Service
    currentBaggageStep: 'details' | 'quote' | 'payment' | 'confirmation';
    baggageDetails: BaggageDetails | null;
    baggageQuote: number | null;
    baggageInsuranceCost: number;
    baggageTrackerCost: number;

    // FCL Service
    currentFclStep: number;
    fclDetails: FclDetails | null;
    fclQuote: Quote | null;
    fclComplianceDocs: ComplianceDoc[];
    fclFlashSlots: FclFlashSlot[];
    fclSlotIntervalId: number | null;
    fclBookingId: string | null;
    fclSignatureDataUrl: string | null;

    // LCL Service
    currentLclStep: number;
    lclDetails: LclDetails | null;
    lclComplianceDocs: ComplianceDoc[];
    lclQuote: Quote | null;
    lclBookingId: string | null;

    // Vehicle Service
    currentVehicleStep: number;
    vehicleDetails: VehicleDetails | null;
    vehicleShippingMethod: ShippingMethod | null;
    vehicleQuote: Quote | null;
    vehicleComplianceDocs: ComplianceDoc[];
    vehicleBookingId: string | null;
    
    // Bulk & Charter Service
    currentBulkStep: number;
    bulkDetails: BulkDetails | null;
    bulkQuote: Quote | null;
    bulkBookingId: string | null;

    // Airfreight Service
    currentAirfreightStep: number;
    airfreightDetails: AirfreightDetails | null;
    airfreightComplianceDocs: ComplianceDoc[];
    airfreightQuote: Quote | null;
    airfreightBookingId: string | null;
    
    // Railway Service
    currentRailwayStep: number;
    railwayDetails: RailwayDetails | null;
    railwayComplianceDocs: ComplianceDoc[];
    railwayQuote: Quote | null;
    railwayBookingId: string | null;

    // River Tug Service
    currentRiverTugStep: number;
    riverTugDetails: RiverTugDetails | null;
    riverTugComplianceDocs: ComplianceDoc[];
    riverTugQuote: Quote | null;
    riverTugBookingId: string | null;

    // Inland Service
    currentInlandStep: number;
    inlandDetails: InlandDetails | null;
    availableTrucks: Truck[];
    inlandSignatureDataUrl: string | null;

    // Warehouse Service
    currentWarehouseStep: number;
    warehouseDetails: WarehouseDetails | null;
    warehouseComplianceDocs: ComplianceDoc[];
    warehouseBookingId: string | null;
    
    // Trade Finance
    currentTradeFinanceStep: number;
    tradeFinanceProduct: string | null;
    tradeFinanceComplianceDocs: ComplianceDoc[];
    tradeFinanceAssessment: TradeFinanceAssessment | null;

    // Secure Trade
    currentSecureTradeStep: number;
    secureTradeDetails: SecureTradeDetails | null;
    secureTradeId: string | null;
    secureTradeFee: number;
    secureTradeTotalDeposit: number;

    // Generic Payment Context
    paymentContext: {
        service: Service;
        quote: Quote;
        shipmentId: string;
        origin: string | Address;
        destination: string | Address;
        addons: { name: string; cost: number }[];
    } | null;
    paymentClientSecret: string | null;
    
    // Promotions
    promotions: Promotion[];
    activePromotionInterval: number | null;
}

export let State: AppState = {
    api: null,
    currentPage: 'landing',
    currentService: null,
    isLoggedIn: false,
    currentUser: null,
    postLoginRedirectService: null,
    subscriptionTier: 'guest',
    aiLookupsRemaining: 0,
    currentCurrency: { code: 'USD', symbol: '$' },

    parcelOrigin: null,
    parcelDestination: null,
    parcelPickupType: 'pickup',
    parcelSelectedQuote: null,
    parcelInsuranceAdded: false,
    parcelDeclaredValue: 0,
    parcelInsuranceCost: 0,
    parcelPremiumTrackingAdded: false,
    parcelPremiumTrackingCost: 15.00,

    ecomProducts: [],
    ecomEditingProductId: null,
    ecomProductType: 'physical',
    ecomInitialView: null,
    ecomCurrentView: 'dashboard',
    ecomViewingProductId: null,
    
    currentBaggageStep: 'details',
    baggageDetails: null,
    baggageQuote: null,
    baggageInsuranceCost: 0,
    baggageTrackerCost: 0,

    currentFclStep: 1,
    fclDetails: null,
    fclQuote: null,
    fclComplianceDocs: [],
    fclFlashSlots: [],
    fclSlotIntervalId: null,
    fclBookingId: null,
    fclSignatureDataUrl: null,

    currentLclStep: 1,
    lclDetails: null,
    lclComplianceDocs: [],
    lclQuote: null,
    lclBookingId: null,

    currentVehicleStep: 1,
    vehicleDetails: null,
    vehicleShippingMethod: null,
    vehicleQuote: null,
    vehicleComplianceDocs: [],
    vehicleBookingId: null,
    
    currentBulkStep: 1,
    bulkDetails: null,
    bulkQuote: null,
    bulkBookingId: null,
    
    currentAirfreightStep: 1,
    airfreightDetails: null,
    airfreightComplianceDocs: [],
    airfreightQuote: null,
    airfreightBookingId: null,
    
    currentRailwayStep: 1,
    railwayDetails: null,
    railwayComplianceDocs: [],
    railwayQuote: null,
    railwayBookingId: null,

    currentRiverTugStep: 1,
    riverTugDetails: null,
    riverTugComplianceDocs: [],
    riverTugQuote: null,
    riverTugBookingId: null,

    currentInlandStep: 1,
    inlandDetails: null,
    availableTrucks: [],
    inlandSignatureDataUrl: null,
    
    currentWarehouseStep: 1,
    warehouseDetails: null,
    warehouseComplianceDocs: [],
    warehouseBookingId: null,
    
    currentTradeFinanceStep: 1,
    tradeFinanceProduct: null,
    tradeFinanceComplianceDocs: [],
    tradeFinanceAssessment: null,

    currentSecureTradeStep: 1,
    secureTradeDetails: null,
    secureTradeId: null,
    secureTradeFee: 0,
    secureTradeTotalDeposit: 0,

    paymentContext: null,
    paymentClientSecret: null,
    
    promotions: [],
    activePromotionInterval: null,
};


// --- STATE MANAGEMENT ---

export function setState(newState: Partial<AppState>) {
    State = { ...State, ...newState };
}

// --- RESET FUNCTIONS ---

export function resetParcelState() {
    setState({
        parcelOrigin: null,
        parcelDestination: null,
        parcelInitialWeight: undefined,
        parcelInitialLength: undefined,
        parcelInitialWidth: undefined,
        parcelInitialHeight: undefined,
        parcelPickupType: 'pickup',
        parcelSelectedQuote: null,
        parcelInsuranceAdded: false,
        parcelDeclaredValue: 0,
        parcelInsuranceCost: 0,
        parcelPremiumTrackingAdded: false,
    });
}

export function resetBaggageState() {
    setState({
        currentBaggageStep: 'details',
        baggageDetails: null,
        baggageQuote: null,
        baggageInsuranceCost: 0,
        baggageTrackerCost: 0,
    });
}

export function resetFclState() {
    setState({
        currentFclStep: 1,
        fclDetails: null,
        fclQuote: null,
        fclComplianceDocs: [],
        fclBookingId: null,
        fclSignatureDataUrl: null,
    });
}

export function resetLclState() {
    setState({
        currentLclStep: 1,
        lclDetails: null,
        lclQuote: null,
        lclBookingId: null,
        lclComplianceDocs: []
    });
}

export function resetVehicleState() {
    setState({
        currentVehicleStep: 1,
        vehicleDetails: null,
        vehicleShippingMethod: null,
        vehicleQuote: null,
        vehicleBookingId: null,
        vehicleComplianceDocs: [],
    });
}

export function resetBulkState() {
    setState({
        currentBulkStep: 1,
        bulkDetails: null,
        bulkQuote: null,
        bulkBookingId: null,
    });
}

export function resetAirfreightState() {
    setState({
        currentAirfreightStep: 1,
        airfreightDetails: null,
        airfreightQuote: null,
        airfreightBookingId: null,
        airfreightComplianceDocs: [],
    });
}

export function resetRailwayState() {
     setState({
        currentRailwayStep: 1,
        railwayDetails: null,
        railwayComplianceDocs: [],
        railwayQuote: null,
        railwayBookingId: null,
    });
}

export function resetRiverTugState() {
    setState({
        currentRiverTugStep: 1,
        riverTugDetails: null,
        riverTugComplianceDocs: [],
        riverTugQuote: null,
        riverTugBookingId: null,
    });
}

export function resetInlandState() {
    setState({
        currentInlandStep: 1,
        inlandDetails: null,
        availableTrucks: [],
        inlandSignatureDataUrl: null,
    });
}

export function resetWarehouseState() {
    setState({
        currentWarehouseStep: 1,
        warehouseDetails: null,
        warehouseComplianceDocs: [],
        warehouseBookingId: null,
    });
}


export function resetTradeFinanceState() {
    setState({
        currentTradeFinanceStep: 1,
        tradeFinanceProduct: null,
        tradeFinanceComplianceDocs: [],
        tradeFinanceAssessment: null,
    });
}

export function resetSecureTradeState() {
    setState({
        currentSecureTradeStep: 1,
        secureTradeDetails: null,
        secureTradeId: null,
        secureTradeFee: 0,
        secureTradeTotalDeposit: 0,
    });
}
