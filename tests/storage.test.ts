import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CALCULATION_VERSION, computeAnnual } from '../src/calc/annual';
import { describeInput, MAX_PLANS } from '../src/calc/compare';
import { round2 } from '../src/calc/format';
import { CITIES } from '../src/policy';
import {
  createPlanSnapshot, currentPolicyVersion, DEFAULT_FORM, parsePlanImport,
  restoreForm, restorePlans, serializePlans,
} from '../src/storage';
import type { FormState } from '../src/storage';

const BEFORE = '2026-09-01T12:00:00.000Z';
const NOW = '2026-09-22T12:00:00.000Z';
const form: FormState = {
  ...DEFAULT_FORM, companyName: '示例科技', monthlySalary: 30000, salaryMonths: 13,
  bonus: 100000, signingBonus: 50000, stockIncome: 120000,
  hfSupplementRatio: 0.05, specialDeductionMonthly: 2000,
};
const makePlan = (id = 'saved-id') => createPlanSnapshot(form, id, '示例科技', BEFORE);
const file = (plans: unknown = [makePlan()], extra: Record<string, unknown> = {}) => JSON.stringify({
  format: 'salary-tool-plans', version: 1, exportedAt: BEFORE, plans, ...extra,
});
const moneyFields = ['monthlySalary', 'bonus', 'signingBonus', 'stockIncome', 'specialDeductionMonthly'] as const;
const baseFields = ['customSocialBase', 'customHfBase'] as const;
const invalidMoney = [NaN, Infinity, -Infinity, -1, 1e9 + 1, '20000', '', null, undefined, true, {}, []];

