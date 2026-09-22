import { describe, it, expect } from 'vitest';
import { ANNUAL_BRACKETS, MONTHLY_BRACKETS, cumulativeTax, bonusTax, stockTax, withhold, withholdDetails } from '../src/calc/tax';
import { round2 } from '../src/calc/format';

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

  it.each(MONTHLY_BRACKETS.slice(0, -1).map((lo, i) => ({
    limit: lo.limit * 12,
    lo,
    hi: MONTHLY_BRACKETS[i + 1],
  })))('奖金 $limit 边界及上下 1 分选档正确', ({ limit, lo, hi }) => {
    for (const offset of [-0.01, 0, 0.01]) {
      const bonus = limit + offset;
      const bracket = offset > 0 ? hi : lo;
      expect(bonusTax(bonus)).toBeCloseTo(bonus * bracket.rate - bracket.quickDeduction, 6);
    }
  });
});

describe('stockTax 股票/股权激励（全额单独适用年度税率表）', () => {
  it('3% 档', () => expect(stockTax(36000)).toBeCloseTo(1080));
  it('10% 档（不除以 12）', () => expect(stockTax(100000)).toBeCloseTo(7480));
  it('20% 档', () => expect(stockTax(200000)).toBeCloseTo(23080));
  it('0 与负数为 0', () => {
    expect(stockTax(0)).toBe(0);
    expect(stockTax(-100)).toBe(0);
  });
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

  it('明细给出累计基数、税档、应纳税额与已缴税额', () => {
    const details = withholdDetails(months);
    expect(details).toHaveLength(12);
    expect(details.map((d) => d.tax)).toEqual(withhold(months));
    expect(details[0]).toEqual({
      cumulativeGross: 30000,
      cumulativeDeduction: 10250,
      cumulativeTaxable: 19750,
      rate: 0.03,
      quickDeduction: 0,
      cumulativeTax: 592.5,
      priorTax: 0,
      tax: 592.5,
    });
    expect(details[1]).toEqual({
      cumulativeGross: 60000,
      cumulativeDeduction: 20500,
      cumulativeTaxable: 39500,
      rate: 0.1,
      quickDeduction: 2520,
      cumulativeTax: 1430,
      priorTax: 592.5,
      tax: 837.5,
    });
    expect(details[11]).toEqual({
      cumulativeGross: 360000,
      cumulativeDeduction: 123000,
      cumulativeTaxable: 237000,
      rate: 0.2,
      quickDeduction: 16920,
      cumulativeTax: 30480,
      priorTax: 26530,
      tax: 3950,
    });
  });

  it('空月份返回空税额与明细', () => {
    expect(withhold([])).toEqual([]);
    expect(withholdDetails([])).toEqual([]);
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
    expect(withholdDetails(withDeduct)[11].cumulativeDeduction).toBe(141000);
  });

  it('小数输入累计基数不提前取整，税额与已缴税额按分勾稽', () => {
    const fractional = [
      { gross: 12345.678, personalDeduction: 1234.567, specialDeduction: 567.891 },
      { gross: 10.005, personalDeduction: 1000.115, specialDeduction: 20000.222 },
      { gross: 99999.995, personalDeduction: 3500.125, specialDeduction: 123.456 },
    ];
    const details = withholdDetails(fractional);
    expect(details.map((d) => d.tax)).toEqual(withhold(fractional));
    let gross = 0;
    let deduction = 0;
    let paid = 0;
    details.forEach((detail, i) => {
      gross += fractional[i].gross;
      deduction += 5000 + fractional[i].personalDeduction + fractional[i].specialDeduction;
      expect(detail.cumulativeGross).toBe(gross);
      expect(detail.cumulativeDeduction).toBe(deduction);
      expect(detail.cumulativeTaxable).toBe(Math.max(0, gross - deduction));
      expect(detail.cumulativeTax).toBe(round2(
        detail.cumulativeTaxable * detail.rate - detail.quickDeduction,
      ));
      expect(detail.priorTax).toBe(paid);
      expect(detail.tax).toBe(round2(Math.max(0, detail.cumulativeTax - paid)));
      paid = round2(paid + detail.tax);
    });
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

describe('withholdDetails 年度税档边界', () => {
  it.each(ANNUAL_BRACKETS.slice(0, -1).map((lo, i) => ({
    limit: lo.limit,
    lo,
    hi: ANNUAL_BRACKETS[i + 1],
  })))('应纳税所得额 $limit 边界及上下 1 分选档正确', ({ limit, lo, hi }) => {
    for (const offset of [-0.01, 0, 0.01]) {
      const taxable = limit + offset;
      const bracket = offset > 0 ? hi : lo;
      const tax = taxable * bracket.rate - bracket.quickDeduction;
      const months = [{ gross: taxable + 5000, personalDeduction: 0, specialDeduction: 0 }];
      const [detail] = withholdDetails(months);
      expect(detail).toEqual({
        cumulativeGross: taxable + 5000,
        cumulativeDeduction: 5000,
        cumulativeTaxable: taxable,
        rate: bracket.rate,
        quickDeduction: bracket.quickDeduction,
        cumulativeTax: round2(tax),
        priorTax: 0,
        tax: round2(tax),
      });
      expect(withhold(months)).toEqual([detail.tax]);
      expect(cumulativeTax(taxable)).toBeCloseTo(tax, 6);
      expect(stockTax(taxable)).toBeCloseTo(tax, 6);
    }
  });

  it.each([0, 5000])('收入 %i 不超过基本减除费用时税基与税额为 0', (gross) => {
    expect(withholdDetails([{ gross, personalDeduction: 0, specialDeduction: 0 }])).toEqual([{
      cumulativeGross: gross,
      cumulativeDeduction: 5000,
      cumulativeTaxable: 0,
      rate: 0.03,
      quickDeduction: 0,
      cumulativeTax: 0,
      priorTax: 0,
      tax: 0,
    }]);
  });
});

describe('表尾档位与 clamp 分支', () => {
  it('年度表最高档', () => expect(cumulativeTax(1000000)).toBeCloseTo(268080));
  it('月度表跳档后（144001 → 20% 档）', () => expect(bonusTax(144001)).toBeCloseTo(27390.2));
  it('月中扣除额激增时当月税为 0，后续月份补回', () => {
    const months = [
      { gross: 30000, personalDeduction: 10250, specialDeduction: 0 },
      { gross: 2000, personalDeduction: 1000, specialDeduction: 12000 },
      { gross: 60000, personalDeduction: 10000, specialDeduction: 0 },
    ];
    expect(withhold(months)).toEqual([442.5, 0, 1412.5]);
    const details = withholdDetails(months);
    expect(details.map((d) => d.tax)).toEqual([442.5, 0, 1412.5]);
    expect(details.map((d) => d.cumulativeTax)).toEqual([442.5, 0, 1855]);
    expect(details.map((d) => d.priorTax)).toEqual([0, 442.5, 442.5]);
  });
});
