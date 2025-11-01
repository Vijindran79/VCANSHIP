// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
export interface MarkupConfig {
    parcel: { standard: number; express: number };
    baggage: { standard: number; express: number };
    airfreight: { standard: number; priority: number; charter: number };
    fcl: { standard: number };
    lcl: { standard: number; priority: number; express: number };
    vehicle: { standard: number };
    bulk: { commission: number };
    railway: { standard: number; express: number };
    rivertug: { standard: number };
    inland: { standard: number };
    warehousing: { standard: number };
    ecommerce: { commission: number };
    trade_finance: { min_fee: number; max_fee: number };
}

export const MARKUP_CONFIG: MarkupConfig = {
    parcel: { standard: 0.18, express: 0.30 }, // 18% - 30%
    baggage: { standard: 0.20, express: 0.35 }, // 20% - 35%
    airfreight: { standard: 0.20, priority: 0.35, charter: 0.15 }, // 20% - 35%
    fcl: { standard: 0.12 }, // 12%
    lcl: { standard: 0.25, priority: 0.35, express: 0.45 }, // 25% - 45%
    vehicle: { standard: 0.15 }, // 15%
    bulk: { commission: 0.04 }, // 4%
    railway: { standard: 0.15, express: 0.28 }, // 15% - 28%
    rivertug: { standard: 0.15 }, // 15%
    inland: { standard: 0.18 }, // 18%
    warehousing: { standard: 0.30 }, // 30%
    ecommerce: { commission: 0.15 }, // 15%
    trade_finance: { min_fee: 1.5, max_fee: 3.0 }, // 1.5% - 3.0%
};