function legacyPlan(): Record<string, unknown> {
  const current = makePlan();
  const input: Record<string, unknown> = { ...current.input };
  delete input.signingBonus;
  delete input.stockIncome;
  const old: Record<string, unknown> = { ...current, input };
  for (const key of ['cashNetYear', 'stockNetYear', 'recurringCashNetYear', 'policyVersion', 'calculationVersion', 'calculatedAt']) {
    delete old[key];
  }
  return old;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('restoreForm 缓存表单校验', () => {
  it('保留原 App 的默认值，每次返回独立对象', () => {
    expect(DEFAULT_FORM).toEqual({
      cityId: 'shanghai', monthlySalary: 20000, salaryMonths: 12, bonus: 0,
      signingBonus: 0, stockIncome: 0, hfRatio: CITIES.shanghai.housingFund.defaultRatio,
      hfSupplementRatio: 0, specialDeductionMonthly: 0,
      customSocialBase: null, customHfBase: null, companyName: '',
    });
    const first = restoreForm(null);
    first.monthlySalary = 1;
    expect(restoreForm(null)).toEqual(DEFAULT_FORM);
    expect(first).not.toBe(DEFAULT_FORM);
  });

  it.each([null, undefined, 12, true, 'broken JSON', [], new Date(), Object.create(form)])('损坏根对象安全回退：%s', (value) => {
    expect(restoreForm(value)).toEqual(DEFAULT_FORM);
  });

  it('合法字段不丢失，旧数据缺新增收入字段时补零', () => {
    expect(restoreForm(form)).toEqual(form);
    const { signingBonus: _signing, stockIncome: _stock, ...old } = form;
    expect(restoreForm(old)).toEqual({ ...form, signingBonus: 0, stockIncome: 0 });
  });

  for (const key of moneyFields) {
    it.each(invalidMoney)(`${key} 非法金额回退默认：%s`, (value) => {
      const restored = restoreForm({ ...form, [key]: value });
      expect(restored[key]).toBe(DEFAULT_FORM[key]);
      expect(restored.companyName).toBe(form.companyName);
    });
    it.each([0, 0.01, 1e9])(`${key} 接受闭区间内金额：%s`, (value) => {
      expect(restoreForm({ ...form, [key]: value })[key]).toBe(value);
    });
  }

  for (const key of baseFields) {
    it.each(invalidMoney.filter((value) => value !== null))(`${key} 非法基数回退 null：%s`, (value) => {
      expect(restoreForm({ ...form, [key]: value })[key]).toBeNull();
    });
    it.each([null, 0, 0.01, 1e9])(`${key} 合法基数保留：%s`, (value) => {
      expect(restoreForm({ ...form, [key]: value })[key]).toBe(value);
    });
  }

  it.each([NaN, Infinity, 11, 17, 12.5, '13', null, undefined])('非法薪数回退 12：%s', (value) => {
    expect(restoreForm({ ...form, salaryMonths: value }).salaryMonths).toBe(12);
  });
  it.each([12, 13, 14, 15, 16])('合法薪数保留：%s', (value) => {
    expect(restoreForm({ ...form, salaryMonths: value }).salaryMonths).toBe(value);
  });

  it.each(['beijing', '__proto__', 'constructor', 'toString', '', null, {}])('非法城市安全回退：%s', (cityId) => {
    const restored = restoreForm({ ...form, cityId, hfRatio: 0.12 });
    expect(restored.cityId).toBe('shanghai');
    expect(restored.hfRatio).toBe(CITIES.shanghai.housingFund.defaultRatio);
    expect(() => computeAnnual(restored)).not.toThrow();
  });

  it('比例按对应城市校验，缺失或非法时使用该城市默认值', () => {
    expect(restoreForm({ ...form, hfRatio: 0.12, hfSupplementRatio: 0.09 })).toMatchObject({
      hfRatio: 0.07, hfSupplementRatio: 0,
    });
    expect(restoreForm({ cityId: 'hangzhou' })).toMatchObject({ hfRatio: 0.12, hfSupplementRatio: 0 });
    expect(restoreForm({ ...form, cityId: 'hangzhou', hfRatio: 0.12, hfSupplementRatio: 0.09 })).toMatchObject({
      hfRatio: 0.12, hfSupplementRatio: 0.09,
    });
    for (const ratio of [NaN, Infinity, -0.01, 0.055, '0.07', null]) {
      expect(restoreForm({ ...form, hfRatio: ratio, hfSupplementRatio: ratio })).toMatchObject({
        hfRatio: 0.07, hfSupplementRatio: 0,
      });
    }
  });

  it('缓存保留历史长名称，新的输入长度由 UI 限制', () => {
    expect(restoreForm({ ...form, companyName: '中'.repeat(200) }).companyName).toHaveLength(200);
    expect(restoreForm({ ...form, companyName: ' 公司 ' }).companyName).toBe(' 公司 ');
    for (const companyName of [null, {}, 123]) {
      expect(restoreForm({ ...form, companyName }).companyName).toBe('');
    }
  });

  it('旧版超长名称不导致薪资方案丢失，仍可导出恢复', () => {
    const longName = '历史公司名称'.repeat(40);
    const old = { ...legacyPlan(), companyName: longName, name: longName };
    const restored = restorePlans([old]);
    expect(restored.plans).toHaveLength(1);
    expect(restored.plans[0].companyName).toBe(longName);
    expect(restored.plans[0].input.monthlySalary).toBe(form.monthlySalary);
    expect(parsePlanImport(serializePlans(restored.plans))[0].companyName).toBe(longName);
  });

  it('原型键和额外字段不会进入恢复结果或污染原型', () => {
    const poison = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"extra":1}');
    const restored = restoreForm({ ...form, ...poison });
    expect(restored).toEqual(form);
    expect(Object.hasOwn(restored, '__proto__')).toBe(false);
    expect(Object.hasOwn(restored, 'constructor')).toBe(false);
    expect(Object.getPrototypeOf(restored)).toBe(Object.prototype);
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
    expect(restoreForm(Object.assign(Object.create(null), form))).toEqual(form);
  });
});

