import { describe, it, expect } from 'vitest';
import { bestOf, nextPlanName, describeInput, MAX_PLANS } from '../src/calc/compare';
import type { PlanSnapshot } from '../src/calc/compare';
import type { SalaryInput } from '../src/calc/annual';

const baseInput: SalaryInput = {
  cityId: 'shanghai',
  monthlySalary: 30000,
  salaryMonths: 12,
  bonus: 0,
  hfRatio: 0.07,
  hfSupplementRatio: 0,
  specialDeductionMonthly: 0,
  customSocialBase: null,
  customHfBase: null,
};

const plan = (id: string, over: Partial<PlanSnapshot> = {}): PlanSnapshot => ({
  id,
  name: `方案 ${id}`,
  cityName: '上海',
  summary: '摘要',
  netYear: 100000,
  hfTotalYear: 50000,
  taxYear: 30000,
  input: baseInput,
  ...over,
});

describe('bestOf 各维度最优（平局取先保存者）', () => {
  it('三个方案各维度独立判定', () => {
    const plans = [
      plan('a', { netYear: 100000, hfTotalYear: 60000, taxYear: 30000 }),
      plan('b', { netYear: 120000, hfTotalYear: 50000, taxYear: 25000 }),
      plan('c', { netYear: 110000, hfTotalYear: 70000, taxYear: 28000 }),
    ];
    expect(bestOf(plans)).toEqual({
      maxNetId: 'b',
      maxHfId: 'c',
      minTaxId: 'b',
    });
  });

  it('平局取先保存者', () => {
    const plans = [plan('a', { netYear: 100000 }), plan('b', { netYear: 100000 })];
    expect(bestOf(plans).maxNetId).toBe('a');
  });

  it('空列表返回全 null', () => {
    expect(bestOf([])).toEqual({ maxNetId: null, maxHfId: null, minTaxId: null });
  });
});

describe('nextPlanName 自动编号补位', () => {
  it('空列表为方案 1', () => expect(nextPlanName([])).toBe('方案 1'));
  it('顺序递增', () =>
    expect(nextPlanName([plan('x', { name: '方案 1' })])).toBe('方案 2'));
  it('跳号补位', () =>
    expect(nextPlanName([plan('x', { name: '方案 1' }), plan('y', { name: '方案 3' })])).toBe('方案 2'));
  it('满三个后取方案 4', () =>
    expect(
      nextPlanName([plan('x', { name: '方案 1' }), plan('y', { name: '方案 2' }), plan('z', { name: '方案 3' })]),
    ).toBe('方案 4'));
});

describe('describeInput 参数摘要', () => {
  it('包含月薪/薪数/年终奖/公积金', () => {
    const s = describeInput({ ...baseInput, bonus: 100000, salaryMonths: 13 });
    expect(s).toContain('月薪 30,000.00');
    expect(s).toContain('13 薪');
    expect(s).toContain('年终奖 100,000.00');
    expect(s).toContain('公积金 7%');
  });
  it('补充比例为 0 时不出现', () => {
    expect(describeInput(baseInput)).not.toContain('补充');
  });
  it('补充比例大于 0 时出现', () => {
    expect(describeInput({ ...baseInput, hfSupplementRatio: 0.05 })).toContain('补充 5%');
  });
});

it('MAX_PLANS 为 3', () => expect(MAX_PLANS).toBe(3));
