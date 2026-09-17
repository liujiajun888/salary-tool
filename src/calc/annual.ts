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
  salaryMonths: number; // 12-16，超出 12 的部分（13/14 薪等）并入 12 月工资计税
  bonus: number;
  signingBonus: number; // 签字费，默认 0，有值时并入 12 月工资计税
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
  note?: string; // 如“含 13 薪”
}

export interface BonusRow {
  label: string;
  gross: number;
  tax: number;
  net: number;
}

export interface SchemeResult {
  id: 'A' | 'B';
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

  // 13/14 薪等额外月薪与签字费并入 12 月工资，一起走累计预扣
  const extraCount = Math.max(0, input.salaryMonths - 12);
  const extrasTotal = round2(extraCount * monthlySalary);
  const signingBonus = round2(Math.max(0, input.signingBonus));
  const noteParts: string[] = [];
  if (extraCount > 0) {
    noteParts.push(`${Array.from({ length: extraCount }, (_, i) => 13 + i).join('、')} 薪`);
  }
  if (signingBonus > 0) noteParts.push('签字费');
  const extraNote =
    noteParts.length > 0 ? `含${extraCount > 0 ? ' ' : ''}${noteParts.join('、')}` : undefined;

  const months: MonthInput[] = Array.from({ length: 12 }, (_, i) => ({
    gross: i === 11 ? round2(monthlySalary + extrasTotal + signingBonus) : monthlySalary,
    personalDeduction: personalMonthly,
    specialDeduction: input.specialDeductionMonthly,
  }));

  const bonusRow = (label: string, gross: number): BonusRow => {
    const gross2 = round2(gross);
    const tax = round2(bonusTax(gross2));
    return { label, gross: gross2, tax, net: round2(gross2 - tax) };
  };

  // 方案 A：年终奖单独计税（额外月薪已并入 12 月工资）
  const taxesA = withhold(months);
  const bonusesA: BonusRow[] = bonus > 0 ? [bonusRow('年终奖', bonus)] : [];

  // 方案 B：年终奖并入 12 月综合所得
  const monthsB = months.map((m, i) =>
    i === 11 ? { ...m, gross: round2(m.gross + bonus) } : m,
  );
  const taxesB = withhold(monthsB);
  const bonusesB: BonusRow[] = [];

  const grossYear = round2(monthlySalary * 12 + extrasTotal + signingBonus + bonus);

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
    buildScheme('A', '年终奖单独计税', taxesA, bonusesA),
    buildScheme('B', '年终奖并入综合所得', taxesB, bonusesB),
  ];
  const recommendedId = schemes.reduce(
    (best, s) => (s.totalTax < best.totalTax ? s : best),
    schemes[0],
  ).id;
  const rec = schemes.find((s) => s.id === recommendedId)!;

  const recTaxes = recommendedId === 'B' ? taxesB : taxesA;
  const recBonuses = recommendedId === 'B' ? bonusesB : bonusesA;
  const flowMonths = recommendedId === 'B' ? monthsB : months;

  const monthlyRows: MonthRow[] = flowMonths.map((m, i) => ({
    month: i + 1,
    gross: m.gross,
    personalTotal: personalMonthly,
    tax: recTaxes[i],
    net: round2(m.gross - personalMonthly - recTaxes[i]),
    note: i === 11 ? extraNote : undefined,
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
