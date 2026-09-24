import { useId, useState } from 'react';
import { formatMoney, formatPercent } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyTable({ result }: { result: AnnualResult }) {
  const headingId = useId();
  const monthId = useId();
  const [month, setMonth] = useState(12);
  const row = result.monthlyRows[month - 1];
  const detail = row.taxDetail;
  const previousRate = month > 1 ? result.monthlyRows[month - 2].taxDetail.rate : 0;
  return (
    <section className="panel" aria-labelledby={headingId}>
      <div className="panel-heading"><h2 id={headingId}>月度明细</h2><span className="muted small">元</span></div>
        <div className="table-scroll monthly-desktop" tabIndex={0} role="region" aria-label="月度工资明细，可横向滚动">
          <table className="data-table"><thead><tr><th scope="col">月份</th><th scope="col">现金到手</th><th scope="col">个税</th><th scope="col">个人社保公积金</th><th scope="col">税前工资</th></tr></thead>
            <tbody>{result.monthlyRows.map((item) => <tr key={item.month}><th scope="row">{item.month} 月{item.note && <span className="row-note">{item.note}</span>}</th><td className="emphasized-cell">{formatMoney(item.net)}</td><td>{formatMoney(item.tax)}</td><td>{formatMoney(item.personalTotal)}</td><td>{formatMoney(item.gross)}</td></tr>)}</tbody>
          </table>
        </div>
        <ol className="mobile-months" aria-label="每月工资明细">{result.monthlyRows.map((item) => <li className="month-card" key={item.month}>
          <div className="month-heading"><h3>{item.month} 月</h3><p className="month-net"><span className="muted small">到手 </span><strong className="money">¥{formatMoney(item.net)}</strong></p></div>
          <dl className="month-breakdown">
            <div><dt>税前工资</dt><dd className="money">{formatMoney(item.gross)}</dd></div>
            <div><dt>个税</dt><dd className="money">{formatMoney(item.tax)}</dd></div>
            <div><dt>个人社保公积金</dt><dd className="money">{formatMoney(item.personalTotal)}</dd></div>
          </dl>
          {item.note && <p className="help">{item.note}</p>}
        </li>)}</ol>
      {result.bonuses.length > 0 && <div className="payout-list">{result.bonuses.map((bonus) => <div className="payout" key={bonus.label}>
        <div><h3>{bonus.label}</h3><p className="help">{bonus.taxMethod === 'annual' ? '股权税后估值 · 非现金' : '现金奖金 · 单独计税'}<br />税前 ¥{formatMoney(bonus.gross)} · 个税 ¥{formatMoney(bonus.tax)}</p></div><strong className="money">¥{formatMoney(bonus.net)}</strong>
      </div>)}</div>}
      <details className="disclosure">
        <summary>为什么这个月扣了这些税？</summary>
        <div className="detail-toolbar"><label htmlFor={monthId}>查看月份</label><select id={monthId} className="form-control" value={month} onChange={(event) => setMonth(Number(event.target.value))}>{result.monthlyRows.map((item) => <option key={item.month} value={item.month}>{item.month} 月</option>)}</select><span className="pill">累计预扣税率 {formatPercent(detail.rate)}</span></div>
        <div className="formula-grid">
          <div><span className="muted">累计计税收入</span><strong className="money">¥{formatMoney(detail.cumulativeGross)}</strong></div>
          <div><span className="muted">累计减除及扣除</span><strong className="money">¥{formatMoney(detail.cumulativeDeduction)}</strong></div>
          <div><span className="muted">累计应纳税所得额</span><strong className="money">¥{formatMoney(detail.cumulativeTaxable)}</strong></div>
          <div><span className="muted">此前已预扣税额</span><strong className="money">¥{formatMoney(detail.priorTax)}</strong></div>
        </div>
        <p className="formula money">累计税额 = {formatMoney(detail.cumulativeTaxable)} × {formatPercent(detail.rate)} − {formatMoney(detail.quickDeduction)} = {formatMoney(detail.cumulativeTax)} 元<br />本月预扣 = max(0, {formatMoney(detail.cumulativeTax)} − {formatMoney(detail.priorTax)}) = <strong>{formatMoney(detail.tax)} 元</strong></p>
        <p className="help">累计扣除含每月 5,000 元基本减除费用、个人社保、限额内公积金和已填专项附加扣除；速算扣除数体现累进计税，并非全部收入直接乘最高税率。</p>
        {result.housingFundTax.employerTaxable > 0 && <p className="help">累计计税收入含单位超限公积金 ¥{formatMoney(result.housingFundTax.employerTaxable * month)}，这部分是应税福利，不计入现金工资；个人超限缴存额也未纳入税前扣除。</p>}
        {detail.rate > previousRate && month > 1 && <p className="notice notice-neutral">本月累计应税收入进入了更高税率档位，税率由 {formatPercent(previousRate)} 变为 {formatPercent(detail.rate)}，因此相同月薪的到手金额可能下降。</p>}
      </details>
    </section>
  );
}
