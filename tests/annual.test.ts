import { describe, it, expect } from 'vitest';
import { CALCULATION_VERSION, computeAnnual, type SalaryInput } from '../src/calc/annual';
import { round2 } from '../src/calc/format';

const GOLDEN = {
  cityId: 'shanghai' as const,
  monthlySalary: 30000,
  salaryMonths: 13,
  bonus: 100000,
  signingBonus: 0,
  stockIncome: 0,
  hfRatio: 0.07,
  hfSupplementRatio: 0,
  specialDeductionMonthly: 0,
  customSocialBase: null,
  customHfBase: null,
};

const HANGZHOU_EXCESS = {
  ...GOLDEN,
  cityId: 'hangzhou' as const,
  monthlySalary: 10000,
  salaryMonths: 12,
  bonus: 0,
  hfRatio: 0.12,
  hfSupplementRatio: 0.09,
};

describe('computeAnnual 金样本例：上海 30000 / 13 薪 / 年终奖 100000', () => {
  const r = computeAnnual(GOLDEN);

  it('计算版本', () => expect(CALCULATION_VERSION).toBe('2026.09-v3'));
  it('推荐方案 A', () => expect(r.recommendedId).toBe('A'));

  it('两方案年度总个税', () => {
    expect(r.schemes).toHaveLength(2);
    expect(r.schemes.find((s) => s.id === 'A')!.totalTax).toBeCloseTo(46270);
    expect(r.schemes.find((s) => s.id === 'B')!.totalTax).toBeCloseTo(59830);
  });

  it('年度总到手', () => expect(r.totals.netYear).toBeCloseTo(380730));

  it('无股权时总收入即现金收入，股权字段全为 0', () => {
    expect(r.totals).toMatchObject({
      cashGrossYear: 490000,
      cashNetYear: 380730,
      stockGrossYear: 0,
      stockTaxYear: 0,
      stockNetYear: 0,
      recurringCashNetYear: 380730,
    });
    expect(r.totals.cashGrossYear).toBe(r.totals.grossYear);
    expect(r.totals.cashNetYear).toBe(r.totals.netYear);
    for (const scheme of r.schemes) {
      expect(scheme.stockNet).toBe(0);
      expect(scheme.cashNet).toBe(scheme.totalNet);
    }
  });

  it('12 月税额明细包含 13 薪且与流水一致', () => {
    expect(r.monthlyRows[11].taxDetail).toEqual({
      cumulativeGross: 390000,
      cumulativeDeduction: 123000,
      cumulativeTaxable: 267000,
      rate: 0.2,
      quickDeduction: 16920,
      cumulativeTax: 36480,
      priorTax: 26530,
      tax: 9950,
    });
  });

  it('13 薪并入 12 月工资（税前翻倍，带备注）', () => {
    expect(r.monthlyRows[11].gross).toBeCloseTo(60000);
    expect(r.monthlyRows[11].note).toBe('含 13 薪');
    expect(r.monthlyRows[0].note).toBeUndefined();
  });

  it('逐月税额（12 月含 13 薪后跳档）', () => {
    expect(r.monthlyRows.map((m) => m.tax)).toEqual([
      592.5, 837.5, 1975, 1975, 1975, 1975, 1975, 3375, 3950, 3950, 3950, 9950,
    ]);
  });

  it('逐月税后', () => {
    expect(r.monthlyRows[0].net).toBeCloseTo(24157.5);
    expect(r.monthlyRows[7].net).toBeCloseTo(21375);
    expect(r.monthlyRows[11].net).toBeCloseTo(44800);
  });

  it('奖金行仅年终奖（13 薪不再单独计税）', () => {
    expect(r.bonuses.map((b) => b.label)).toEqual(['年终奖']);
    expect(r.bonuses[0].tax).toBeCloseTo(9790);
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
  it('两方案税额一致，平局推荐 A', () => {
    expect(r.schemes).toHaveLength(2);
    expect(new Set(r.schemes.map((s) => s.totalTax)).size).toBe(1);
    expect(r.recommendedId).toBe('A');
  });
  it('无奖金行', () => expect(r.bonuses).toHaveLength(0));
});

describe('computeAnnual 公积金税前扣除与现金口径', () => {
  it('杭州 10000 / 12% + 9%：基本与补充共享限额，个人、单位分别计算', () => {
    const r = computeAnnual(HANGZHOU_EXCESS);
    expect(r.insurance.personal).toMatchObject({
      pension: 800, medical: 200, unemployment: 50, hfBasic: 1200, hfSupplement: 900,
    });
    expect(r.insurance.employer).toMatchObject({ hfBasic: 1200, hfSupplement: 900 });
    expect(r.housingFundTax).toEqual({
      monthlyLimit: 1200,
      personalDeductible: 1200,
      personalExcess: 900,
      employerTaxable: 900,
    });
    // (10000 + 900) × 12 − (5000 + 1050 + 1200) × 12 = 43800；
    // 年税 = 43800 × 10% − 2520 = 1860。
    expect(r.monthlyRows[11].taxDetail).toEqual({
      cumulativeGross: 130800,
      cumulativeDeduction: 87000,
      cumulativeTaxable: 43800,
      rate: 0.1,
      quickDeduction: 2520,
      cumulativeTax: 1860,
      priorTax: 1495,
      tax: 365,
    });
    expect(r.monthlyRows.map((m) => m.tax)).toEqual([
      109.5, 109.5, 109.5, 109.5, 109.5, 109.5, 109.5, 109.5, 109.5, 144.5, 365, 365,
    ]);
  });

  it('单位应税公积金不进入现金流水或总收入，个人实际缴费仍全额扣出现金', () => {
    const r = computeAnnual(HANGZHOU_EXCESS);
    for (const row of r.monthlyRows) {
      expect(row.gross).toBe(10000);
      expect(row.personalTotal).toBe(3150);
      expect(row.net).toBe(round2(10000 - 3150 - row.tax));
      expect(row.taxDetail.cumulativeGross - row.month * row.gross).toBe(row.month * 900);
    }
    expect(r.monthlyRows[0].net).toBe(6740.5);
    expect(r.monthlyRows[11].net).toBe(6485);
    // 现金到手 = 120000 − (1050 + 2100) × 12 − 1860 = 80340。
    expect(r.totals).toMatchObject({
      grossYear: 120000,
      cashGrossYear: 120000,
      personalSocialYear: 12600,
      personalHfYear: 25200,
      personalTotalYear: 37800,
      employerHfYear: 25200,
      taxYear: 1860,
      cashNetYear: 80340,
      netYear: 80340,
      recurringCashNetYear: 80340,
    });
    for (const scheme of r.schemes) {
      expect(scheme).toMatchObject({ totalTax: 1860, cashNet: 80340, totalNet: 80340 });
    }
  });

  it.each([
    { hfRatio: 0.12, hfSupplementRatio: 0 },
    { hfRatio: 0.07, hfSupplementRatio: 0.05 },
    { hfRatio: 0.06, hfSupplementRatio: 0.06 },
  ])('合计恰好 12%（$hfRatio + $hfSupplementRatio）仍全额免税', (ratios) => {
    const r = computeAnnual({ ...HANGZHOU_EXCESS, ...ratios });
    expect(r.housingFundTax).toEqual({
      monthlyLimit: 1200, personalDeductible: 1200, personalExcess: 0, employerTaxable: 0,
    });
    expect(r.monthlyRows[11].taxDetail).toMatchObject({
      cumulativeGross: 120000, cumulativeDeduction: 87000, cumulativeTaxable: 33000,
    });
    expect(r.totals.taxYear).toBe(990);
    expect(r.totals.cashNetYear).toBe(92010);
  });

  it.each([
    { hfBase: 2746, basic: 192, supplement: 137, tax: 1825.2, net: 101626.8 },
    { hfBase: 2750, basic: 193, supplement: 138, tax: 1822.8, net: 101605.2 },
  ])('上海 7% + 5%、基数 $hfBase：分项取整后按实际缴存扣除，无虚假一元超限', ({ hfBase, basic, supplement, tax, net }) => {
    const r = computeAnnual({
      ...GOLDEN,
      monthlySalary: 10000,
      salaryMonths: 12,
      bonus: 0,
      hfSupplementRatio: 0.05,
      customHfBase: hfBase,
    });
    expect(r.insurance.personal).toMatchObject({ hfBasic: basic, hfSupplement: supplement });
    expect(r.housingFundTax).toEqual({
      monthlyLimit: 330,
      personalDeductible: basic + supplement,
      personalExcess: 0,
      employerTaxable: 0,
    });
    expect(r.monthlyRows[11].taxDetail.cumulativeGross).toBe(120000);
    expect(r.monthlyRows[11].taxDetail.cumulativeDeduction).toBe((5000 + 1050 + basic + supplement) * 12);
    expect(r.totals.taxYear).toBe(tax);
    expect(r.totals.cashNetYear).toBe(net);
  });

  it.each([
    { customHfBase: 0, hfBase: 2660, monthlyLimit: 319, excess: 239 },
    { customHfBase: 100000, hfBase: 42151, monthlyLimit: 5058, excess: 3794 },
  ])('税前限额使用 clamp 后的基数 $hfBase 并取整到元', ({ customHfBase, hfBase, monthlyLimit, excess }) => {
    const r = computeAnnual({ ...HANGZHOU_EXCESS, customHfBase });
    expect(r.hfBase).toBe(hfBase);
    expect(r.housingFundTax).toEqual({
      monthlyLimit,
      personalDeductible: monthlyLimit,
      personalExcess: excess,
      employerTaxable: excess,
    });
  });

  it('方案 B 推荐时也纳入单位超额计税，但并入的年终奖流水仍为现金', () => {
    const r = computeAnnual({ ...HANGZHOU_EXCESS, monthlySalary: 5000, bonus: 36001 });
    expect(r.housingFundTax).toEqual({
      monthlyLimit: 600, personalDeductible: 600, personalExcess: 450, employerTaxable: 450,
    });
    expect(r.recommendedId).toBe('B');
    // B 应税 = (5000 + 450) × 12 + 36001 − (5000 + 525 + 600) × 12 = 27901。
    expect(r.monthlyRows[11].taxDetail).toMatchObject({
      cumulativeGross: 101401,
      cumulativeDeduction: 73500,
      cumulativeTaxable: 27901,
      cumulativeTax: 837.03,
    });
    expect(r.monthlyRows[11]).toMatchObject({ gross: 41001, net: 38588.97, note: '含年终奖' });
    expect(r.bonuses).toHaveLength(0);
    expect(r.schemes[0]).toMatchObject({ id: 'A', totalTax: 3390.1, cashNet: 73710.9 });
    expect(r.schemes[1]).toMatchObject({ id: 'B', totalTax: 837.03, cashNet: 76263.97 });
    expect(r.totals).toMatchObject({ cashGrossYear: 96001, cashNetYear: 76263.97, netYear: 76263.97 });
  });

  it.each([0, 100000])('股权 %i：移除签字费重算保留超限税务处理，并从 A 重选 B', (stockIncome) => {
    const input = {
      ...HANGZHOU_EXCESS, monthlySalary: 5000, bonus: 36001, signingBonus: 50000, stockIncome,
    };
    const r = computeAnnual(input);
    const recurring = computeAnnual({ ...input, signingBonus: 0 });
    expect(r.recommendedId).toBe('A');
    expect(recurring.recommendedId).toBe('B');
    expect(r.housingFundTax).toEqual(recurring.housingFundTax);
    expect(r.monthlyRows[11].gross).toBe(55000);
    expect(r.totals.taxYear - r.totals.stockTaxYear).toBeCloseTo(5060.1, 2);
    expect(r.totals.cashNetYear).toBe(122040.9);
    expect(r.totals.recurringCashNetYear).toBe(76263.97);
    expect(r.totals.recurringCashNetYear).toBe(recurring.totals.cashNetYear);
    expect(r.totals.recurringCashNetYear).toBeGreaterThan(recurring.schemes[0].cashNet);
    expect(r.totals.recurringCashNetYear).not.toBe(r.totals.cashNetYear - input.signingBonus);
    expect(input.signingBonus).toBe(50000);
  });
});

describe('computeAnnual 签字费并入 12 月', () => {
  it('12 薪 + 签字费 50000：并入 12 月工资计税', () => {
    const r = computeAnnual({ ...GOLDEN, salaryMonths: 12, bonus: 0, signingBonus: 50000 });
    expect(r.monthlyRows[11].gross).toBeCloseTo(80000);
    expect(r.monthlyRows[11].note).toBe('含签字费');
    expect(r.monthlyRows[0].note).toBeUndefined();
    expect(r.monthlyRows[11].tax).toBeCloseTo(13950);
    expect(r.totals.taxYear).toBeCloseTo(40480);
    expect(r.totals.netYear).toBeCloseTo(306520);
  });

  it('金样 + 签字费 50000：与 13 薪同时并入，备注合并显示', () => {
    const r = computeAnnual({ ...GOLDEN, signingBonus: 50000 });
    expect(r.monthlyRows[11].gross).toBeCloseTo(110000);
    expect(r.monthlyRows[11].note).toBe('含 13 薪、签字费');
    expect(r.monthlyRows[11].tax).toBeCloseTo(20800);
    expect(r.schemes.find((s) => s.id === 'A')!.totalTax).toBeCloseTo(57120);
    expect(r.schemes.find((s) => s.id === 'B')!.totalTax).toBeCloseTo(72330);
    expect(r.recommendedId).toBe('A');
    expect(r.totals.netYear).toBeCloseTo(419880);
    expect(r.totals.recurringCashNetYear).toBe(380730);
    expect(r.totals.recurringCashNetYear).toBe(computeAnnual(GOLDEN).totals.cashNetYear);
    expect(r.totals.recurringCashNetYear).not.toBe(r.totals.cashNetYear - 50000);
  });

  it.each([0, 100000])('股权 %i：移除签字费后从 A 重选为 B', (stockIncome) => {
    const input = {
      ...GOLDEN,
      monthlySalary: 5000,
      salaryMonths: 12,
      bonus: 36001,
      signingBonus: 50000,
      stockIncome,
    };
    const r = computeAnnual(input);
    const recurring = computeAnnual({ ...input, signingBonus: 0 });
    expect(r.recommendedId).toBe('A');
    expect(recurring.recommendedId).toBe('B');
    expect(r.totals.cashNetYear).toBe(127793.74);
    expect(r.totals.recurringCashNetYear).toBe(81624.25);
    expect(r.totals.recurringCashNetYear).toBe(recurring.totals.cashNetYear);
    expect(r.totals.recurringCashNetYear).toBeGreaterThan(
      recurring.schemes.find((s) => s.id === 'A')!.cashNet,
    );
    expect(r.totals.recurringCashNetYear).not.toBe(r.totals.cashNetYear - input.signingBonus);
    expect(input.signingBonus).toBe(50000);
  });

  it('签字费为 0 时行为不变（无备注）', () => {
    const r = computeAnnual({ ...GOLDEN, salaryMonths: 12, bonus: 0 });
    expect(r.monthlyRows[11].note).toBeUndefined();
    expect(r.monthlyRows[11].gross).toBeCloseTo(30000);
  });
});

describe('computeAnnual 股票/股权激励', () => {
  const r = computeAnnual({ ...GOLDEN, stockIncome: 100000 });

  it('股票行单独计税（年度税率表，100000 → 7480）', () => {
    const row = r.bonuses.find((b) => b.label === '股票/股权激励')!;
    expect(row.gross).toBeCloseTo(100000);
    expect(row.tax).toBeCloseTo(7480);
    expect(row.taxMethod).toBe('annual');
  });

  it('年终奖行标记月度税率表计税方式', () => {
    const row = r.bonuses.find((b) => b.label === '年终奖')!;
    expect(row.taxMethod).toBe('monthly');
  });

  it('两方案都叠加股票税，A 的流水保留年终奖行', () => {
    expect(r.bonuses.map((b) => b.label)).toEqual(['年终奖', '股票/股权激励']);
    expect(r.schemes.find((s) => s.id === 'A')!.totalTax).toBeCloseTo(53750);
    expect(r.schemes.find((s) => s.id === 'B')!.totalTax).toBeCloseTo(67310);
  });

  it('年度总包与到手包含股票，现金和股权分别扣税', () => {
    expect(r.totals.grossYear).toBeCloseTo(590000);
    expect(r.totals.netYear).toBeCloseTo(473250);
    expect(r.totals).toMatchObject({
      cashGrossYear: 490000,
      cashNetYear: 380730,
      stockGrossYear: 100000,
      stockTaxYear: 7480,
      stockNetYear: 92520,
      recurringCashNetYear: 380730,
    });
    expect(r.schemes.map((s) => s.cashNet)).toEqual([380730, 367170]);
    expect(r.schemes.map((s) => s.stockNet)).toEqual([92520, 92520]);
  });

  it.each([
    { label: '推荐 A', input: GOLDEN },
    { label: '推荐 B', input: { ...GOLDEN, monthlySalary: 5000, salaryMonths: 12, bonus: 36001 } },
  ])('$label 时增添股权不影响现金税后及推荐方案', ({ input }) => {
    const cashOnly = computeAnnual(input);
    const withStock = computeAnnual({ ...input, stockIncome: 100000 });
    expect(withStock.recommendedId).toBe(cashOnly.recommendedId);
    expect(withStock.monthlyRows).toEqual(cashOnly.monthlyRows);
    expect(withStock.totals.cashGrossYear).toBe(cashOnly.totals.cashGrossYear);
    expect(withStock.totals.cashNetYear).toBe(cashOnly.totals.cashNetYear);
    expect(withStock.totals.recurringCashNetYear).toBe(cashOnly.totals.cashNetYear);
    expect(withStock.totals.taxYear - withStock.totals.stockTaxYear)
      .toBeCloseTo(cashOnly.totals.taxYear, 2);
    for (const scheme of withStock.schemes) {
      const cashScheme = cashOnly.schemes.find((s) => s.id === scheme.id)!;
      expect(scheme.cashNet).toBe(cashScheme.cashNet);
      expect(scheme.stockNet).toBe(92520);
      expect(scheme.totalNet).toBe(round2(scheme.cashNet + scheme.stockNet));
      expect(scheme.totalTax).toBe(round2(cashScheme.totalTax + 7480));
    }
  });

  it('股票为 0 时无股票行', () => {
    const r0 = computeAnnual({ ...GOLDEN, stockIncome: 0 });
    expect(r0.bonuses.some((b) => b.label === '股票/股权激励')).toBe(false);
  });
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
    const cashBonuses = r.bonuses.filter((b) => b.taxMethod === 'monthly');
    const stockRows = r.bonuses.filter((b) => b.taxMethod === 'annual');
    const cashTax = r.monthlyRows.reduce((a, m) => a + m.tax, 0)
      + cashBonuses.reduce((a, b) => a + b.tax, 0);
    expect(r.monthlyRows.reduce((a, m) => a + m.gross, 0)
      + cashBonuses.reduce((a, b) => a + b.gross, 0)).toBeCloseTo(r.totals.cashGrossYear, 2);
    expect(r.monthlyRows.reduce((a, m) => a + m.net, 0)
      + cashBonuses.reduce((a, b) => a + b.net, 0)).toBeCloseTo(r.totals.cashNetYear, 2);
    expect(stockRows.reduce((a, b) => a + b.gross, 0)).toBeCloseTo(r.totals.stockGrossYear, 2);
    expect(stockRows.reduce((a, b) => a + b.tax, 0)).toBeCloseTo(r.totals.stockTaxYear, 2);
    expect(stockRows.reduce((a, b) => a + b.net, 0)).toBeCloseTo(r.totals.stockNetYear, 2);
    expect(r.totals.cashNetYear).toBe(round2(
      r.totals.cashGrossYear - r.totals.personalTotalYear - cashTax,
    ));
    expect(r.totals.stockNetYear).toBe(round2(r.totals.stockGrossYear - r.totals.stockTaxYear));
    expect(r.totals.grossYear).toBe(round2(r.totals.cashGrossYear + r.totals.stockGrossYear));
    expect(r.totals.netYear).toBe(round2(r.totals.cashNetYear + r.totals.stockNetYear));
    const recommended = r.schemes.find((s) => s.id === r.recommendedId)!;
    expect(recommended.cashNet).toBe(r.totals.cashNetYear);
    expect(recommended.stockNet).toBe(r.totals.stockNetYear);
    for (const scheme of r.schemes) {
      expect(scheme.totalNet).toBe(round2(scheme.cashNet + scheme.stockNet));
      expect(scheme.totalNet).toBe(round2(
        r.totals.grossYear - r.totals.personalTotalYear - scheme.totalTax,
      ));
    }

    let cumulativeGross = 0;
    let cumulativeDeduction = 0;
    let priorTax = 0;
    for (const row of r.monthlyRows) {
      cumulativeGross += row.gross + r.housingFundTax.employerTaxable;
      cumulativeDeduction += 5000 + row.personalTotal - r.housingFundTax.personalExcess
        + input.specialDeductionMonthly;
      const detail = row.taxDetail;
      expect(detail.cumulativeGross).toBeCloseTo(cumulativeGross, 2);
      expect(detail.cumulativeDeduction).toBeCloseTo(cumulativeDeduction, 2);
      expect(detail.cumulativeTaxable).toBeCloseTo(Math.max(0, cumulativeGross - cumulativeDeduction), 2);
      expect(detail.cumulativeTax).toBe(round2(
        detail.cumulativeTaxable * detail.rate - detail.quickDeduction,
      ));
      expect(detail.priorTax).toBe(priorTax);
      expect(detail.tax).toBe(round2(Math.max(0, detail.cumulativeTax - priorTax)));
      expect(row.tax).toBe(detail.tax);
      expect(row.net).toBe(round2(row.gross - row.personalTotal - row.tax));
      priorTax = round2(priorTax + row.tax);
    }
    return r;
  };

  it('金样勾稽', () => check(GOLDEN));
  it('方案 B 更优场景勾稽', () =>
    check({ ...GOLDEN, monthlySalary: 5000, bonus: 36001, salaryMonths: 12 }));
  it('无奖金勾稽', () => check({ ...GOLDEN, salaryMonths: 12, bonus: 0 }));
  it('16 薪勾稽', () => check({ ...GOLDEN, salaryMonths: 16 }));
  it('杭州 12% + 9% 公积金超限金样勾稽', () => check(HANGZHOU_EXCESS));
  it('公积金超限方案 A 含额外月薪、签字费、股权、专项扣除及小数输入勾稽', () => {
    const r = check({
      ...HANGZHOU_EXCESS,
      monthlySalary: 10000.678,
      salaryMonths: 13,
      bonus: 100000.885,
      signingBonus: 50000.555,
      stockIncome: 100000.555,
      specialDeductionMonthly: 500.25,
    });
    expect(r.recommendedId).toBe('A');
  });
  it('公积金超限方案 B 含额外月薪、签字费和股权勾稽', () => {
    const r = check({
      ...HANGZHOU_EXCESS,
      monthlySalary: 5000,
      salaryMonths: 13,
      bonus: 36001,
      signingBonus: 1500,
      stockIncome: 100000,
    });
    expect(r.recommendedId).toBe('B');
  });
  it('方案 A 含签字费、股权、专项扣除和小数输入勾稽', () => check({
    ...GOLDEN,
    monthlySalary: 30000.678,
    bonus: 100000.885,
    signingBonus: 50000.555,
    stockIncome: 100000.555,
    specialDeductionMonthly: 1500.25,
  }));
  it('方案 B 含股权勾稽', () => check({
    ...GOLDEN,
    monthlySalary: 5000,
    salaryMonths: 12,
    bonus: 36001,
    stockIncome: 100000,
  }));
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

  it('B 推荐时 13 薪并入 12 月工资，备注含年终奖', () => {
    const r = computeAnnual({
      ...GOLDEN,
      monthlySalary: 5000,
      bonus: 36001,
      salaryMonths: 13,
    });
    expect(r.recommendedId).toBe('B');
    expect(r.monthlyRows[11].gross).toBe(5000 + 5000 + 36001);
    expect(r.monthlyRows[11].note).toBe('含 13 薪、年终奖');
    expect(r.bonuses).toHaveLength(0);
  });

  it('方案 A 推荐时备注不含年终奖（年终奖单独成行）', () => {
    const r = computeAnnual(GOLDEN);
    expect(r.recommendedId).toBe('A');
    expect(r.monthlyRows[11].note).toBe('含 13 薪');
  });

  it('3 位小数输入在入口取整后仍勾稽', () => {
    const r = computeAnnual({ ...GOLDEN, salaryMonths: 12, monthlySalary: 12345.678, bonus: 88888.885 });
    const rowGross =
      r.monthlyRows.reduce((a, m) => a + m.gross, 0) +
      r.bonuses.reduce((a, b) => a + b.gross, 0);
    expect(rowGross).toBeCloseTo(r.totals.grossYear, 2);
    expect(r.totals.grossYear).toBeCloseTo(2 * 12345.68 + 10 * 12345.68 + 88888.89, 2);
  });
});
