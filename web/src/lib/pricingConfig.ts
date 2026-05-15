import prisma from '@/lib/prisma';
import {
  DEFAULT_PRICING_ENGINE_CONFIG,
  PRICING_VEHICLE_TYPES,
  type PricingEngineConfig,
  type PricingVehicleType,
} from '@/lib/pricingEngine';

type PricingConfigUpdate = Partial<Omit<PricingEngineConfig, 'fuelEconomyKmpl'>> & {
  fuelEconomyKmpl?: Partial<Record<PricingVehicleType, number>>;
};

export async function getPricingConfig(): Promise<PricingEngineConfig> {
  const [config, fuelEconomies] = await prisma.$transaction(async (tx) => {
    const pricingConfig = await tx.pricingConfig.upsert({
      where: { singletonKey: 'default' },
      update: {},
      create: { singletonKey: 'default' },
    });

    await Promise.all(
      PRICING_VEHICLE_TYPES.map((vehicleType) =>
        tx.vehicleFuelEconomy.upsert({
          where: { vehicleType },
          update: {},
          create: {
            vehicleType,
            kmPerLiter: DEFAULT_PRICING_ENGINE_CONFIG.fuelEconomyKmpl[vehicleType],
          },
        })
      )
    );

    const nextFuelEconomies = await tx.vehicleFuelEconomy.findMany();
    return [pricingConfig, nextFuelEconomies] as const;
  });

  const fuelEconomyKmpl = { ...DEFAULT_PRICING_ENGINE_CONFIG.fuelEconomyKmpl };

  for (const fuelEconomy of fuelEconomies) {
    if (isPricingVehicleType(fuelEconomy.vehicleType)) {
      fuelEconomyKmpl[fuelEconomy.vehicleType] = Number(fuelEconomy.kmPerLiter);
    }
  }

  return {
    fuelPricePerLiter: Number(config.fuelPricePerLiter),
    maintenanceCostPerKm: Number(config.maintenanceCostPerKm),
    platformCharges: Number(config.platformCharges),
    profitMarginPercent: Number(config.profitMarginPercent),
    driverMonthlySalary: Number(config.driverMonthlySalary),
    carMonthlyEmi: Number(config.carMonthlyEmi),
    annualPermitCost: Number(config.annualPermitCost),
    annualInsuranceCost: Number(config.annualInsuranceCost),
    monthlyOperationalKm: Number(config.monthlyOperationalKm),
    annualOperationalKm: Number(config.annualOperationalKm),
    defaultOneWayTollCost: Number(config.defaultOneWayTollCost),
    defaultRoundTripTollCost:
      config.defaultRoundTripTollCost === null ? null : Number(config.defaultRoundTripTollCost),
    fuelEconomyKmpl,
  };
}

export async function updatePricingConfig(update: PricingConfigUpdate): Promise<PricingEngineConfig> {
  const data = toPricingConfigUpdateData(update);

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) {
      await tx.pricingConfig.upsert({
        where: { singletonKey: 'default' },
        update: data,
        create: {
          singletonKey: 'default',
          ...data,
        },
      });
    } else {
      await tx.pricingConfig.upsert({
        where: { singletonKey: 'default' },
        update: {},
        create: { singletonKey: 'default' },
      });
    }

    await Promise.all(
      PRICING_VEHICLE_TYPES.map((vehicleType) => {
        const kmPerLiter = update.fuelEconomyKmpl?.[vehicleType];

        return tx.vehicleFuelEconomy.upsert({
          where: { vehicleType },
          update:
            typeof kmPerLiter === 'number' && Number.isFinite(kmPerLiter) && kmPerLiter > 0
              ? { kmPerLiter }
              : {},
          create: {
            vehicleType,
            kmPerLiter:
              typeof kmPerLiter === 'number' && Number.isFinite(kmPerLiter) && kmPerLiter > 0
                ? kmPerLiter
                : DEFAULT_PRICING_ENGINE_CONFIG.fuelEconomyKmpl[vehicleType],
          },
        });
      })
    );
  });

  return getPricingConfig();
}

function toPricingConfigUpdateData(update: PricingConfigUpdate) {
  return compactObject({
    fuelPricePerLiter: positiveOrUndefined(update.fuelPricePerLiter),
    maintenanceCostPerKm: nonNegativeOrUndefined(update.maintenanceCostPerKm),
    platformCharges: nonNegativeOrUndefined(update.platformCharges),
    profitMarginPercent: nonNegativeOrUndefined(update.profitMarginPercent),
    driverMonthlySalary: nonNegativeOrUndefined(update.driverMonthlySalary),
    carMonthlyEmi: nonNegativeOrUndefined(update.carMonthlyEmi),
    annualPermitCost: nonNegativeOrUndefined(update.annualPermitCost),
    annualInsuranceCost: nonNegativeOrUndefined(update.annualInsuranceCost),
    monthlyOperationalKm: positiveOrUndefined(update.monthlyOperationalKm),
    annualOperationalKm: positiveOrUndefined(update.annualOperationalKm),
    defaultOneWayTollCost: nonNegativeOrUndefined(update.defaultOneWayTollCost),
    defaultRoundTripTollCost:
      update.defaultRoundTripTollCost === null
        ? null
        : nonNegativeOrUndefined(update.defaultRoundTripTollCost),
  });
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;
}

function positiveOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}

function nonNegativeOrUndefined(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function isPricingVehicleType(value: string): value is PricingVehicleType {
  return PRICING_VEHICLE_TYPES.includes(value as PricingVehicleType);
}
