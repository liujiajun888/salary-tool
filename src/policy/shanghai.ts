import type { CityPolicy } from './types';

export const SHANGHAI_2026: CityPolicy = {
  id: 'shanghai',
  name: '上海',
  year: 2026,
  social: {
    minBase: 7546,
    maxBase: 37731,
    personal: { pension: 0.08, medical: 0.02, unemployment: 0.005, workInjury: 0 },
    employer: { pension: 0.16, medical: 0.09, unemployment: 0.005, workInjury: 0.0026 },
  },
  housingFund: {
    minBase: 2740,
    maxBase: 37731,
    ratioOptions: [0.05, 0.06, 0.07],
    defaultRatio: 0.07,
    supplementOptions: [0, 0.01, 0.02, 0.03, 0.04, 0.05],
  },
};
