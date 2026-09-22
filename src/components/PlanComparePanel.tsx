import { useId, useMemo, useState } from 'react';
import { MAX_PLANS } from '../calc/compare';
import type { PlanSnapshot } from '../calc/compare';
import { computeAnnual } from '../calc/annual';
import { formatMoney, formatPercent, round2 } from '../calc/format';
import ResultPanel from './ResultPanel';

interface Props {
  plans: PlanSnapshot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (plan: PlanSnapshot) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: () => void;
  importing: boolean;
  active: boolean;
}

export default function PlanComparePanel({ plans, selectedId, onSelect, onEdit, onDelete, onExport, onImport, importing, active }: Props) {
  const [period, setPeriod] = useState<'first' | 'recurring'>('first');
  const [baselineId, setBaselineId] = useState('');
  const detailId = useId();
  const selected = plans.find((plan) => plan.id === selectedId);
  const selectedInput = useMemo(() => selected ? { ...selected.input, signingBonus: period === 'recurring' ? 0 : selected.input.signingBonus } : null, [selected, period]);
  const selectedResult = useMemo(() => selectedInput ? computeAnnual(selectedInput) : null, [selectedInput]);
  const baseline = plans.find((plan) => plan.id === baselineId) ?? plans[0];
  const cash = (plan: PlanSnapshot) => period === 'first' ? plan.cashNetYear : plan.recurringCashNetYear;
  const maxCash = plans.length ? Math.max(...plans.map(cash)) : 0;
  const rows = [
    { label: '年度现金到手', value: cash },
    { label: '公积金入账', value: (plan: PlanSnapshot) => plan.hfTotalYear },
    { label: '股权税后估值', value: (plan: PlanSnapshot) => plan.stockNetYear },
    { label: '合计（含非现金）', value: (plan: PlanSnapshot) => cash(plan) + plan.stockNetYear + plan.hfTotalYear },
  ];
  return (
    <section className="panel" aria-labelledby="compare-heading">
      <div className="panel-heading"><h2 id="compare-heading">方案对比 <span className="muted small">{plans.length} / {MAX_PLANS}</span></h2>
        <details className="plan-tools"><summary>导入 / 导出</summary><div className="actions"><button className="button button-secondary button-small" disabled={importing} onClick={onImport}>{importing ? '正在导入…' : '导入方案'}</button><button className="button button-secondary button-small" disabled={plans.length === 0} onClick={onExport}>导出备份</button></div><p className="help">文件包含薪资信息，请妥善保管。</p></details>
      </div>
      {plans.length === 0 ? <p className="empty-state">还没有方案。在薪资参数页保存后，即可比较。</p> : <>
        <div className="segmented comparison-period" role="group" aria-label="比较年度"><button aria-pressed={period === 'first'} onClick={() => setPeriod('first')}>首年收入</button><button aria-pressed={period === 'recurring'} onClick={() => setPeriod('recurring')}>后续年度</button></div>
        {period === 'recurring' && <p className="help">后续年度仅去除签字费，其他条件不变。</p>}
        <p className="help">点击方案查看完整参数与结果。</p>
        <div className="compare-cards">{plans.map((plan) => <article key={plan.id} className={`plan-card ${selected?.id === plan.id ? 'plan-card-active' : ''}`}>
          <h3 className="plan-name" aria-label={plan.name}><button className="plan-select" aria-label={`查看${plan.name}`} aria-pressed={selected?.id === plan.id} aria-controls={detailId} onClick={() => { onSelect(plan.id); requestAnimationFrame(() => document.getElementById(detailId)?.scrollIntoView({ block: 'start' })); }}>{plan.name}</button></h3>
          <p className="plan-description">{plan.cityName} · 月薪 {formatMoney(plan.input.monthlySalary)} · {plan.input.salaryMonths} 薪</p>
          <p className="plan-value money">¥{formatMoney(cash(plan))}</p><p className="stat-note">{period === 'first' ? '首年' : '后续年度'}现金到手 {selected?.id === plan.id && <span className="pill pill-primary">已选中</span>}</p>
          <div className="actions"><button className="button button-quiet button-small" onClick={() => onEdit(plan)} aria-label={`编辑${plan.name}`}>编辑</button><button className="button button-quiet button-small button-danger" onClick={() => onDelete(plan.id)} aria-label={`删除${plan.name}`}>删除</button></div>
        </article>)}</div>
        {plans.length >= 2 && <details className="disclosure comparison-table-disclosure"><summary>横向对比</summary>
          <div className="actions"><label className="small" htmlFor="baseline-plan">对比基准</label><select className="form-control baseline-select" id="baseline-plan" value={baseline.id} onChange={(event) => setBaselineId(event.target.value)}>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></div>
          <div className="table-scroll" role="region" aria-label="方案对比表，可横向滚动" tabIndex={0}><table className="data-table compare-table"><thead><tr><th scope="col">元 / 年</th>{plans.map((plan) => <th key={plan.id} scope="col">{plan.name}</th>)}</tr></thead><tbody>
            {rows.filter((item) => item.label !== '股权税后估值' || plans.some((plan) => plan.stockNetYear > 0)).map((item) => <tr key={item.label}><th scope="row">{item.label}</th>{plans.map((plan) => <td key={plan.id} className={item.label === '年度现金到手' && cash(plan) === maxCash ? 'emphasized-cell' : ''}>{formatMoney(item.value(plan))}</td>)}</tr>)}
            <tr><th scope="row">现金较基准差额</th>{plans.map((plan) => { const delta = round2(cash(plan) - cash(baseline)); return <td key={plan.id} className={delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'muted'}>{delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${formatMoney(Math.abs(delta))}`}</td>; })}</tr>
          </tbody></table></div>
          {plans.every((plan) => cash(plan) === maxCash) && <p className="help">各方案年度现金到手相同。</p>}
        </details>}
        <div id={detailId} className="selected-plan-details" data-testid="selected-plan-details">
          {selected && selectedInput && selectedResult ? <>
            <div className="panel-heading selected-plan-heading"><h3>{selected.name} · {period === 'first' ? '首年详情' : '后续年度详情'}</h3><button className="button button-quiet button-small" onClick={() => document.getElementById('compare-heading')?.scrollIntoView({ block: 'start' })}>切换方案</button></div>
            <ResultPanel key={selected.id} result={selectedResult} input={selectedInput} active={active}>
            <details className="panel selected-parameters" open><summary>方案参数</summary><dl className="parameter-grid">
              {[
                ['工作城市', selected.cityName],
                ['税前月薪', `¥${formatMoney(selectedInput.monthlySalary)}`],
                ['全年薪数', `${selectedInput.salaryMonths} 薪`],
                ['年终奖', `¥${formatMoney(selectedInput.bonus)}`],
                ['签字费', `¥${formatMoney(selectedInput.signingBonus)}`],
                ['股权应税收入', `¥${formatMoney(selectedInput.stockIncome)}`],
                ['公积金比例', formatPercent(selectedInput.hfRatio)],
                ['补充公积金', formatPercent(selectedInput.hfSupplementRatio)],
                ['每月专项附加扣除', `¥${formatMoney(selectedInput.specialDeductionMonthly)}`],
                ['社保基数', `¥${formatMoney(selectedResult.socialBase)}${selectedInput.customSocialBase === null ? '（自动）' : `（填写 ${formatMoney(selectedInput.customSocialBase)}）`}`],
                ['公积金基数', `¥${formatMoney(selectedResult.hfBase)}${selectedInput.customHfBase === null ? '（自动）' : `（填写 ${formatMoney(selectedInput.customHfBase)}）`}`],
              ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="money">{value}</dd></div>)}
            </dl></details>
            </ResultPanel>
          </> : <p className="help">选择上方一个方案查看详情。</p>}
        </div>
      </>}
    </section>
  );
}
