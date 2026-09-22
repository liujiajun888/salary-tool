import { CITIES } from '../policy';
import type { CityId } from '../policy/types';
import { monthlyInsurance, resolveBase } from './social';
import type { InsuranceBreakdown } from './social';
import { bonusTax, stockTax, withholdDetails } from './tax';
import type { MonthInput, WithholdingDetail } from './tax';
import { round0, round2 } from './format';

export const CALCULATION_VERSION = '2026.09-v3';

export interface SalaryInput {
  cityId: CityId;
  monthlySalary: number;
  salaryMonths: number; // 12-16，超出 12 的部分（13/14 薪等）并入 12 月工资计税
  bonus: number;
  signingBonus: number; // 签字费，默认 0，有值时并入 12 月工资计税
  stockIncome: number; // 股票/股权激励，默认 0，全额单独适用年度税率表（不并入综合所得）
  hfRatio: number;
  hfSupplementRatio: number;
  specialDeductionMonthly: number;
  customSocialBase: number | null;
  customHfBase: number | null;
}

export interface MonthRow {
  month: number;
  gross: number;
  personalTotal: number;
  tax: number;
  taxDetail: WithholdingDetail;
  net: number;
  note?: string; // 如“含 13 薪”
}

export interface BonusRow {
  label: string;
  gross: number;
  tax: number;
  net: number;
  taxMethod: 'monthly' | 'annual'; // monthly=月度税率表单独计税，annual=年度税率表单独计税
}

export interface SchemeResult {
  id: 'A' | 'B';
  label: string;
  totalTax: number;
  cashNet: number;
  stockNet: number;
  totalNet: number;
}

export interface AnnualResult {
  cityId: CityId;
  socialBase: number;
  hfBase: number;
  insurance: { personal: InsuranceBreakdown; employer: InsuranceBreakdown };
  housingFundTax: { // 均为月度金额，个人与单位分别适用同一限额
    monthlyLimit: number;
    personalDeductible: number;
    personalExcess: number;
    employerTaxable: number;
  };
  monthlyRows: MonthRow[];
  bonuses: BonusRow[];
  schemes: SchemeResult[];
  recommendedId: SchemeResult['id'];
  totals: {
    grossYear: number;
    cashGrossYear: number;
    cashNetYear: number;
    stockGrossYear: number;
    stockTaxYear: number;
    stockNetYear: number;
    recurringCashNetYear: number;
    personalSocialYear: number;
    personalHfYear: number;
    personalTotalYear: number;
    employerSocialYear: number;
    employerHfYear: number;
    employerTotalYear: number;
    taxYear: number;
    netYear: number;
  };
}

const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));

