import type { ChangeEvent } from 'react';
import { CITY_LIST } from '../policy';
import type { CityId, CityPolicy } from '../policy/types';
import { formatMoney, formatPercent } from '../calc/format';

export interface FormState {
  cityId: CityId;
  monthlySalary: number;
  salaryMonths: number;
  bonus: number;
  hfRatio: number;
  hfSupplementRatio: number;
  specialDeductionMonthly: number;
  customSocialBase: number | null;
  customHfBase: number | null;
}

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

export default function InputPanel({ form, policy, socialBase, hfBase, patch }: Props) {
  const num =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      patch({ [key]: Number(e.target.value) || 0 } as Partial<FormState>);

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div>
        <span className={labelCls}>工作城市</span>
        <div className="flex gap-2">
          {CITY_LIST.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                patch({
                  cityId: c.id,
                  hfRatio: c.housingFund.defaultRatio,
                  customSocialBase: null,
                  customHfBase: null,
                })
              }
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
        <label className={labelCls}>月薪（税前，元/月）</label>
        <input type="number" min={0} className={inputCls} value={form.monthlySalary} onChange={num('monthlySalary')} />
      </div>

      <div>
        <label className={labelCls}>薪数</label>
        <select
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
        <label className={labelCls}>年终奖（元）</label>
        <input type="number" min={0} className={inputCls} value={form.bonus} onChange={num('bonus')} />
      </div>

      <div>
        <label className={labelCls}>基本公积金比例（单位 = 个人）</label>
        <select
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
        <label className={labelCls}>补充公积金比例（单位 = 个人）</label>
        <select
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
        <label className={labelCls}>每月专项附加扣除（元）</label>
        <input type="number" min={0} className={inputCls} value={form.specialDeductionMonthly} onChange={num('specialDeductionMonthly')} />
        <p className="mt-1 text-xs text-gray-400">房租/房贷、子女教育、赡养老人等每月合计</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>社保基数</label>
          <input
            type="number" min={0}
            className={`${inputCls} ${form.customSocialBase !== null ? overrideCls : ''}`}
            placeholder={`自动 ¥${formatMoney(socialBase)}`}
            value={form.customSocialBase ?? ''}
            onChange={(e) => patch({ customSocialBase: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>公积金基数</label>
          <input
            type="number" min={0}
            className={`${inputCls} ${form.customHfBase !== null ? overrideCls : ''}`}
            placeholder={`自动 ¥${formatMoney(hfBase)}`}
            value={form.customHfBase ?? ''}
            onChange={(e) => patch({ customHfBase: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {policy.name} {policy.year} 年政策 · 社保基数下限 ¥{formatMoney(policy.social.minBase)} / 上限 ¥{formatMoney(policy.social.maxBase)}
      </p>
    </section>
  );
}
