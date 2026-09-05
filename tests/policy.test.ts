import { describe, it, expect } from 'vitest';
import { CITY_LIST } from '../src/policy';

describe('policy 参数完整性', () => {
  it.each(CITY_LIST)('$name ($id)', (p) => {
    expect(p.year).toBe(2026);
    expect(p.social.minBase).toBeLessThan(p.social.maxBase);
    expect(p.housingFund.minBase).toBeLessThan(p.housingFund.maxBase);
    for (const rate of [...Object.values(p.social.personal), ...Object.values(p.social.employer)]) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThan(1);
    }
    expect(p.social.personal.workInjury).toBe(0);
    expect(p.housingFund.ratioOptions).toContain(p.housingFund.defaultRatio);
    expect(p.housingFund.ratioOptions[p.housingFund.ratioOptions.length - 1]).toBe(p.housingFund.defaultRatio);
    expect(p.housingFund.supplementOptions[0]).toBe(0);
  });
});
