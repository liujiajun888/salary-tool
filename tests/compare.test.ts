import { describe, it, expect } from 'vitest';
import { bestOf, nextPlanName, describeInput, sortByTotalDesc, planName, MAX_PLANS } from '../src/calc/compare';
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
  companyName: '',
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
      maxTotalId: 'c',
    });
  });

  it('税后+公积金合计维度独立判定', () => {
    const plans = [
      plan('a', { netYear: 100000, hfTotalYear: 60000 }),
      plan('b', { netYear: 140000, hfTotalYear: 10000 }),
      plan('c', { netYear: 110000, hfTotalYear: 70000 }),
    ];
    expect(bestOf(plans).maxTotalId).toBe('c');
  });

  it('平局取先保存者', () => {
    const plans = [plan('a', { netYear: 100000 }), plan('b', { netYear: 100000 })];
    expect(bestOf(plans).maxNetId).toBe('a');
  });

  it('空列表返回全 null', () => {
    expect(bestOf([])).toEqual({
      maxNetId: null,
      maxHfId: null,
      minTaxId: null,
      maxTotalId: null,
    });
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

describe('sortByTotalDesc 按税后+公积金降序', () => {
  it('按合计从大到小排列', () => {
    const plans = [
      plan('a', { netYear: 100000, hfTotalYear: 60000 }),
      plan('b', { netYear: 140000, hfTotalYear: 10000 }),
      plan('c', { netYear: 110000, hfTotalYear: 70000 }),
    ];
    expect(sortByTotalDesc(plans).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('平局保持保存顺序（稳定排序）', () => {
    const plans = [
      plan('a', { netYear: 100000, hfTotalYear: 50000 }),
      plan('b', { netYear: 120000, hfTotalYear: 30000 }),
      plan('c', { netYear: 90000, hfTotalYear: 60000 }),
    ];
    expect(sortByTotalDesc(plans).map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('不修改原数组', () => {
    const plans = [plan('a', { netYear: 100000 }), plan('b', { netYear: 200000 })];
    sortByTotalDesc(plans);
    expect(plans.map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('planName 方案命名（公司名优先，空则回退编号）', () => {
  it('有公司名时用公司名', () =>
    expect(planName('腾讯', [])).toBe('腾讯'));
  it('公司名去首尾空格', () =>
    expect(planName('  字节跳动  ', [])).toBe('字节跳动'));
  it('空字符串回退方案编号', () =>
    expect(planName('', [plan('x', { name: '方案 1' })])).toBe('方案 2'));
  it('纯空格同样回退方案编号', () =>
    expect(planName('   ', [plan('x', { name: '方案 1' })])).toBe('方案 2'));
});

it('MAX_PLANS 为 5', () => expect(MAX_PLANS).toBe(5));
