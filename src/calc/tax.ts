import { round2 } from './format';

interface Bracket {
  limit: number;
  rate: number;
  quickDeduction: number;
}

// 综合所得年度税率表（累计预扣预缴率表一）
export const ANNUAL_BRACKETS: Bracket[] = [
  { limit: 36000, rate: 0.03, quickDeduction: 0 },
  { limit: 144000, rate: 0.1, quickDeduction: 2520 },
  { limit: 300000, rate: 0.2, quickDeduction: 16920 },
  { limit: 420000, rate: 0.25, quickDeduction: 31920 },
  { limit: 660000, rate: 0.3, quickDeduction: 52920 },
  { limit: 960000, rate: 0.35, quickDeduction: 85920 },
  { limit: Infinity, rate: 0.45, quickDeduction: 181920 },
];

// 全年一次性奖金月度税率表（按 bonus÷12 查档，速算扣除数只减一次）
export const MONTHLY_BRACKETS: Bracket[] = [
  { limit: 3000, rate: 0.03, quickDeduction: 0 },
  { limit: 12000, rate: 0.1, quickDeduction: 210 },
  { limit: 25000, rate: 0.2, quickDeduction: 1410 },
  { limit: 35000, rate: 0.25, quickDeduction: 2660 },
  { limit: 55000, rate: 0.3, quickDeduction: 4410 },
  { limit: 80000, rate: 0.35, quickDeduction: 7160 },
  { limit: Infinity, rate: 0.45, quickDeduction: 15160 },
];

// amount 为计税基数（乘税率），base 为查档基数；综合所得两者相同，
// 奖金单独计税时按 bonus÷12 查档但对全额奖金计税。
function taxByBrackets(amount: number, base: number, brackets: Bracket[]): number {
  for (const b of brackets) {
    if (base <= b.limit) return amount * b.rate - b.quickDeduction;
  }
  return 0;
}

export function cumulativeTax(cumTaxable: number): number {
  if (cumTaxable <= 0) return 0;
  return taxByBrackets(cumTaxable, cumTaxable, ANNUAL_BRACKETS);
}

// 全年一次性奖金：按 bonus÷12 查月度税率表，对全额奖金计税，速算扣除数只减一次。
/** 返回未取整值；调用方需 round2 到分（见 design spec §5.8） */
export function bonusTax(bonus: number): number {
  if (bonus <= 0) return 0;
  return taxByBrackets(bonus, bonus / 12, MONTHLY_BRACKETS);
}

export interface MonthInput {
  gross: number;
  personalDeduction: number; // 当月个人三险一金 + 公积金
  specialDeduction: number;  // 当月专项附加扣除
}

export function withhold(months: MonthInput[]): number[] {
  let cumGross = 0;
  let cumDeduct = 0;
  let cumPaid = 0;
  return months.map((m) => {
    cumGross += m.gross;
    cumDeduct += 5000 + m.personalDeduction + m.specialDeduction;
    const cumTaxable = Math.max(0, cumGross - cumDeduct);
    const cumTax = round2(cumulativeTax(cumTaxable));
    const tax = round2(Math.max(0, cumTax - cumPaid));
    cumPaid = round2(cumPaid + tax);
    return tax;
  });
}
