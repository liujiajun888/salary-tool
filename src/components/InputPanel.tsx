import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { CITY_LIST } from '../policy';
import type { CityPolicy } from '../policy/types';
import { formatMoney, formatPercent } from '../calc/format';
import type { SalaryInput } from '../calc/annual';

export type FormState = SalaryInput & { companyName: string };

interface Props {
  form: FormState;
  policy: CityPolicy;
  socialBase: number;
  hfBase: number;
  patch: (p: Partial<FormState>) => void;
}

const labelCls = 'block text-xs text-gray-500 mb-1';
const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const overrideCls = 'border-orange-400 ring-1 ring-orange-300';

// 受控数字输入的草稿模式：编辑期间显示原文，仅提交可解析且非中间态的值，
// 避免逐键 Number() 回写吞掉 "0." / "12." 等中间输入
function NumberField({
  value,
  onChange,
  id,
  placeholder,
  className,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  id: string;
  placeholder?: string;
  className: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === null ? '' : String(value));
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDraft(v);
    if (v === '') {
      onChange(null);
      return;
    }
    if (v.endsWith('.') || v === '-') return;
    const n = Number(v);
    if (Number.isFinite(n)) onChange(Math.max(0, n));
  };
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={0}
      className={className}
      placeholder={placeholder}
      value={shown}
      onChange={handle}
      onBlur={() => setDraft(null)}
    />
  );
}

export default function InputPanel({ form, policy, socialBase, hfBase, patch }: Props) {
  const cityClick = (c: CityPolicy) => {
    if (c.id === form.cityId) return;
    patch({
      cityId: c.id,
      hfRatio: c.housingFund.defaultRatio,
      hfSupplementRatio: 0,
      customSocialBase: null,
      customHfBase: null,
    });
  };

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div>
        <label className={labelCls} htmlFor="company-name">公司名称</label>
        <input
          id="company-name"
          type="text"
          className={inputCls}
          placeholder="选填，保存方案时作为方案名称"
          value={form.companyName}
          onChange={(e) => patch({ companyName: e.target.value })}
        />
      </div>
      <div>
        <span className={labelCls}>工作城市</span>
        <div className="flex gap-2">
          {CITY_LIST.map((c) => (
            <button
              key={c.id}
              onClick={() => cityClick(c)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                form.cityId === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="monthly-salary">月薪（税前，元/月）</label>
        <NumberField
          id="monthly-salary"
          className={inputCls}
          value={form.monthlySalary}
          onChange={(v) => patch({ monthlySalary: v ?? 0 })}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="salary-months">薪数</label>
        <select
          id="salary-months"
          className={inputCls}
          value={form.salaryMonths}
          onChange={(e) => patch({ salaryMonths: Number(e.target.value) })}
        >
          {[12, 13, 14, 15, 16].map((m) => (
            <option key={m} value={m}>{m} 薪</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">超出 12 的部分按奖金单独计税</p>
      </div>

      <div>
        <label className={labelCls} htmlFor="bonus">年终奖（元）</label>
        <NumberField
          id="bonus"
          className={inputCls}
          value={form.bonus}
          onChange={(v) => patch({ bonus: v ?? 0 })}
        />
      </div>

      <div>
        <label className={labelCls} htmlFor="hf-ratio">基本公积金比例（单位 = 个人）</label>
        <select
          id="hf-ratio"
          className={inputCls}
          value={form.hfRatio}
          onChange={(e) => patch({ hfRatio: Number(e.target.value) })}
        >
          {policy.housingFund.ratioOptions.map((r) => (
            <option key={r} value={r}>{formatPercent(r)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls} htmlFor="hf-supplement">补充公积金比例（单位 = 个人）</label>
        <select
          id="hf-supplement"
          className={inputCls}
          value={form.hfSupplementRatio}
          onChange={(e) => patch({ hfSupplementRatio: Number(e.target.value) })}
        >
          {policy.housingFund.supplementOptions.map((r) => (
            <option key={r} value={r}>{r === 0 ? '无' : formatPercent(r)}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">上海政策上限 5%；杭州以单位实际执行为准</p>
      </div>

      <div>
        <label className={labelCls} htmlFor="special-deduction">每月专项附加扣除（元）</label>
        <NumberField
          id="special-deduction"
          className={inputCls}
          value={form.specialDeductionMonthly}
          onChange={(v) => patch({ specialDeductionMonthly: v ?? 0 })}
        />
        <p className="mt-1 text-xs text-gray-400">房租/房贷、子女教育、赡养老人等每月合计</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls} htmlFor="custom-social-base">社保基数</label>
          <NumberField
            id="custom-social-base"
            className={`${inputCls} ${form.customSocialBase !== null ? overrideCls : ''}`}
            placeholder={`自动 ¥${formatMoney(socialBase)}`}
            value={form.customSocialBase}
            onChange={(v) => patch({ customSocialBase: v })}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="custom-hf-base">公积金基数</label>
          <NumberField
            id="custom-hf-base"
            className={`${inputCls} ${form.customHfBase !== null ? overrideCls : ''}`}
            placeholder={`自动 ¥${formatMoney(hfBase)}`}
            value={form.customHfBase}
            onChange={(v) => patch({ customHfBase: v })}
          />
        </div>
      </div>
      {(form.customSocialBase !== null || form.customHfBase !== null) && (
        <p className="text-xs text-orange-500">已自定义，偏离默认 clamp 值</p>
      )}

      <p className="text-xs text-gray-400">
        {policy.name} {policy.year} 年政策 · 社保基数下限 ¥{formatMoney(policy.social.minBase)} / 上限 ¥{formatMoney(policy.social.maxBase)}
      </p>
    </section>
  );
}
