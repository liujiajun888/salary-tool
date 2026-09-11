import type { SalaryInput } from './annual';
import { formatMoney, formatPercent } from './format';

export const MAX_PLANS = 5;

export interface PlanSnapshot {
  id: string;
  name: string; // 展示名：公司名或回退的方案编号
  companyName: string; // 用户输入的公司名（可为空，载入回填用）
  cityName: string;
  summary: string;
  netYear: number; // 税后薪资 + 税后年终奖（推荐方案口径）
  hfTotalYear: number; // 全年公积金总数（个人 + 单位，含补充）
  taxYear: number; // 全年扣税总数
  input: SalaryInput; // 载入回填用
}

export function nextPlanName(existing: PlanSnapshot[]): string {
  const used = new Set(
    existing.map((p) => Number.parseInt(p.name.replace('方案 ', ''), 10)),
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `方案 ${n}`;
}

export function planName(companyName: string, existing: PlanSnapshot[]): string {
  const trimmed = companyName.trim();
  return trimmed || nextPlanName(existing);
}

export interface PlanBest {
  maxNetId: string | null;
  maxHfId: string | null;
  minTaxId: string | null;
  maxTotalId: string | null; // 税后到手 + 全年公积金 合计最高
}

export function bestOf(plans: PlanSnapshot[]): PlanBest {
  const pick = (better: (a: PlanSnapshot, b: PlanSnapshot) => boolean): string | null => {
    if (plans.length === 0) return null;
    // 平局保留先出现的（不严格更优不替换）
    return plans.reduce((best, p) => (better(p, best) ? p : best)).id;
  };
  return {
    maxNetId: pick((a, b) => a.netYear > b.netYear),
    maxHfId: pick((a, b) => a.hfTotalYear > b.hfTotalYear),
    minTaxId: pick((a, b) => a.taxYear < b.taxYear),
    maxTotalId: pick(
      (a, b) => a.netYear + a.hfTotalYear > b.netYear + b.hfTotalYear,
    ),
  };
}

export function sortByTotalDesc(plans: PlanSnapshot[]): PlanSnapshot[] {
  return [...plans].sort(
    (a, b) => b.netYear + b.hfTotalYear - (a.netYear + a.hfTotalYear),
  );
}

export function describeInput(input: SalaryInput): string {
  const parts = [
    `月薪 ${formatMoney(input.monthlySalary)}`,
    `${input.salaryMonths} 薪`,
    `年终奖 ${formatMoney(input.bonus)}`,
    `公积金 ${formatPercent(input.hfRatio)}`,
  ];
  if (input.hfSupplementRatio > 0) parts.push(`补充 ${formatPercent(input.hfSupplementRatio)}`);
  return parts.join(' · ');
}