describe('createPlanSnapshot 当前引擎快照', () => {
  it('所有汇总、摘要、版本来自引擎，公积金仍是个人加单位', () => {
    const snapshot = createPlanSnapshot({ ...form, companyName: ' 示例科技 ' }, 'id', '名称');
    const { totals } = computeAnnual(form);
    expect(snapshot).toMatchObject({
      id: 'id', name: '名称', companyName: '示例科技', cityName: CITIES.shanghai.name,
      summary: describeInput(form), netYear: totals.netYear,
      cashNetYear: totals.cashNetYear, stockNetYear: totals.stockNetYear,
      recurringCashNetYear: totals.recurringCashNetYear,
      hfTotalYear: round2(totals.personalHfYear + totals.employerHfYear), taxYear: totals.taxYear,
      policyVersion: CITIES.shanghai.dataVersion,
      calculationVersion: CALCULATION_VERSION, calculatedAt: NOW,
    });
    expect(snapshot.netYear).toBeCloseTo(snapshot.cashNetYear + snapshot.stockNetYear, 2);
    expect(snapshot.stockNetYear).toBeGreaterThan(0);
    expect(snapshot.recurringCashNetYear).toBeLessThan(snapshot.cashNetYear);
    expect(Object.hasOwn(snapshot.input, 'companyName')).toBe(false);
    expect(snapshot.input).not.toBe(form);
    expect(makePlan().calculatedAt).toBe(BEFORE);
  });

  it('杭州使用对应政策版本和城市名', () => {
    const snapshot = createPlanSnapshot({ ...form, cityId: 'hangzhou', hfRatio: 0.12 }, 'id', '杭州');
    expect(snapshot.policyVersion).toBe(CITIES.hangzhou.dataVersion);
    expect(snapshot.policyVersion).toBe(currentPolicyVersion('hangzhou'));
    expect(snapshot.cityName).toBe(CITIES.hangzhou.name);
  });

  it('运行时非法输入不能通过类型断言绕过校验', () => {
    expect(() => createPlanSnapshot({ ...form, monthlySalary: '30000' } as unknown as FormState, 'id', '名称')).toThrow();
    expect(() => createPlanSnapshot(form, '', '名称')).toThrow();
    expect(() => createPlanSnapshot(form, 'id', ' ')).toThrow();
    expect(() => createPlanSnapshot(form, 'id', '名称', 'invalid')).toThrow();
  });
});

