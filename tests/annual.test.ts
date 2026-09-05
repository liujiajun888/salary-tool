import { describe, it, expect } from 'vitest';
import { computeAnnual, type SalaryInput } from '../src/calc/annual';

const GOLDEN = {
  cityId: 'shanghai' as const,
  monthlySalary: 30000,
  salaryMonths: 13,
  bonus: 100000,
  hfRatio: 0.07,
  hfSupplementRatio: 0,
  specialDeductionMonthly: 0,
  customSocialBase: null,
  customHfBase: null,
};

describe('computeAnnual 金样本例：上海 30000 / 13 薪 / 年终奖 100000', () => {
  const r = computeAnnual(GOLDEN);

  it('推荐方案 A', () => expect(r.recommendedId).toBe('A'));

  it('三方案年度总个税', () => {
    expect(r.schemes.find((s) => s.id === 'A')!.totalTax).toBeCloseTo(41170);
    expect(r.schemes.find((s) => s.id === 'B')!.totalTax).toBeCloseTo(53230);
    expect(r.schemes.find((s) => s.id === 'C')!.totalTax).toBeCloseTo(43270);
  });

  it('年度总到手', () => expect(r.totals.netYear).toBeCloseTo(385830));

  it('逐月税额', () => {
    expect(r.monthlyRows.map((m) => m.tax)).toEqual([
      592.5, 837.5, 1975, 1975, 1975, 1975, 1975, 3375, 3950, 3950, 3950, 3950,
    ]);
  });

  it('逐月税后', () => {
    expect(r.monthlyRows[0].net).toBeCloseTo(24157.5);
    expect(r.monthlyRows[7].net).toBeCloseTo(21375);
    expect(r.monthlyRows[11].net).toBeCloseTo(20800);
  });

  it('奖金行（13 薪 900、年终奖 9790）', () => {
    expect(r.bonuses.map((b) => b.label)).toEqual(['13 薪', '年终奖']);
    expect(r.bonuses[0].tax).toBeCloseTo(900);
    expect(r.bonuses[1].tax).toBeCloseTo(9790);
  });

  it('社保公积金年度合计', () => {
    expect(r.totals.personalSocialYear).toBeCloseTo(37800);
    expect(r.totals.personalHfYear).toBeCloseTo(25200);
    expect(r.totals.employerSocialYear).toBeCloseTo(92736);
    expect(r.totals.employerHfYear).toBeCloseTo(25200);
    expect(r.totals.personalTotalYear).toBeCloseTo(63000);
  });
});

describe('computeAnnual 方案 B 更优的场景', () => {
  // 低薪 + 中等奖金：并入后累计应纳税所得额仍在 3% 档，远低于奖金单独计税的 10% 档
  // 注：plan 文档手算 604.71 时误将公积金基数也按社保下限 7546 clamp；
  // 按设计文档 §2.1（公积金上下限与社保不同，下限 2740），月薪 5000 → 公积金基数 5000，
  // 个人月缴 1142.33，B 方案个税 = (96001 − 12×6142.33) × 3% = 668.79
  const input = { ...GOLDEN, monthlySalary: 5000, bonus: 36001, salaryMonths: 12 };
  const r = computeAnnual(input);
  it('推荐 B', () => expect(r.recommendedId).toBe('B'));
  it('12 月税前含并入的年终奖', () => {
    expect(r.monthlyRows[11].gross).toBe(5000 + 36001);
  });
  it('B 总个税 668.79 且低于 A', () => {
    const b = r.schemes.find((s) => s.id === 'B')!;
    expect(b.totalTax).toBeCloseTo(668.79);
    expect(b.totalTax).toBeLessThan(r.schemes.find((s) => s.id === 'A')!.totalTax);
  });
});

describe('computeAnnual 无奖金', () => {
  const r = computeAnnual({ ...GOLDEN, salaryMonths: 12, bonus: 0 });
  it('三方案税额一致', () => {
    expect(new Set(r.schemes.map((s) => s.totalTax)).size).toBe(1);
  });
  it('无奖金行', () => expect(r.bonuses).toHaveLength(0));
});

describe('汇总与流水勾稽（spec §7.3）', () => {
  const check = (input: SalaryInput) => {
    const r = computeAnnual(input);
    const rowTax =
      r.monthlyRows.reduce((a, m) => a + m.tax, 0) +
      r.bonuses.reduce((a, b) => a + b.tax, 0);
    const rowNet =
      r.monthlyRows.reduce((a, m) => a + m.net, 0) +
      r.bonuses.reduce((a, b) => a + b.net, 0);
    expect(rowTax).toBeCloseTo(r.totals.taxYear, 2);
    expect(rowNet).toBeCloseTo(r.totals.netYear, 2);
    return r;
  };

  it('金样勾稽', () => check(GOLDEN));
  it('方案 B 更优场景勾稽', () =>
    check({ ...GOLDEN, monthlySalary: 5000, bonus: 36001, salaryMonths: 12 }));
  it('无奖金勾稽', () => check({ ...GOLDEN, salaryMonths: 12, bonus: 0 }));
  it('16 薪勾稽', () => check({ ...GOLDEN, salaryMonths: 16 }));
  it('杭州高薪 clamp 后勾稽', () => {
    const r = check({
      ...GOLDEN,
      cityId: 'hangzhou',
      monthlySalary: 50000,
      salaryMonths: 13,
      bonus: 100000,
    });
    expect(r.socialBase).toBe(25299);
    expect(r.hfBase).toBe(42151);
  });

  it('B 推荐且 13 薪行同时展示', () => {
    const r = computeAnnual({
      ...GOLDEN,
      monthlySalary: 5000,
      bonus: 36001,
      salaryMonths: 13,
    });
    expect(r.recommendedId).toBe('B');
    expect(r.bonuses.map((b) => b.label)).toEqual(['13 薪']);
    expect(r.monthlyRows[11].gross).toBe(5000 + 36001);
  });
});
