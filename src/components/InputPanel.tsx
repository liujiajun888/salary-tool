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
  const [extrasOpen, setExtrasOpen] = useState(form.signingBonus > 0 || form.stockIncome > 0);
  const [basesOpen, setBasesOpen] = useState(form.customSocialBase !== null || form.customHfBase !== null);
  const cityClick = (city: CityPolicy) => {
    if (city.id === form.cityId) return;
    patch({ cityId: city.id, hfRatio: city.housingFund.defaultRatio, hfSupplementRatio: 0, customSocialBase: null, customHfBase: null });
  };
  const overridden = form.customSocialBase !== null || form.customHfBase !== null;
  return (
    <section className="panel" aria-labelledby="input-heading">
      <div className="panel-heading"><div><h2 id="input-heading">薪资参数</h2><p className="help">修改即计算 · 金额单位为人民币元</p></div><span className="pill">年度估算</span></div>
      {editingName && <div className="notice notice-neutral">正在编辑「{editingName}」，保存后覆盖原方案。</div>}
      <div className="section-label"><span className="section-index">01</span> 基本薪资</div>
      <div className="field">
        <label htmlFor="company-name">公司 / 方案名称 <span className="muted">（选填）</span></label>
        <input id="company-name" className="form-control" maxLength={80} placeholder="例如：当前工作、新 Offer" value={form.companyName} onChange={(event) => patch({ companyName: event.target.value })} />
      </div>
      <div className="field">
        <span className="field-label" id="city-label">工作城市</span>
        <div className="segmented" role="group" aria-labelledby="city-label">
          {CITY_LIST.map((city) => <button key={city.id} aria-pressed={form.cityId === city.id} onClick={() => cityClick(city)}>{city.name}</button>)}
        </div>
        <p className="help">切换城市会重置缴存比例和自定义基数。</p>
      </div>
      <div className="field-grid">
        <div className="field"><label htmlFor="monthly-salary">税前月薪</label><NumberField id="monthly-salary" value={form.monthlySalary} onChange={(value) => patch({ monthlySalary: value ?? 0 })} describedBy="salary-help" /></div>
        <div className="field"><label htmlFor="salary-months">全年薪数</label><select id="salary-months" className="form-control" value={form.salaryMonths} onChange={(event) => patch({ salaryMonths: Number(event.target.value) })}>
          {[12, 13, 14, 15, 16].map((months) => <option key={months} value={months}>{months} 薪</option>)}
        </select></div>
      </div>
      <p className="help" id="salary-help">超出 12 薪的部分并入 12 月工资，按累计预扣计税。</p>
      {form.monthlySalary <= 0 && <p className="help negative" role="status">请输入大于 0 的税前月薪后查看结果。</p>}
      <div className="section-label"><span className="section-index">02</span> 奖金与股权</div>
      <div className="field"><label htmlFor="bonus">全年一次性奖金</label><NumberField id="bonus" value={form.bonus} onChange={(value) => patch({ bonus: value ?? 0 })} describedBy="bonus-help" /><p className="help" id="bonus-help">与额外薪数分开填写，避免重复计入年终奖。</p></div>
      <details className="disclosure" open={extrasOpen} onToggle={(event) => setExtrasOpen(event.currentTarget.open)}>
        <summary>签字费与股权激励（选填）</summary>
        <div className="field"><label htmlFor="signing-bonus">签字费</label><NumberField id="signing-bonus" value={form.signingBonus} onChange={(value) => patch({ signingBonus: value ?? 0 })} describedBy="signing-help" /><p className="help" id="signing-help">首年一次性收入；本模型假设并入 12 月工资计税。</p></div>
        <div className="field"><label htmlFor="stock-income">本年度股权激励应税收入</label><NumberField id="stock-income" value={form.stockIncome} onChange={(value) => patch({ stockIncome: value ?? 0 })} describedBy="stock-help" /><p className="help" id="stock-help">不是股票市值或交易收益；仅模拟符合单独计税条件的股权激励，同年多次取得请合计填写，税后估值不计入现金到手。</p></div>
        {form.stockIncome > 0 && <div className="notice">请先向单位确认单独计税资格及本年度应税金额；不适用该政策的股权暂不支持测算。</div>}
      </details>
      <div className="section-label"><span className="section-index">03</span> 社保与扣除</div>
      <div className="field-grid">
        <div className="field"><label htmlFor="hf-ratio">个人公积金比例</label><select id="hf-ratio" className="form-control" value={form.hfRatio} onChange={(event) => patch({ hfRatio: Number(event.target.value) })}>{policy.housingFund.ratioOptions.map((ratio) => <option key={ratio} value={ratio}>{formatPercent(ratio)}</option>)}</select></div>
        <div className="field"><label htmlFor="hf-supplement">{form.cityId === 'hangzhou' ? '自定义补充比例' : '补充公积金'}</label><select id="hf-supplement" className="form-control" value={form.hfSupplementRatio} onChange={(event) => patch({ hfSupplementRatio: Number(event.target.value) })}>{policy.housingFund.supplementOptions.map((ratio) => <option key={ratio} value={ratio}>{ratio === 0 ? '无' : formatPercent(ratio)}</option>)}</select></div>
      </div>
      {form.hfSupplementRatio > 0 && <div className="notice">基本与补充合计共享 12% 扣除上限；超过部分按个人不可扣除、单位并入工资计税。{form.cityId === 'hangzhou' ? '杭州补充比例仅模拟单位自定义方案，并非普遍政策。' : '补充制度须由单位自愿参加。'}请确认资格及扣税基数。</div>}
      <div className="field field-spaced"><label htmlFor="special-deduction">每月专项附加扣除合计</label><NumberField id="special-deduction" value={form.specialDeductionMonthly} onChange={(value) => patch({ specialDeductionMonthly: value ?? 0 })} describedBy="deduction-help" /><p className="help" id="deduction-help">填写个税 App 中已确认的每月扣除额。</p></div>
      <button className="button button-quiet button-small" aria-expanded={showDeductions} aria-controls="deduction-helper" onClick={() => setShowDeductions(!showDeductions)}>{showDeductions ? '收起分类合计' : '按扣除项目辅助合计'}</button>
      {showDeductions && <DeductionHelper onApply={(total) => { patch({ specialDeductionMonthly: total }); setShowDeductions(false); }} />}
      <details className="disclosure" open={basesOpen} onToggle={(event) => setBasesOpen(event.currentTarget.open)}>
        <summary>自定义缴费基数</summary>
        <p className="help">默认按月薪估算并限制在城市上下限内；实际基数可能采用上年度月平均工资。</p>
        <div className="field field-spaced"><label htmlFor="custom-social-base">社保基数</label><NumberField id="custom-social-base" placeholder={`自动 ${formatMoney(socialBase)}`} value={form.customSocialBase} onChange={(value) => patch({ customSocialBase: value })} /></div>
        <div className="field"><label htmlFor="custom-hf-base">公积金基数</label><NumberField id="custom-hf-base" placeholder={`自动 ${formatMoney(hfBase)}`} value={form.customHfBase} onChange={(value) => patch({ customHfBase: value })} /></div>
        <p className="help">实际采用：社保 ¥{formatMoney(socialBase)} / 公积金 ¥{formatMoney(hfBase)}；超出上下限的输入会按上下限计算。</p>
        {overridden && <button className="button button-quiet button-small" onClick={() => patch({ customSocialBase: null, customHfBase: null })}>恢复自动基数</button>}
      </details>
      <div className="disclosure">
        <button className="button button-primary full-width" disabled={!canSave || form.monthlySalary <= 0} onClick={onSave}>{editingName ? '更新方案' : '保存为对比方案'}</button>
        {editingName && <button className="button button-quiet full-width" onClick={onCancelEdit}>取消编辑</button>}
        {!canSave && <p className="help">最多保存 5 个方案，请先在对比区移除一个。</p>}
        <p className="help">仅保存在当前浏览器，不上传薪资数据。</p>
      </div>
    </section>
  );
}
