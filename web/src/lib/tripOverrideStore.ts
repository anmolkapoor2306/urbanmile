import { promises as fs } from 'fs';
import path from 'path';
import { sanitizeTripOverrides, type TripOverride } from '@/lib/tripOverrides';

const TRIP_OVERRIDE_FILE_PATH = path.join(process.cwd(), '.data', 'trip-overrides.json');

let tripOverrideCache: TripOverride[] | null = null;

export async function readTripOverrides(): Promise<TripOverride[]> {
  try {
    const fileContents = await fs.readFile(TRIP_OVERRIDE_FILE_PATH, 'utf8');
    const overrides = sanitizeTripOverrides(JSON.parse(fileContents));
    tripOverrideCache = overrides;
    return overrides;
  } catch (error) {
    if (isNodeFileError(error) && error.code === 'ENOENT') {
      return tripOverrideCache ?? [];
    }

    console.error('Read trip overrides error:', error);
    return tripOverrideCache ?? [];
  }
}

export async function writeTripOverrides(value: unknown): Promise<TripOverride[]> {
  const overrides = sanitizeTripOverrides(value);
  tripOverrideCache = overrides;

  await fs.mkdir(path.dirname(TRIP_OVERRIDE_FILE_PATH), { recursive: true });
  await fs.writeFile(TRIP_OVERRIDE_FILE_PATH, JSON.stringify(overrides, null, 2), 'utf8');

  return overrides;
}

function isNodeFileError(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(error && typeof error === 'object' && 'code' in error);
}
