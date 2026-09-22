import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { CITY_LIST } from '../policy';
import type { CityPolicy } from '../policy/types';
import { formatMoney, formatPercent } from '../calc/format';
import type { FormState } from '../storage';
import DeductionHelper from './DeductionHelper';

interface Props {
  form: FormState;
  policy: CityPolicy;
  socialBase: number;
  hfBase: number;
  patch: (p: Partial<FormState>) => void;
  onSave: () => void;
  canSave: boolean;
  editingName?: string;
  onCancelEdit: () => void;
}

function NumberField({ value, onChange, id, placeholder, describedBy }: {
  value: number | null; onChange: (v: number | null) => void; id: string; placeholder?: string; describedBy?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const handle = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    if (!/^\d*(\.\d{0,2})?$/.test(text)) return;
    if (text === '' || text === '.') { setDraft(text); onChange(null); return; }
    const number = Math.min(1_000_000_000, Number(text));
    setDraft(Number(text) > 1_000_000_000 ? String(number) : text);
    onChange(number);
  };
  return <input id={id} className="form-control" type="text" inputMode="decimal" autoComplete="off" aria-describedby={describedBy}
    placeholder={placeholder} value={draft ?? (value === null ? '' : String(value))} onChange={handle} onBlur={() => setDraft(null)} />;
}

