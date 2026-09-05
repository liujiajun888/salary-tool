import { CITIES } from '../policy';
import type { CityId } from '../policy/types';
import { monthlyInsurance, resolveBase } from './social';
import type { InsuranceBreakdown } from './social';
import { bonusTax, withhold } from './tax';
import type { MonthInput } from './tax';
import { round2 } from './format';

export interface SalaryInput {
  cityId: CityId;
  monthlySalary: number;
  salaryMonths: number; // 12-16，超出 12 的部分为奖金
  bonus: number;
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
  net: number;
}

export interface BonusRow {
  label: string;
  gross: number;
  tax: number;
  net: number;
}

export interface SchemeResult {
  id: 'A' | 'B' | 'C';
  label: string;
  totalTax: number;
  totalNet: number;
}

export interface AnnualResult {
  cityId: CityId;
  socialBase: number;
  hfBase: number;
  insurance: { personal: InsuranceBreakdown; employer: InsuranceBreakdown };
  monthlyRows: MonthRow[];
  bonuses: BonusRow[];
  schemes: SchemeResult[];
  recommendedId: SchemeResult['id'];
  totals: {
    grossYear: number;
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

  const months: MonthInput[] = Array.from({ length: 12 }, () => ({
    gross: input.monthlySalary,
    personalDeduction: personalMonthly,
    specialDeduction: input.specialDeductionMonthly,
  }));

  const bonus = Math.max(0, input.bonus);
  const extraSalaries = Array.from(
    { length: Math.max(0, input.salaryMonths - 12) },
    () => input.monthlySalary,
  );

  const bonusRow = (label: string, gross: number): BonusRow => {
    const tax = round2(bonusTax(gross));
    return { label, gross, tax, net: round2(gross - tax) };
  };

  // 方案 A：各笔奖金分别单独计税（常用简化口径）
  const taxesA = withhold(months);
  const bonusesA: BonusRow[] = [
    ...extraSalaries.map((gross, i) => bonusRow(`${13 + i} 薪`, gross)),
    ...(bonus > 0 ? [bonusRow('年终奖', bonus)] : []),
  ];

  // 方案 B：年终奖并入 12 月综合所得，其余奖金仍单独计税
  const monthsB = months.map((m, i) =>
    i === 11 ? { ...m, gross: m.gross + bonus } : m,
  );
  const taxesB = withhold(monthsB);
  const bonusesB: BonusRow[] = extraSalaries.map((gross, i) => bonusRow(`${13 + i} 薪`, gross));

  // 方案 C：全部奖金合并为一笔单独计税
  const pool = round2(extraSalaries.reduce((a, b) => a + b, 0) + bonus);
  const taxesC = taxesA;
  const bonusesC: BonusRow[] = pool > 0 ? [bonusRow('奖金合并', pool)] : [];

  const grossYear = round2(input.monthlySalary * 12 + pool);

  const buildScheme = (
    id: SchemeResult['id'],
    label: string,
    taxes: number[],
    bonuses: BonusRow[],
  ): SchemeResult => {
    const totalTax = round2(sum(taxes) + sum(bonuses.map((b) => b.tax)));
    return {
      id,
      label,
      totalTax,
      totalNet: round2(grossYear - personalMonthly * 12 - totalTax),
    };
  };

  const schemes: SchemeResult[] = [
    buildScheme('A', '各笔奖金分别单独计税', taxesA, bonusesA),
    buildScheme('B', '年终奖并入综合所得', taxesB, bonusesB),
    buildScheme('C', '全部奖金合并一笔单独计税', taxesC, bonusesC),
  ];
  const recommendedId = schemes.reduce(
    (best, s) => (s.totalTax < best.totalTax ? s : best),
    schemes[0],
  ).id;
  const rec = schemes.find((s) => s.id === recommendedId)!;

  const useB = recommendedId === 'B';
  const recTaxes = useB ? taxesB : taxesA;
  const recBonuses =
    recommendedId === 'A' ? bonusesA : useB ? bonusesB : bonusesC;
  const flowMonths = useB ? monthsB : months;

  const monthlyRows: MonthRow[] = flowMonths.map((m, i) => ({
    month: i + 1,
    gross: m.gross,
    personalTotal: personalMonthly,
    tax: recTaxes[i],
    net: round2(m.gross - personalMonthly - recTaxes[i]),
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
    monthlyRows,
    bonuses: recBonuses,
    schemes,
    recommendedId,
    totals: {
      grossYear,
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
