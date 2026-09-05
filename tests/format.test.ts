import { describe, it, expect } from 'vitest';
import { round2, round0, formatMoney, formatPercent } from '../src/calc/format';

describe('rounding', () => {
  it('round2 到分', () => expect(round2(3150.005)).toBe(3150.01));
  it('round0 到元', () => expect(round0(528.22)).toBe(528));
  it('round2 浮点噪声', () => expect(round2(0.1 + 0.2)).toBe(0.3));
  it('round0 半分向上', () => expect(round0(290.5)).toBe(291));
  it('round2 零值', () => expect(round2(0)).toBe(0));
});

describe('formatting', () => {
  it('千分位两位小数', () => expect(formatMoney(385830)).toBe('385,830.00'));
  it('零值格式化', () => expect(formatMoney(0)).toBe('0.00'));
  it('百分比整数', () => expect(formatPercent(0.08)).toBe('8%'));
  it('百分比小数', () => expect(formatPercent(0.095)).toBe('9.5%'));
  it('工伤典型值', () => expect(formatPercent(0.0026)).toBe('0.26%'));
});