export default function InputPanel({ form, policy, socialBase, hfBase, patch, onSave, canSave, editingName, onCancelEdit }: Props) {
  const [showDeductions, setShowDeductions] = useState(false);
  const cityClick = (city: CityPolicy) => {
    if (city.id === form.cityId) return;
    patch({ cityId: city.id, hfRatio: city.housingFund.defaultRatio, hfSupplementRatio: 0, customSocialBase: null, customHfBase: null });
  };
  const overridden = form.customSocialBase !== null || form.customHfBase !== null;
  return (
    <section className="panel" aria-labelledby="input-heading">
      <div className="panel-heading"><h2 id="input-heading">薪资参数</h2></div>
      {editingName && <div className="notice notice-neutral">正在编辑「{editingName}」，保存后覆盖原方案。</div>}
      <div className="section-label">基本薪资</div>
      <div className="field">
        <label htmlFor="company-name">公司 / 方案名称 <span className="muted">（选填）</span></label>
        <input id="company-name" className="form-control" maxLength={80} placeholder="例如：当前工作、新 Offer" value={form.companyName} onChange={(event) => patch({ companyName: event.target.value })} />
      </div>
      <div className="field">
        <span className="field-label" id="city-label">工作城市</span>
        <div className="segmented" role="group" aria-labelledby="city-label">
          {CITY_LIST.map((city) => <button key={city.id} aria-pressed={form.cityId === city.id} onClick={() => cityClick(city)}>{city.name}</button>)}
        </div>
      </div>
      <div className="field-grid">
        <div className="field"><label htmlFor="monthly-salary">税前月薪</label><NumberField id="monthly-salary" value={form.monthlySalary} onChange={(value) => patch({ monthlySalary: value ?? 0 })} describedBy="salary-help" /></div>
        <div className="field"><label htmlFor="salary-months">全年薪数</label><select id="salary-months" className="form-control" value={form.salaryMonths} onChange={(event) => patch({ salaryMonths: Number(event.target.value) })}>
          {[12, 13, 14, 15, 16].map((months) => <option key={months} value={months}>{months} 薪</option>)}
        </select></div>
      </div>
      <p className="help" id="salary-help">超出 12 薪部分计入 12 月工资，累计预扣个税。</p>
      {form.monthlySalary <= 0 && <p className="help negative" role="status">请输入大于 0 的税前月薪后查看结果。</p>}
      <div className="section-label">奖金与股权</div>
      <div className="field"><label htmlFor="bonus">全年一次性奖金</label><NumberField id="bonus" value={form.bonus} onChange={(value) => patch({ bonus: value ?? 0 })} describedBy="bonus-help" /><p className="help" id="bonus-help">勿与额外薪数重复填写。</p></div>
      <div>
        <div className="field"><label htmlFor="signing-bonus">签字费</label><NumberField id="signing-bonus" value={form.signingBonus} onChange={(value) => patch({ signingBonus: value ?? 0 })} describedBy="signing-help" /><p className="help" id="signing-help">仅计首年，假设并入 12 月工资计税。</p></div>
        <div className="field"><label htmlFor="stock-income">本年度股权激励应税收入</label><NumberField id="stock-income" value={form.stockIncome} onChange={(value) => patch({ stockIncome: value ?? 0 })} describedBy="stock-help" /><p className="help" id="stock-help">填全年应税收入合计，非股票市值或交易收益；税后估值不计入现金。</p></div>
        {form.stockIncome > 0 && <div className="notice">仅支持符合单独计税条件的股权激励，请向单位确认资格及应税金额。</div>}
      </div>
      <div className="section-label">社保与扣除</div>
      <div className="field-grid">
        <div className="field"><label htmlFor="hf-ratio">个人公积金比例</label><select id="hf-ratio" className="form-control" value={form.hfRatio} onChange={(event) => patch({ hfRatio: Number(event.target.value) })}>{policy.housingFund.ratioOptions.map((ratio) => <option key={ratio} value={ratio}>{formatPercent(ratio)}</option>)}</select></div>
        <div className="field"><label htmlFor="hf-supplement">{form.cityId === 'hangzhou' ? '自定义补充比例' : '补充公积金'}</label><select id="hf-supplement" className="form-control" value={form.hfSupplementRatio} onChange={(event) => patch({ hfSupplementRatio: Number(event.target.value) })}>{policy.housingFund.supplementOptions.map((ratio) => <option key={ratio} value={ratio}>{ratio === 0 ? '无' : formatPercent(ratio)}</option>)}</select></div>
      </div>
      {form.hfSupplementRatio > 0 && <div className="notice">基本与补充共用 12% 扣除上限；个人超额不抵税，单位超额并入工资计税。{form.cityId === 'hangzhou' ? '杭州补充比例仅模拟单位方案，非普遍政策。' : '补充公积金须单位自愿参加。'}</div>}
      <div className="field field-spaced"><label htmlFor="special-deduction">每月专项附加扣除合计</label><NumberField id="special-deduction" value={form.specialDeductionMonthly} onChange={(value) => patch({ specialDeductionMonthly: value ?? 0 })} describedBy="deduction-help" /><p className="help" id="deduction-help">填写个税 App 中已确认的每月扣除额。</p></div>
      <button className="button button-quiet button-small" aria-expanded={showDeductions} aria-controls="deduction-helper" onClick={() => setShowDeductions(!showDeductions)}>{showDeductions ? '收起分类合计' : '按扣除项目辅助合计'}</button>
      {showDeductions && <DeductionHelper onApply={(total) => { patch({ specialDeductionMonthly: total }); setShowDeductions(false); }} />}
      <div className="field-grid field-spaced">
        <div className="field"><label htmlFor="custom-social-base">社保基数</label><NumberField id="custom-social-base" placeholder={`自动 ${formatMoney(socialBase)}`} value={form.customSocialBase} onChange={(value) => patch({ customSocialBase: value })} /></div>
        <div className="field"><label htmlFor="custom-hf-base">公积金基数</label><NumberField id="custom-hf-base" placeholder={`自动 ${formatMoney(hfBase)}`} value={form.customHfBase} onChange={(value) => patch({ customHfBase: value })} /></div>
      </div>
      <p className="help" id="base-help">实际基数：社保 ¥{formatMoney(socialBase)} / 公积金 ¥{formatMoney(hfBase)}，受城市上下限限制。</p>
      {overridden && <button className="button button-quiet button-small" onClick={() => patch({ customSocialBase: null, customHfBase: null })}>恢复自动基数</button>}
      <div className="disclosure">
        <button className="button button-primary full-width" disabled={!canSave || form.monthlySalary <= 0} onClick={onSave}>{editingName ? '更新方案' : '保存为对比方案'}</button>
        {editingName && <button className="button button-quiet full-width" onClick={onCancelEdit}>取消编辑</button>}
        {!canSave && <p className="help">最多保存 5 个方案，请先在对比区移除一个。</p>}
      </div>
    </section>
  );
}
