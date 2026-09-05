import { describe, it, expect } from 'vitest';
import { ANNUAL_BRACKETS, MONTHLY_BRACKETS, cumulativeTax, bonusTax, withhold } from '../src/calc/tax';

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

describe('税率表连续性（速算扣除数自洽）', () => {
  // 相邻档位在 limit 处税额必须相等：limit×rate_lo − qd_lo == limit×rate_hi − qd_hi
  // 可一次性发现 limit/rate/quickDeduction 转置或写错
  it.each(ANNUAL_BRACKETS.slice(0, -1).map((b, i) => [b, ANNUAL_BRACKETS[i + 1]]))(
    '年度表 %j → %j 交界连续',
    (lo, hi) => {
      const fromBelow = lo.limit * lo.rate - lo.quickDeduction;
      const fromAbove = lo.limit * hi.rate - hi.quickDeduction;
      expect(Math.abs(fromBelow - fromAbove)).toBeLessThan(0.01);
    },
  );

  it.each(MONTHLY_BRACKETS.slice(0, -1).map((b, i) => [b, MONTHLY_BRACKETS[i + 1]]))(
    '月度表 %j → %j 交界连续',
    (lo, hi) => {
      const fromBelow = lo.limit * lo.rate - lo.quickDeduction;
      const fromAbove = lo.limit * hi.rate - hi.quickDeduction;
      expect(Math.abs(fromBelow - fromAbove)).toBeLessThan(0.01);
    },
  );
});

describe('表尾档位与 clamp 分支', () => {
  it('年度表最高档', () => expect(cumulativeTax(1000000)).toBeCloseTo(268080));
  it('月度表跳档后（144001 → 20% 档）', () => expect(bonusTax(144001)).toBeCloseTo(27390.2));
  it('月中扣扣除额激增时当月税为 0，后续月份补回', () => {
    const months = [
      { gross: 30000, personalDeduction: 10250, specialDeduction: 0 },
      { gross: 2000, personalDeduction: 1000, specialDeduction: 12000 },
      { gross: 60000, personalDeduction: 10000, specialDeduction: 0 },
    ];
    expect(withhold(months)).toEqual([442.5, 0, 1412.5]);
  });
});
