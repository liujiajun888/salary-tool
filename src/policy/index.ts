import type { CityId, CityPolicy } from './types';
import { SHANGHAI_2026 } from './shanghai';
import { HANGZHOU_2026 } from './hangzhou';

export const CITIES: Record<CityId, CityPolicy> = {
  shanghai: SHANGHAI_2026,
  hangzhou: HANGZHOU_2026,
};

export const CITY_LIST: CityPolicy[] = Object.values(CITIES);

export type { CityId, CityPolicy } from './types';
