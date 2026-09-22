import { CALCULATION_VERSION, computeAnnual } from './calc/annual';
import type { SalaryInput } from './calc/annual';
import { describeInput, MAX_PLANS } from './calc/compare';
import type { PlanSnapshot } from './calc/compare';
import { round2 } from './calc/format';
import { CITIES } from './policy';
import type { CityId } from './policy';

export type FormState = SalaryInput & { companyName: string };

export const DEFAULT_FORM: FormState = Object.freeze({
  cityId: 'shanghai', monthlySalary: 20000, salaryMonths: 12, bonus: 0,
  signingBonus: 0, stockIncome: 0,
  hfRatio: CITIES.shanghai.housingFund.defaultRatio, hfSupplementRatio: 0,
  specialDeductionMonthly: 0, customSocialBase: null, customHfBase: null,
  companyName: '',
});

const MAX_AMOUNT = 1e9;
const MAX_FILE_BYTES = 1024 * 1024;
const FILE_FORMAT = 'salary-tool-plans';
const FILE_VERSION = 1;

export function currentPolicyVersion(cityId: CityId): string {
  return CITIES[cityId].dataVersion;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// 只读取自己的字段，并显式构造返回对象；不合并不可信的原型键或额外字段。
function own(value: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}

function isCityId(value: unknown): value is CityId {
  return typeof value === 'string' && Object.hasOwn(CITIES, value);
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT;
}

function isBase(value: unknown): value is number | null {
  return value === null || isAmount(value);
}

function isSalaryMonths(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 12 && value <= 16;
}

function isRatio(value: unknown, options: number[]): value is number {
  return typeof value === 'number' && options.includes(value);
}

function isCompanyName(value: unknown): value is string {
  return typeof value === 'string';
}

function isLabel(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function readInput(value: unknown): SalaryInput | null {
  if (!isRecord(value)) return null;
  const cityId = own(value, 'cityId');
  if (!isCityId(cityId)) return null;
  const monthlySalary = own(value, 'monthlySalary');
  const salaryMonths = own(value, 'salaryMonths');
  const bonus = own(value, 'bonus');
  // 仅迁移旧版本缺失的新增收入字段；显式的 null、字符串、undefined 均非法。
  const signingBonus = Object.hasOwn(value, 'signingBonus') ? own(value, 'signingBonus') : 0;
  const stockIncome = Object.hasOwn(value, 'stockIncome') ? own(value, 'stockIncome') : 0;
  const hfRatio = own(value, 'hfRatio');
  const hfSupplementRatio = own(value, 'hfSupplementRatio');
  const specialDeductionMonthly = own(value, 'specialDeductionMonthly');
  const customSocialBase = own(value, 'customSocialBase');
  const customHfBase = own(value, 'customHfBase');
  const policy = CITIES[cityId].housingFund;
  if (!isAmount(monthlySalary) || !isSalaryMonths(salaryMonths) || !isAmount(bonus)
    || !isAmount(signingBonus) || !isAmount(stockIncome) || !isAmount(specialDeductionMonthly)
    || !isRatio(hfRatio, policy.ratioOptions) || !isRatio(hfSupplementRatio, policy.supplementOptions)
    || !isBase(customSocialBase) || !isBase(customHfBase)) return null;
  return {
    cityId, monthlySalary, salaryMonths, bonus, signingBonus, stockIncome,
    hfRatio, hfSupplementRatio, specialDeductionMonthly, customSocialBase, customHfBase,
  };
}

/** 缓存表单按字段恢复，非法字段回退默认值；比例使用所恢复城市的默认档。 */
export function restoreForm(value: unknown): FormState {
  if (!isRecord(value)) return { ...DEFAULT_FORM };
  const savedCity = own(value, 'cityId');
  const cityId = isCityId(savedCity) ? savedCity : DEFAULT_FORM.cityId;
  const policy = CITIES[cityId].housingFund;
  const amount = (key: 'monthlySalary' | 'bonus' | 'signingBonus' | 'stockIncome' | 'specialDeductionMonthly') => {
    const saved = own(value, key);
    return isAmount(saved) ? saved : DEFAULT_FORM[key];
  };
  const base = (key: 'customSocialBase' | 'customHfBase') => {
    const saved = own(value, key);
    return isBase(saved) ? saved : DEFAULT_FORM[key];
  };
  const salaryMonths = own(value, 'salaryMonths');
  const hfRatio = own(value, 'hfRatio');
  const hfSupplementRatio = own(value, 'hfSupplementRatio');
  const companyName = own(value, 'companyName');
  return {
    cityId,
    monthlySalary: amount('monthlySalary'),
    salaryMonths: isSalaryMonths(salaryMonths) ? salaryMonths : DEFAULT_FORM.salaryMonths,
    bonus: amount('bonus'), signingBonus: amount('signingBonus'), stockIncome: amount('stockIncome'),
    hfRatio: isRatio(hfRatio, policy.ratioOptions) ? hfRatio : policy.defaultRatio,
    hfSupplementRatio: isRatio(hfSupplementRatio, policy.supplementOptions) ? hfSupplementRatio : 0,
    specialDeductionMonthly: amount('specialDeductionMonthly'),
    customSocialBase: base('customSocialBase'), customHfBase: base('customHfBase'),
    companyName: isCompanyName(companyName) ? companyName : DEFAULT_FORM.companyName,
  };
}

export function createPlanSnapshot(
  form: FormState,
  id: string,
  name: string,
  calculatedAt: string = new Date().toISOString(),
): PlanSnapshot {
  const input = readInput(form);
  const companyName = isRecord(form) ? own(form, 'companyName') : undefined;
  if (!input || !isCompanyName(companyName) || !isLabel(id) || !isLabel(name) || !isTimestamp(calculatedAt)) {
    throw new Error('方案参数无效，请检查输入。');
  }
  const { totals } = computeAnnual(input);
  return {
    id, name, companyName: companyName.trim(), cityName: CITIES[input.cityId].name,
    summary: describeInput(input),
    netYear: totals.netYear,
    cashNetYear: totals.cashNetYear,
    stockNetYear: totals.stockNetYear,
    recurringCashNetYear: totals.recurringCashNetYear,
    hfTotalYear: round2(totals.personalHfYear + totals.employerHfYear),
    taxYear: totals.taxYear,
    policyVersion: currentPolicyVersion(input.cityId),
    calculationVersion: CALCULATION_VERSION,
    calculatedAt,
    input,
  };
}

interface PlanSource {
  id: string;
  name: string;
  form: FormState;
  raw: Record<string, unknown>;
}

function readPlan(value: unknown): PlanSource | null {
  if (!isRecord(value)) return null;
  const id = own(value, 'id');
  const name = own(value, 'name');
  const companyName = own(value, 'companyName');
  const input = readInput(own(value, 'input'));
  if (!isLabel(id) || !isLabel(name) || !isCompanyName(companyName) || !input) return null;
  return { id, name, form: { ...input, companyName }, raw: value };
}

function matchesSnapshot(raw: Record<string, unknown>, plan: PlanSnapshot): boolean {
  const rawInput = own(raw, 'input');
  return isRecord(rawInput)
    && Object.keys(raw).length === Object.keys(plan).length
    && Object.entries(plan).every(([key, value]) => key === 'input' || own(raw, key) === value)
    && Object.keys(rawInput).length === Object.keys(plan.input).length
    && Object.entries(plan.input).every(([key, value]) => own(rawInput, key) === value);
}

/** 不信任历史摘要和汇总；保留前五个输入合法、id 不重复的方案。 */
export function restorePlans(value: unknown): { plans: PlanSnapshot[]; changed: boolean } {
  if (value === null || value === undefined) return { plans: [], changed: false };
  if (!Array.isArray(value)) return { plans: [], changed: true };
  const plans: PlanSnapshot[] = [];
  const ids = new Set<string>();
  let changed = value.length > MAX_PLANS;
  for (const entry of value) {
    if (plans.length === MAX_PLANS) break;
    const source = readPlan(entry);
    if (!source || ids.has(source.id)) {
      changed = true;
      continue;
    }
    const savedTime = own(source.raw, 'calculatedAt');
    const plan = createPlanSnapshot(source.form, source.id, source.name, isTimestamp(savedTime) ? savedTime : undefined);
    if (!matchesSnapshot(source.raw, plan)) {
      changed = true;
      plan.calculatedAt = new Date().toISOString();
    }
    ids.add(plan.id);
    plans.push(plan);
  }
  return { plans, changed };
}

// 输入金额上限为 1e9，年度汇总可含最多 16 薪 + 三类收入，不能套用单项上限。
// 低薪时现金净额可因最低缴费基数为负；这些汇总只检查结构，数值永不参与计算。
function isStoredTotal(value: unknown, allowNegative: boolean): boolean {
  return typeof value === 'number' && Number.isFinite(value)
    && value <= MAX_AMOUNT * 19 && value >= (allowNegative ? -MAX_AMOUNT * 19 : 0);
}

function readFilePlans(value: unknown): PlanSource[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_PLANS) {
    throw new Error(`方案文件必须包含 1–${MAX_PLANS} 个方案。`);
  }
  const ids = new Set<string>();
  return Array.from(value, (entry, index) => {
    const source = readPlan(entry);
    const invalid = () => new Error(`第 ${index + 1} 个方案无效，请检查输入、金额和版本信息。`);
    if (!source || ids.has(source.id)) throw invalid();
    const raw = source.raw;
    if (typeof own(raw, 'cityName') !== 'string' || typeof own(raw, 'summary') !== 'string'
      || !isStoredTotal(own(raw, 'netYear'), true)
      || !isStoredTotal(own(raw, 'hfTotalYear'), false)
      || !isStoredTotal(own(raw, 'taxYear'), false)) throw invalid();
    for (const key of ['cashNetYear', 'stockNetYear', 'recurringCashNetYear']) {
      if (Object.hasOwn(raw, key) && !isStoredTotal(own(raw, key), key !== 'stockNetYear')) throw invalid();
    }
    for (const key of ['policyVersion', 'calculationVersion']) {
      if (Object.hasOwn(raw, key) && !isLabel(own(raw, key))) throw invalid();
    }
    if (Object.hasOwn(raw, 'calculatedAt') && !isTimestamp(own(raw, 'calculatedAt'))) throw invalid();
    ids.add(source.id);
    return source;
  });
}

export function serializePlans(plans: PlanSnapshot[]): string {
  const sources = readFilePlans(plans);
  const current = sources.map(({ form, id, name, raw }) => {
    const time = own(raw, 'calculatedAt');
    const plan = createPlanSnapshot(form, id, name, isTimestamp(time) ? time : undefined);
    if (!matchesSnapshot(raw, plan)) plan.calculatedAt = new Date().toISOString();
    return plan;
  });
  const text = JSON.stringify({
    format: FILE_FORMAT, version: FILE_VERSION, exportedAt: new Date().toISOString(), plans: current,
  }, null, 2);
  checkFileSize(text);
  return text;
}

function checkFileSize(text: string): void {
  if (text.length > MAX_FILE_BYTES || new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES) {
    throw new Error('方案文件不能超过 1 MB。');
  }
}

/** 全部验证通过才导入；新 id 和计算时间用于追加，现有方案数量由调用方控制。 */
export function parsePlanImport(text: string): PlanSnapshot[] {
  if (typeof text !== 'string') throw new Error('方案文件必须是 JSON 文本。');
  checkFileSize(text);
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('方案文件不是有效的 JSON。');
  }
  if (!isRecord(value) || own(value, 'format') !== FILE_FORMAT || own(value, 'version') !== FILE_VERSION
    || !isTimestamp(own(value, 'exportedAt'))) {
    throw new Error('不支持的方案文件格式或版本。');
  }
  const sources = readFilePlans(own(value, 'plans'));
  return sources.map(({ form, name }) => createPlanSnapshot(form, crypto.randomUUID(), name));
}
