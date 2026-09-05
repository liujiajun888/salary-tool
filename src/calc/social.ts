import { round0 } from './format';
import type { CityPolicy, InsuranceRates } from '../policy/types';

export function resolveBase(
  salary: number,
  custom: number | null,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(custom ?? salary, min), max);
}

export interface InsuranceBreakdown {
  pension: number;
  medical: number;
  unemployment: number;
  workInjury: number;
  hfBasic: number;
  hfSupplement: number;
}

// 精确四舍五入到分：rate 转整数基点后 base×bp 恒为精确整数，
// 除以 100 后半分必精确落点，Math.round 即教科书四舍五入
function byRate(base: number, rate: number): number {
  const bp = Math.round(rate * 10000);
  return Math.round((base * bp) / 100) / 100;
}

function byRates(
  base: number,
  rates: InsuranceRates,
): Pick<InsuranceBreakdown, 'pension' | 'medical' | 'unemployment' | 'workInjury'> {
  return {
    pension: byRate(base, rates.pension),
    medical: byRate(base, rates.medical),
    unemployment: byRate(base, rates.unemployment),
    workInjury: byRate(base, rates.workInjury),
  };
}

export function monthlyInsurance(
  policy: CityPolicy,
  socialBase: number,
  hfBase: number,
  hfRatio: number,
  hfSupplementRatio: number,
): { personal: InsuranceBreakdown; employer: InsuranceBreakdown } {
  const p = byRates(socialBase, policy.social.personal);
  const e = byRates(socialBase, policy.social.employer);
  // 公积金按上海规则计算到元（四舍五入）
  const hfBasic = round0(hfBase * hfRatio);
  const hfSupplement = round0(hfBase * hfSupplementRatio);
  return {
    personal: { ...p, workInjury: 0, hfBasic, hfSupplement },
    employer: { ...e, hfBasic, hfSupplement },
  };
}
