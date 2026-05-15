export const PRICING_VEHICLE_TYPES = ['SEDAN', 'SUV', 'PREMIUM'] as const;
export const PRICING_ROUTE_TYPES = ['ONE_WAY', 'ROUND_TRIP'] as const;

export type PricingVehicleType = (typeof PRICING_VEHICLE_TYPES)[number];
export type PricingRouteType = (typeof PRICING_ROUTE_TYPES)[number];

export type PricingEngineConfig = {
  fuelPricePerLiter: number;
  maintenanceCostPerKm: number;
  platformCharges: number;
  profitMarginPercent: number;
  driverMonthlySalary: number;
  carMonthlyEmi: number;
  annualPermitCost: number;
  annualInsuranceCost: number;
  monthlyOperationalKm: number;
  annualOperationalKm: number;
  defaultOneWayTollCost: number;
  defaultRoundTripTollCost: number | null;
  fuelEconomyKmpl: Record<PricingVehicleType, number>;
};

export type FareCalculationInput = {
  vehicleType: PricingVehicleType | string;
  routeType: PricingRouteType | string;
  distanceKm: number;
  tollCost?: number | null;
  roundTripTollCost?: number | null;
  config: PricingEngineConfig;
};

export type FareCalculationResult = {
  vehicleType: PricingVehicleType;
  routeType: PricingRouteType;
  oneWayDistanceKm: number;
  pricingDistanceKm: number;
  vehicleFuelEconomyKmpl: number;
  fuelPricePerLiter: number;
  fuelCost: number;
  maintenanceCost: number;
  driverCost: number;
  emiCost: number;
  permitCost: number;
  insuranceCost: number;
  tollCost: number;
  platformCharges: number;
  totalOperatingCost: number;
  profitMarginPercent: number;
  profitAmount: number;
  finalFare: number;
};

export class PricingEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingEngineError';
  }
}

export const DEFAULT_PRICING_ENGINE_CONFIG: PricingEngineConfig = {
  fuelPricePerLiter: 100,
  maintenanceCostPerKm: 4,
  platformCharges: 50,
  profitMarginPercent: 18,
  driverMonthlySalary: 28000,
  carMonthlyEmi: 22000,
  annualPermitCost: 25000,
  annualInsuranceCost: 32000,
  monthlyOperationalKm: 6000,
  annualOperationalKm: 72000,
  defaultOneWayTollCost: 250,
  defaultRoundTripTollCost: null,
  fuelEconomyKmpl: {
    SEDAN: 16,
    SUV: 12,
    PREMIUM: 10,
  },
};

export function calculateFare(input: FareCalculationInput): FareCalculationResult {
  const vehicleType = normalizePricingVehicleType(input.vehicleType);
  const routeType = normalizePricingRouteType(input.routeType);
  const config = input.config;
  const oneWayDistanceKm = toPositiveNumber(input.distanceKm, 'Distance must be greater than 0.');
  const pricingDistanceKm = routeType === 'ROUND_TRIP' ? oneWayDistanceKm * 2 : oneWayDistanceKm;
  const vehicleFuelEconomyKmpl = toPositiveNumber(
    config.fuelEconomyKmpl[vehicleType],
    'Fuel economy must be greater than 0.'
  );
  const fuelPricePerLiter = toPositiveNumber(
    config.fuelPricePerLiter,
    'Fuel price must be greater than 0.'
  );
  const maintenanceCostPerKm = toNonNegativeNumber(config.maintenanceCostPerKm);
  const platformCharges = toNonNegativeNumber(config.platformCharges);
  const profitMarginPercent = toNonNegativeNumber(config.profitMarginPercent);
  const monthlyOperationalKm = toPositiveNumber(
    config.monthlyOperationalKm,
    'Monthly operational km must be greater than 0.'
  );
  const annualOperationalKm = toPositiveNumber(
    config.annualOperationalKm,
    'Annual operational km must be greater than 0.'
  );
  const oneWayTollCost = toNonNegativeNumber(input.tollCost ?? config.defaultOneWayTollCost);
  const tollCost =
    routeType === 'ROUND_TRIP'
      ? toNonNegativeNumber(input.roundTripTollCost ?? config.defaultRoundTripTollCost ?? oneWayTollCost * 2)
      : oneWayTollCost;

  const fuelCost = (pricingDistanceKm / vehicleFuelEconomyKmpl) * fuelPricePerLiter;
  const maintenanceCost = pricingDistanceKm * maintenanceCostPerKm;
  const driverCost = pricingDistanceKm * (toNonNegativeNumber(config.driverMonthlySalary) / monthlyOperationalKm);
  const emiCost = pricingDistanceKm * (toNonNegativeNumber(config.carMonthlyEmi) / monthlyOperationalKm);
  const permitCost = pricingDistanceKm * (toNonNegativeNumber(config.annualPermitCost) / annualOperationalKm);
  const insuranceCost = pricingDistanceKm * (toNonNegativeNumber(config.annualInsuranceCost) / annualOperationalKm);
  const totalOperatingCost =
    fuelCost +
    maintenanceCost +
    driverCost +
    emiCost +
    permitCost +
    insuranceCost +
    tollCost +
    platformCharges;
  const profitAmount = totalOperatingCost * (profitMarginPercent / 100);

  return {
    vehicleType,
    routeType,
    oneWayDistanceKm: roundMoney(oneWayDistanceKm),
    pricingDistanceKm: roundMoney(pricingDistanceKm),
    vehicleFuelEconomyKmpl: roundMoney(vehicleFuelEconomyKmpl),
    fuelPricePerLiter: roundMoney(fuelPricePerLiter),
    fuelCost: roundMoney(fuelCost),
    maintenanceCost: roundMoney(maintenanceCost),
    driverCost: roundMoney(driverCost),
    emiCost: roundMoney(emiCost),
    permitCost: roundMoney(permitCost),
    insuranceCost: roundMoney(insuranceCost),
    tollCost: roundMoney(tollCost),
    platformCharges: roundMoney(platformCharges),
    totalOperatingCost: roundMoney(totalOperatingCost),
    profitMarginPercent: roundMoney(profitMarginPercent),
    profitAmount: roundMoney(profitAmount),
    finalFare: Math.round(totalOperatingCost + profitAmount),
  };
}

export function normalizePricingVehicleType(value: string): PricingVehicleType {
  const normalized = value.toUpperCase().trim();

  if (normalized === 'SEDAN') {
    return 'SEDAN';
  }

  if (normalized === 'SUV' || normalized === 'VAN') {
    return 'SUV';
  }

  if (normalized === 'PREMIUM' || normalized === 'LUXURY') {
    return 'PREMIUM';
  }

  throw new PricingEngineError('Invalid vehicle type.');
}

export function normalizePricingRouteType(value: string): PricingRouteType {
  const normalized = value.toUpperCase().replace(/\s+/g, '_').trim();

  if (normalized === 'ONE_WAY') {
    return 'ONE_WAY';
  }

  if (normalized === 'ROUND_TRIP') {
    return 'ROUND_TRIP';
  }

  throw new PricingEngineError('Invalid route type.');
}

function toPositiveNumber(value: unknown, message: string) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw new PricingEngineError(message);
  }

  return number;
}

function toNonNegativeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
