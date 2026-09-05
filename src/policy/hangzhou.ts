import type { CityPolicy } from './types';

export const HANGZHOU_2026: CityPolicy = {
  id: 'hangzhou',
  name: '杭州',
  year: 2026,
  social: {
    minBase: 4986,
    maxBase: 25299,
    personal: { pension: 0.08, medical: 0.02, unemployment: 0.005, workInjury: 0 },
    employer: { pension: 0.16, medical: 0.095, unemployment: 0.005, workInjury: 0.004 },
  },
  housingFund: {
    minBase: 2660,
    maxBase: 42151,
    ratioOptions: [0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12],
    defaultRatio: 0.12,
    supplementOptions: [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09],
  },
};
