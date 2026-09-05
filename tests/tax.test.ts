import { describe, it, expect } from 'vitest';
import { cumulativeTax, bonusTax, withhold } from '../src/calc/tax';

describe('cumulativeTax 综合所得年度税率表', () => {
  it('3% 档', () => expect(cumulativeTax(19750)).toBeCloseTo(592.5));
  it('10% 档上边界', () => expect(cumulativeTax(144000)).toBeCloseTo(11880));
  it('20% 档', () => expect(cumulativeTax(237000)).toBeCloseTo(30480));
  it('25% 档', () => expect(cumulativeTax(337000)).toBeCloseTo(52330));
  it('0 与负数为 0', () => {
    expect(cumulativeTax(0)).toBe(0);
    expect(cumulativeTax(-100)).toBe(0);
  });
});

describe('bonusTax 全年一次性奖金（月度税率表）', () => {
  it('2500/月 落 3% 档', () => expect(bonusTax(30000)).toBeCloseTo(900));
  it('36000 边界', () => expect(bonusTax(36000)).toBeCloseTo(1080));
  it('36001 跳 10% 档', () => expect(bonusTax(36001)).toBeCloseTo(3390.1));
  it('100000', () => expect(bonusTax(100000)).toBeCloseTo(9790));
  it('0 为 0', () => expect(bonusTax(0)).toBe(0));
});

describe('withhold 累计预扣法', () => {
  const months = Array.from({ length: 12 }, () => ({
    gross: 30000,
    personalDeduction: 5250,
    specialDeduction: 0,
  }));

  it('金样逐月税额（前低后高）', () => {
    expect(withhold(months)).toEqual([
      592.5, 837.5, 1975, 1975, 1975, 1975, 1975, 3375, 3950, 3950, 3950, 3950,
    ]);
  });

  it('年终奖并入 12 月后重算', () => {
    const withBonus = months.map((m, i) =>
      i === 11 ? { ...m, gross: m.gross + 100000 } : m,
    );
    const taxes = withhold(withBonus);
    expect(taxes[11]).toBeCloseTo(25800);
    expect(taxes.reduce((a, b) => a + b, 0)).toBeCloseTo(52330);
  });

  it('专项附加扣除进入累计减除', () => {
    const withDeduct = months.map((m) => ({ ...m, specialDeduction: 1500 }));
    // 年应纳税所得额 = 360000 - 60000 - 63000 - 18000 = 219000 → 20% 档
    const taxes = withhold(withDeduct);
    expect(taxes.reduce((a, b) => a + b, 0)).toBeCloseTo(219000 * 0.2 - 16920);
  });
});
