import { useState } from 'react';
import { MAX_PLANS } from '../calc/compare';
import type { PlanSnapshot } from '../calc/compare';
import { formatMoney, round2 } from '../calc/format';

interface Props {
  plans: PlanSnapshot[];
  editingId: string | null;
  onEdit: (plan: PlanSnapshot) => void;
  onLoad: (plan: PlanSnapshot) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  canSave: boolean;
  onExport: () => void;
  onImport: () => void;
  importing: boolean;
}

export default function PlanComparePanel({ plans, editingId, onEdit, onLoad, onDelete, onSave, canSave, onExport, onImport, importing }: Props) {
  const [period, setPeriod] = useState<'first' | 'recurring'>('first');
  const [baselineId, setBaselineId] = useState('');
  const baseline = plans.find((plan) => plan.id === baselineId) ?? plans[0];
  const cash = (plan: PlanSnapshot) => period === 'first' ? plan.cashNetYear : plan.recurringCashNetYear;
  const maxCash = plans.length ? Math.max(...plans.map(cash)) : 0;
  const leaders = plans.filter((plan) => cash(plan) === maxCash);
  const rows: { label: string; value: (plan: PlanSnapshot) => number; highlight?: boolean }[] = [
    { label: '税前月薪', value: (plan) => plan.input.monthlySalary },
    { label: '年终奖（税前）', value: (plan) => plan.input.bonus },
    { label: '签字费（税前）', value: (plan) => period === 'first' ? plan.input.signingBonus : 0 },
    { label: '年度现金到手', value: cash, highlight: true },
    { label: '股权税后估值', value: (plan) => plan.stockNetYear },
    { label: '公积金入账', value: (plan) => plan.hfTotalYear },
    { label: '三项合计（含非现金）', value: (plan) => cash(plan) + plan.stockNetYear + plan.hfTotalYear },
  ];
  return (
    <section className="panel" aria-labelledby="compare-heading">
      <div className="panel-heading"><div><p className="eyebrow">Compare your offers</p><h2 id="compare-heading">方案对比 <span className="muted small">{plans.length} / {MAX_PLANS}</span></h2><p className="help">把一次性收入与长期薪酬分开，避免只看总包</p></div><div className="actions"><button className="button button-secondary" disabled={importing} onClick={onImport}>{importing ? '正在导入…' : '导入方案'}</button><button className="button button-secondary" disabled={plans.length === 0} onClick={onExport}>导出备份</button><button className="button button-primary" disabled={!canSave} onClick={onSave}>{editingId ? '更新当前方案' : '保存当前参数'}</button></div></div>
      {plans.length === 0 ? <div className="empty-state"><h3>好的选择，从有依据的比较开始</h3><p>保存当前工作，再填入新 Offer；从现金、股权与公积金三个维度，看看真正的差额。</p></div> : <>
        <div className="compare-cards">{plans.map((plan) => <article key={plan.id} className={`plan-card ${editingId === plan.id ? 'plan-card-active' : ''}`}>
          <div className="actions"><h3 className="plan-name">{plan.name}</h3><span className="pill">{plan.cityName}</span>{editingId === plan.id && <span className="pill pill-primary">编辑中</span>}</div>
          <p className="plan-description">{plan.summary}</p>
          <p className="stat-note">{period === 'first' ? '首年' : '后续年度'}现金到手</p><p className="plan-value money">¥{formatMoney(cash(plan))}</p>
          <div className="actions"><button className="button button-secondary button-small" onClick={() => onEdit(plan)} aria-label={`编辑${plan.name}`}>编辑</button><button className="button button-quiet button-small" onClick={() => onLoad(plan)} aria-label={`载入${plan.name}`}>载入</button><button className="button button-quiet button-small button-danger" onClick={() => onDelete(plan.id)} aria-label={`删除${plan.name}`}>删除</button></div>
          <details className="disclosure"><summary>计算记录</summary><p className="help">计算时间：{new Date(plan.calculatedAt).toLocaleString('zh-CN')}<br />数据版本：{plan.policyVersion}<br />算法版本：{plan.calculationVersion}</p></details>
        </article>)}</div>
        {plans.length === 1 ? <p className="notice notice-neutral">再保存一个方案，即可查看横向对比与现金差额。</p> : <>
          <div className="panel-heading"><div className="segmented" role="group" aria-label="比较年度"><button aria-pressed={period === 'first'} onClick={() => setPeriod('first')}>首年收入</button><button aria-pressed={period === 'recurring'} onClick={() => setPeriod('recurring')}>后续年度</button></div><div className="actions"><label className="small" htmlFor="baseline-plan">对比基准</label><select className="form-control baseline-select" id="baseline-plan" value={baseline.id} onChange={(event) => setBaselineId(event.target.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></div></div>
          {period === 'recurring' && <p className="notice notice-neutral">仅移除签字费，其他薪资、奖金、股权及政策保持不变，并重新选择最优奖金计税方式；不是未来收入保证。</p>}
          <div className="table-scroll" role="region" aria-label="方案对比表，可横向滚动" tabIndex={0}><table className="data-table compare-table"><thead><tr><th scope="col">比较维度 · 元 / 年</th>{plans.map((plan) => <th key={plan.id} scope="col">{plan.name}{plan.id === baseline.id && <span className="row-note">基准方案</span>}</th>)}</tr></thead><tbody>
            <tr><th scope="row">全年薪数</th>{plans.map((plan) => <td key={plan.id}>{plan.input.salaryMonths} 薪</td>)}</tr>
            {rows.map((item) => <tr key={item.label}><th scope="row">{item.label}</th>{plans.map((plan) => <td className={item.highlight && cash(plan) === maxCash ? 'emphasized-cell' : ''} key={plan.id}>{formatMoney(item.value(plan))}</td>)}</tr>)}
            <tr><th scope="row">现金较基准差额</th>{plans.map((plan) => { const delta = round2(cash(plan) - cash(baseline)); return <td className={delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'muted'} key={plan.id}>{delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`}</td>; })}</tr>
          </tbody></table></div>
          <p className="inline-explanation">{leaders.length === plans.length ? '各方案年度现金到手相同。' : `${leaders.map((plan) => plan.name).join('、')}${leaders.length > 1 ? '并列' : ''}现金到手最高。`}股权估值和公积金不等同于可支配现金，不以税额最低作为整体最优标准。</p>
        </>}
      </>}
      <p className="help">本地方案统一按当前数据与算法重算，不作为历史工资单；导出文件包含薪资信息，请妥善保管。</p>
    </section>
  );
}