describe('restorePlans 缓存方案迁移', () => {
  it('无缓存和空数组不提示变化，非法容器提示变化', () => {
    for (const value of [null, undefined, []]) expect(restorePlans(value)).toEqual({ plans: [], changed: false });
    for (const value of [{}, 'broken JSON', 1, true]) expect(restorePlans(value)).toEqual({ plans: [], changed: true });
  });

  it('有效当前快照重算后不提示变化，并保持时间、顺序及原数据', () => {
    const saved = [makePlan('one'), makePlan('two')];
    const before = JSON.stringify(saved);
    const restored = restorePlans(saved);
    expect(restored).toEqual({ plans: saved, changed: false });
    expect(restored.plans[0]).not.toBe(saved[0]);
    expect(restored.plans[0].input).not.toBe(saved[0].input);
    expect(restored.plans[0].calculatedAt).toBe(BEFORE);
    expect(JSON.stringify(saved)).toBe(before);
  });

  it('旧方案新增收入补零，新汇总与版本补全，迁移后可稳定再次恢复', () => {
    const old = legacyPlan();
    const restored = restorePlans([old]);
    expect(restored.changed).toBe(true);
    expect(restored.plans).toEqual([
      createPlanSnapshot({ ...form, signingBonus: 0, stockIncome: 0 }, 'saved-id', '示例科技'),
    ]);
    expect(restorePlans(restored.plans)).toEqual({ plans: restored.plans, changed: false });
    expect(Object.hasOwn(old, 'calculationVersion')).toBe(false);
  });

  it.each(['policyVersion', 'calculationVersion'])('%s 变化时重新标记版本和计算时间', (key) => {
    const saved = makePlan();
    const restored = restorePlans([{ ...saved, [key]: 'old-version' }]);
    expect(restored.changed).toBe(true);
    expect(restored.plans).toEqual([{ ...saved, calculatedAt: NOW }]);
  });

  it.each(['cashNetYear', 'stockNetYear', 'recurringCashNetYear', 'policyVersion', 'calculationVersion', 'calculatedAt'])('缺失 %s 时提示迁移', (key) => {
    const old: Record<string, unknown> = { ...makePlan() };
    delete old[key];
    expect(restorePlans([old])).toEqual({ plans: [{ ...makePlan(), calculatedAt: NOW }], changed: true });
  });

  it('恶意汇总、摘要、城市名和损坏时间均被当前引擎替换', () => {
    const saved = makePlan();
    const poisoned = {
      ...saved, netYear: NaN, cashNetYear: '999999', stockNetYear: Infinity,
      recurringCashNetYear: -1e20, hfTotalYear: null, taxYear: -100,
      summary: '<script>恶意摘要</script>', cityName: '错误城市', calculatedAt: 'not-a-date',
    };
    expect(restorePlans([poisoned])).toEqual({ plans: [{ ...saved, calculatedAt: NOW }], changed: true });
  });

  it('丢弃非法条目和重复 id，保留先出现者且至多五个', () => {
    const first = makePlan('same');
    const saved = [null, {}, first, { ...first, name: '重复' }, ...Array.from({ length: 6 }, (_, i) => makePlan(`id-${i}`))];
    const restored = restorePlans(saved);
    expect(restored.changed).toBe(true);
    expect(restored.plans.map((p) => p.id)).toEqual(['same', 'id-0', 'id-1', 'id-2', 'id-3']);
    expect(restored.plans[0]).toEqual(first);
    expect(restorePlans(restored.plans).changed).toBe(false);
  });

  it('非法条目不占用同 id 的后续有效条目', () => {
    const saved = makePlan();
    expect(restorePlans([{ ...saved, input: {} }, saved])).toEqual({ plans: [saved], changed: true });
  });

  it.each(['beijing', '__proto__', 'constructor', 'toString', null])('非法城市 %s 丢弃，不触发引擎崩溃', (cityId) => {
    const saved = makePlan();
    expect(restorePlans([{ ...saved, input: { ...saved.input, cityId } }])).toEqual({ plans: [], changed: true });
  });

  for (const key of [...moneyFields, ...baseFields]) {
    it.each(invalidMoney.filter((value) => !(baseFields.includes(key as typeof baseFields[number]) && value === null)))(`缓存非法 ${key} 丢弃：%s`, (value) => {
      const saved = makePlan();
      expect(restorePlans([{ ...saved, input: { ...saved.input, [key]: value } }])).toEqual({ plans: [], changed: true });
    });
  }

  it('不接受继承而来的输入字段', () => {
    const saved = makePlan();
    expect(restorePlans([{ ...saved, input: Object.create(saved.input) }])).toEqual({ plans: [], changed: true });
  });
});

