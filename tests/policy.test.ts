import { describe, it, expect } from 'vitest';
import { CITY_LIST, TAX_SOURCES } from '../src/policy';

describe('policy 参数完整性', () => {
  it('全国税收规则附有官方来源与适用范围', () => {
    expect(TAX_SOURCES.length).toBeGreaterThanOrEqual(3);
    for (const source of TAX_SOURCES) {
      expect(new URL(source.url).protocol).toBe('https:');
      expect(new URL(source.url).hostname.endsWith('.gov.cn')).toBe(true);
      expect(source.title).not.toBe('');
      expect(source.scope).not.toBe('');
    }
  });
  it.each(CITY_LIST)('$name ($id)', (p) => {
    expect(p.year).toBe(2026);
    expect(p.dataVersion).toContain(p.id);
    expect(p.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.coverage).not.toBe('');
    expect(p.sources.length).toBeGreaterThan(0);
    for (const source of p.sources) {
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.period).not.toBe('');
      expect(['unverified', 'verified']).toContain(source.status);
    }
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
