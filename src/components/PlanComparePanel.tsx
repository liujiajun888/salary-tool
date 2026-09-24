import { MAX_PLANS } from '../calc/compare';
import type { PlanSnapshot } from '../calc/compare';
import { formatMoney, round2 } from '../calc/format';

interface Props {
  plans: PlanSnapshot[];
  selectedId: string | null;
  onSelect: (plan: PlanSnapshot) => void;
  onEdit: (plan: PlanSnapshot) => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  canSave: boolean;
  editing: boolean;
  onExport: () => void;
  onImport: () => void;
  importing: boolean;
}

export default function PlanComparePanel({ plans, selectedId, onSelect, onEdit, onDelete, onSave, canSave, editing, onExport, onImport, importing }: Props) {
  const maxCash = plans.length ? Math.max(...plans.map((plan) => plan.cashNetYear)) : 0;
  const rows = [
    { label: '年度现金', value: (plan: PlanSnapshot) => plan.cashNetYear },
    { label: '全年公积金', value: (plan: PlanSnapshot) => plan.hfTotalYear },
    ...(plans.some((plan) => plan.stockNetYear > 0) ? [{ label: '股权税后估值', value: (plan: PlanSnapshot) => plan.stockNetYear }] : []),
    { label: '合计（含非现金）', value: (plan: PlanSnapshot) => plan.cashNetYear + plan.stockNetYear + plan.hfTotalYear },
    ...(plans.some((plan) => plan.input.signingBonus > 0) ? [{ label: '次年现金（无签字费）', value: (plan: PlanSnapshot) => plan.recurringCashNetYear }] : []),
  ];
  return (
    <section className="panel" aria-labelledby="compare-heading">
      <div className="panel-heading"><h2 className="section-heading" id="compare-heading"><span className="section-number" aria-hidden="true">03</span>方案对比</h2><span className="pill">{plans.length} / {MAX_PLANS}</span></div>
      <button className="button button-primary full-width" disabled={!canSave} onClick={onSave}>{editing ? '更新当前方案' : '保存当前方案'}</button>
      {plans.length === 0 ? <p className="empty-state">保存当前参数，即可对比不同方案。</p> : <>
        <p className="help">点击方案，回填参数并查看结果。</p>
        <div className="compare-cards">{plans.map((plan) => <article key={plan.id} className={`plan-card ${selectedId === plan.id ? 'plan-card-active' : ''}`}>
          <h3 className="plan-name" aria-label={plan.name}><button className="plan-select" aria-label={`查看${plan.name}`} aria-pressed={selectedId === plan.id} aria-controls="input results" onClick={() => onSelect(plan)}>{plan.name}</button></h3>
          <p className="plan-description">{plan.cityName} · 月薪 {formatMoney(plan.input.monthlySalary)} · {plan.input.salaryMonths} 薪</p>
          <p className="plan-value money">¥{formatMoney(plan.cashNetYear)}</p><p className="stat-note">年度现金到手 {selectedId === plan.id && <span className="pill pill-primary">当前方案</span>}</p>
          <div className="actions"><button className="button button-quiet button-small" onClick={() => onEdit(plan)} aria-label={`编辑${plan.name}`}>编辑</button><button className="button button-quiet button-small button-danger" onClick={() => onDelete(plan.id)} aria-label={`删除${plan.name}`}>删除</button></div>
        </article>)}</div>
        {plans.length >= 2 && <div className="disclosure">
          <h3>对比结果</h3>
          <div className="table-scroll" role="region" aria-label="方案对比表，可横向滚动" tabIndex={0}><table className="data-table compare-table"><thead><tr><th scope="col">元 / 年</th>{plans.map((plan) => <th key={plan.id} scope="col">{plan.name}</th>)}</tr></thead><tbody>
            {rows.map((item) => <tr key={item.label}><th scope="row">{item.label}</th>{plans.map((plan) => <td key={plan.id} className={item.label === '年度现金' && plan.cashNetYear === maxCash ? 'emphasized-cell' : ''}>{formatMoney(item.value(plan))}</td>)}</tr>)}
            <tr><th scope="row">现金距最高</th>{plans.map((plan) => { const delta = round2(maxCash - plan.cashNetYear); return <td key={plan.id} className="muted">{delta === 0 ? '—' : `−${formatMoney(delta)}`}</td>; })}</tr>
          </tbody></table></div>
        </div>}
      </>}
      <details className="disclosure plan-tools"><summary>导入 / 导出</summary><div className="actions"><button className="button button-secondary button-small" disabled={importing} onClick={onImport}>{importing ? '正在导入…' : '导入方案'}</button><button className="button button-secondary button-small" disabled={plans.length === 0} onClick={onExport}>导出备份</button></div><p className="help">文件包含薪资信息，请妥善保管。</p></details>
    </section>
  );
}