export function computeAnnual(input: SalaryInput): AnnualResult {
  const policy = CITIES[input.cityId];
  const monthlySalary = round2(input.monthlySalary);
  const bonus = round2(Math.max(0, input.bonus));
  const socialBase = resolveBase(
    input.monthlySalary,
    input.customSocialBase,
    policy.social.minBase,
    policy.social.maxBase,
  );
  const hfBase = resolveBase(
    input.monthlySalary,
    input.customHfBase,
    policy.housingFund.minBase,
    policy.housingFund.maxBase,
  );
  const insurance = monthlyInsurance(
    policy,
    socialBase,
    hfBase,
    input.hfRatio,
    input.hfSupplementRatio,
  );
  const p = insurance.personal;
  const e = insurance.employer;
  const personalMonthly = sum([
    p.pension, p.medical, p.unemployment, p.hfBasic, p.hfSupplement,
  ]);

  // 基本与补充共享 12% 限额；模型将已限额的缴存基数也用于税前扣除。
  const taxFreeRatio = 0.12;
  const monthlyLimit = round0(hfBase * taxFreeRatio);
  const personalHf = sum([p.hfBasic, p.hfSupplement]);
  const employerHf = sum([e.hfBasic, e.hfSupplement]);
  // 比例未超限时按实际合计免税，避免分项取整以及 7% + 5% 浮点误差造成假超限。
  const withinTaxLimit = input.hfRatio + input.hfSupplementRatio <= taxFreeRatio + Number.EPSILON;
  const personalDeductible = withinTaxLimit ? personalHf : Math.min(personalHf, monthlyLimit);
  const housingFundTax: AnnualResult['housingFundTax'] = {
    monthlyLimit,
    personalDeductible,
    personalExcess: personalHf - personalDeductible,
    employerTaxable: withinTaxLimit ? 0 : Math.max(employerHf - monthlyLimit, 0),
  };
  const personalDeduction = sum([
    p.pension, p.medical, p.unemployment, personalDeductible,
  ]);

  // 13/14 薪等额外月薪与签字费并入 12 月工资，一起走累计预扣
  const extraCount = Math.max(0, input.salaryMonths - 12);
  const extrasTotal = round2(extraCount * monthlySalary);
  const signingBonus = round2(Math.max(0, input.signingBonus));
  const stockIncome = round2(Math.max(0, input.stockIncome));
  const noteBaseParts: string[] = [];
  if (extraCount > 0) {
    noteBaseParts.push(`${Array.from({ length: extraCount }, (_, i) => 13 + i).join('、')} 薪`);
  }
  if (signingBonus > 0) noteBaseParts.push('签字费');
  const fmtNote = (parts: string[]) =>
    parts.length > 0 ? `含${extraCount > 0 ? ' ' : ''}${parts.join('、')}` : undefined;
  const noteA = fmtNote(noteBaseParts);
  const noteB = fmtNote([...noteBaseParts, ...(bonus > 0 ? ['年终奖'] : [])]);

  const cashMonths = Array.from({ length: 12 }, (_, i) =>
    i === 11 ? round2(monthlySalary + extrasTotal + signingBonus) : monthlySalary,
  );
  // 单位超额公积金只加入计税收入，不属于现金工资或到手收入。
  const months: MonthInput[] = cashMonths.map((gross) => ({
    gross: round2(gross + housingFundTax.employerTaxable),
    personalDeduction,
    specialDeduction: input.specialDeductionMonthly,
  }));

  const bonusRow = (label: string, gross: number): BonusRow => {
    const gross2 = round2(gross);
    const tax = round2(bonusTax(gross2));
    return { label, gross: gross2, tax, net: round2(gross2 - tax), taxMethod: 'monthly' };
  };

  // 股票/股权激励：不并入综合所得，全额单独计税；与年终奖方案无关，两个方案都叠加
  const stockTaxYear = round2(stockTax(stockIncome));
  const stockNetYear = round2(stockIncome - stockTaxYear);
  const stockRows: BonusRow[] = [];
  if (stockIncome > 0) {
    stockRows.push({
      label: '股票/股权激励',
      gross: stockIncome,
      tax: stockTaxYear,
      net: stockNetYear,
      taxMethod: 'annual',
    });
  }

  // 方案 A：年终奖单独计税（额外月薪已并入 12 月工资）
  const taxDetailsA = withholdDetails(months);
  const bonusesA: BonusRow[] = [
    ...(bonus > 0 ? [bonusRow('年终奖', bonus)] : []),
    ...stockRows,
  ];

  // 方案 B：年终奖并入 12 月综合所得
  const monthsB = months.map((m, i) =>
    i === 11 ? { ...m, gross: round2(m.gross + bonus) } : m,
  );
  const taxDetailsB = withholdDetails(monthsB);
  const bonusesB: BonusRow[] = [...stockRows];

  const cashGrossYear = round2(monthlySalary * 12 + extrasTotal + signingBonus + bonus);
  const grossYear = round2(cashGrossYear + stockIncome);

  const buildScheme = (
    id: SchemeResult['id'],
    label: string,
    taxDetails: WithholdingDetail[],
    bonuses: BonusRow[],
  ): SchemeResult => {
    const cashTax = sum([
      ...taxDetails.map((detail) => detail.tax),
      ...bonuses.filter((b) => b.taxMethod === 'monthly').map((b) => b.tax),
    ]);
    const cashNet = round2(cashGrossYear - personalMonthly * 12 - cashTax);
    return {
      id,
      label,
      totalTax: round2(cashTax + stockTaxYear),
      cashNet,
      stockNet: stockNetYear,
      totalNet: round2(cashNet + stockNetYear),
    };
  };

  const schemes: SchemeResult[] = [
    buildScheme('A', '年终奖单独计税', taxDetailsA, bonusesA),
    buildScheme('B', '年终奖并入综合所得', taxDetailsB, bonusesB),
  ];
  const recommendedId = schemes.reduce(
    (best, s) => (s.totalTax < best.totalTax ? s : best),
    schemes[0],
  ).id;
  const rec = schemes.find((s) => s.id === recommendedId)!;
  const recurringCashNetYear = signingBonus > 0
    ? computeAnnual({ ...input, signingBonus: 0 }).totals.cashNetYear
    : rec.cashNet;

  const recTaxDetails = recommendedId === 'B' ? taxDetailsB : taxDetailsA;
  const recBonuses = recommendedId === 'B' ? bonusesB : bonusesA;
  const flowCashMonths = recommendedId === 'B'
    ? cashMonths.map((gross, i) => i === 11 ? round2(gross + bonus) : gross)
    : cashMonths;

  const monthlyRows: MonthRow[] = flowCashMonths.map((gross, i) => ({
    month: i + 1,
    gross,
    personalTotal: personalMonthly,
    tax: recTaxDetails[i].tax,
    taxDetail: recTaxDetails[i],
    net: round2(gross - personalMonthly - recTaxDetails[i].tax),
    note: i === 11 ? (recommendedId === 'B' ? noteB : noteA) : undefined,
  }));

  const personalSocialYear = round2((p.pension + p.medical + p.unemployment) * 12);
  const personalHfYear = round2((p.hfBasic + p.hfSupplement) * 12);
  const employerSocialYear = round2(
    (e.pension + e.medical + e.unemployment + e.workInjury) * 12,
  );
  const employerHfYear = round2((e.hfBasic + e.hfSupplement) * 12);

  return {
    cityId: input.cityId,
    socialBase,
    hfBase,
    insurance,
    housingFundTax,
    monthlyRows,
    bonuses: recBonuses,
    schemes,
    recommendedId,
    totals: {
      grossYear,
      cashGrossYear,
      cashNetYear: rec.cashNet,
      stockGrossYear: stockIncome,
      stockTaxYear,
      stockNetYear,
      recurringCashNetYear,
      personalSocialYear,
      personalHfYear,
      personalTotalYear: round2(personalSocialYear + personalHfYear),
      employerSocialYear,
      employerHfYear,
      employerTotalYear: round2(employerSocialYear + employerHfYear),
      taxYear: rec.totalTax,
      netYear: rec.totalNet,
    },
  };
}