describe('方案文件严格导入导出', () => {
  it('明确包格式，往返保持输入和重新计算的结果，同时分配新 UUID', () => {
    const plans = [makePlan('one'), makePlan('two')];
    const text = serializePlans(plans);
    expect(JSON.parse(text)).toEqual({ format: 'salary-tool-plans', version: 1, exportedAt: NOW, plans });
    const imported = parsePlanImport(text);
    expect(imported).toHaveLength(2);
    for (let i = 0; i < imported.length; i += 1) {
      expect(imported[i].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(imported[i].id).not.toBe(plans[i].id);
      expect(imported[i]).toEqual({ ...plans[i], id: imported[i].id, calculatedAt: NOW });
    }
    expect(new Set(imported.map((p) => p.id)).size).toBe(2);
    expect(parsePlanImport(text)[0].id).not.toBe(imported[0].id);
    expect(plans.map((p) => p.id)).toEqual(['one', 'two']);
    expect(restorePlans(imported).changed).toBe(false);
  });

  it('旧快照可在明确文件包内迁移，不接受裸数组或裸方案', () => {
    const imported = parsePlanImport(file([legacyPlan()]));
    expect(imported[0]).toEqual({
      ...createPlanSnapshot({ ...form, signingBonus: 0, stockIncome: 0 }, imported[0].id, '示例科技'),
    });
    for (const value of [[legacyPlan()], legacyPlan(), { plans: [legacyPlan()] }, DEFAULT_FORM, null, []]) {
      expect(() => parsePlanImport(JSON.stringify(value))).toThrow();
    }
  });

  it.each(['', '{', 'not JSON', '{"plans": [NaN]}', '{"plans": [Infinity]}', '{"a":1,}'])('拒绝损坏 JSON：%s', (text) => {
    expect(() => parsePlanImport(text)).toThrow(/JSON/);
  });

  it.each([undefined, null, '1', 0, 2, -1, {}, []])('拒绝错误或缺失文件版本：%s', (version) => {
    expect(() => parsePlanImport(file(undefined, { version }))).toThrow(/格式或版本/);
  });
  it.each([undefined, null, 'other', 1, {}])('拒绝错误格式标记：%s', (format) => {
    expect(() => parsePlanImport(file(undefined, { format }))).toThrow(/格式或版本/);
  });
  it.each([undefined, null, 'not-a-date', '2026-09-22', 123])('拒绝错误导出时间：%s', (exportedAt) => {
    expect(() => parsePlanImport(file(undefined, { exportedAt }))).toThrow(/格式或版本/);
  });

  it('文件方案数量限定 1–5；重复 id 或任一非法条目导致整包拒绝', () => {
    for (const plans of [[], null, {}, [makePlan(), null], [makePlan(), makePlan()], Array.from({ length: 6 }, (_, i) => makePlan(`${i}`))]) {
      expect(() => parsePlanImport(file(plans))).toThrow();
    }
    expect(parsePlanImport(file(Array.from({ length: MAX_PLANS }, (_, i) => makePlan(`${i}`))))).toHaveLength(5);
    expect(() => serializePlans([])).toThrow();
    expect(() => serializePlans([makePlan(), makePlan()])).toThrow();
  });

  for (const key of [...moneyFields, ...baseFields]) {
    // JSON 无法表达 NaN/Infinity，stringify 会变为 null；null 基数本身合法。
    const invalid = [...invalidMoney.filter((value) => Number.isFinite(value) || typeof value !== 'number')]
      .filter((value) => value !== undefined && !(baseFields.includes(key as typeof baseFields[number]) && value === null));
    it.each(invalid)(`导入非法 ${key} 不悄悄默认：%s`, (value) => {
      const saved = makePlan();
      expect(() => parsePlanImport(file([saved, { ...saved, id: 'bad', input: { ...saved.input, [key]: value } }]))).toThrow(/第 2 个方案/);
    });
  }

  it('JSON 溢出数值（Infinity）也拒绝', () => {
    const text = file().replace('"monthlySalary":30000', '"monthlySalary":1e400');
    expect(() => parsePlanImport(text)).toThrow();
  });

  it.each(['cityId', 'monthlySalary', 'salaryMonths', 'bonus', 'hfRatio', 'hfSupplementRatio', 'specialDeductionMonthly', 'customSocialBase', 'customHfBase'])('除新增收入外不迁移缺失的输入字段：%s', (key) => {
    const saved = makePlan();
    const input: Record<string, unknown> = { ...saved.input };
    delete input[key];
    expect(() => parsePlanImport(file([{ ...saved, input }]))).toThrow();
  });

  it.each([
    { cityId: 'beijing' }, { cityId: '__proto__' }, { cityId: 'constructor' },
    { salaryMonths: 11 }, { salaryMonths: 17 }, { salaryMonths: 13.5 }, { salaryMonths: '13' },
    { hfRatio: 0.12 }, { hfRatio: '0.07' }, { hfRatio: 0.055 },
    { hfSupplementRatio: 0.09 }, { hfSupplementRatio: -0.01 },
  ])('拒绝非法城市、薪数和比例：%s', (patch) => {
    const saved = makePlan();
    expect(() => parsePlanImport(file([{ ...saved, input: { ...saved.input, ...patch } }]))).toThrow();
    expect(restorePlans([{ ...saved, input: { ...saved.input, ...patch } }])).toEqual({ plans: [], changed: true });
  });

  it.each([
    { id: '' }, { id: 123 }, { name: ' ' }, { name: null },
    { companyName: null },
    { input: [] }, { input: null },
  ])('拒绝非法方案对象字段：%s', (patch) => {
    expect(() => parsePlanImport(file([{ ...makePlan(), ...patch }]))).toThrow();
    expect(restorePlans([{ ...makePlan(), ...patch }])).toEqual({ plans: [], changed: true });
  });

  it.each([
    { netYear: '999' }, { netYear: null }, { netYear: 1e30 }, { hfTotalYear: -1 },
    { taxYear: {} }, { cashNetYear: false }, { stockNetYear: -1 }, { recurringCashNetYear: '12' },
    { summary: {} }, { cityName: null }, { policyVersion: 1 }, { calculationVersion: '' }, { calculatedAt: 'bad' },
  ])('严格拒绝损坏的派生字段结构：%s', (patch) => {
    expect(() => parsePlanImport(file([{ ...makePlan(), ...patch }]))).toThrow();
  });

  it('合法金额的恶意汇总和文字摘要一律重算，旧引擎或政策版本也不可信', () => {
    const saved = makePlan();
    const poisoned = {
      ...saved, netYear: 1, cashNetYear: 2, stockNetYear: 3, recurringCashNetYear: 4,
      hfTotalYear: 5, taxYear: 6, summary: '<script>malicious</script>', cityName: '伪造城市',
      policyVersion: 'old-policy', calculationVersion: 'old-engine',
    };
    const imported = parsePlanImport(file([poisoned]));
    expect(imported).toEqual([{ ...saved, id: imported[0].id, calculatedAt: NOW }]);
    expect(JSON.parse(serializePlans([poisoned])).plans).toEqual([{ ...saved, calculatedAt: NOW }]);
  });

  it('输入边界 0/1e9 均可往返：年度汇总可负或超过单项输入金额上限', () => {
    for (const amount of [0, 1e9]) {
      const boundary = createPlanSnapshot({
        ...DEFAULT_FORM, monthlySalary: amount, salaryMonths: 16, bonus: amount,
        signingBonus: amount, stockIncome: amount, specialDeductionMonthly: amount,
        customSocialBase: amount, customHfBase: amount,
      }, `boundary-${amount}`, '边界');
      const [imported] = parsePlanImport(serializePlans([boundary]));
      expect(imported).toEqual({ ...boundary, id: imported.id });
      expect(Number.isFinite(imported.netYear)).toBe(true);
    }
  });

  it('原型污染键不被传播，输入的 companyName 不能覆盖快照公司名', () => {
    const poison = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"prototype":{"polluted":true}}');
    const saved = makePlan();
    const poisoned = { ...saved, ...poison, input: { ...saved.input, ...poison, companyName: '伪造' } };
    const [imported] = parsePlanImport(file([poisoned], poison));
    expect(imported).toEqual({ ...saved, id: imported.id, calculatedAt: NOW });
    expect(restorePlans([poisoned])).toEqual({ plans: [{ ...saved, calculatedAt: NOW }], changed: true });
    expect(Object.hasOwn(imported, '__proto__')).toBe(false);
    expect(Object.hasOwn(imported.input, 'constructor')).toBe(false);
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false);
  });

  it('按 UTF-8 字节限制 1 MB，而非只计算字符数', () => {
    expect(() => parsePlanImport(' '.repeat(1024 * 1024 + 1))).toThrow(/1 MB/);
    const text = file([makePlan()], { padding: '中'.repeat(400000) });
    expect(text.length).toBeLessThan(1024 * 1024);
    expect(() => parsePlanImport(text)).toThrow(/1 MB/);
    const base = file();
    expect(parsePlanImport(base + ' '.repeat(1024 * 1024 - new TextEncoder().encode(base).byteLength))).toHaveLength(1);
  });
});
