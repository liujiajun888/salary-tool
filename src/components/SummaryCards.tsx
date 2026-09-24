import { useId } from 'react';
import { formatMoney, formatPercent, round2 } from '../calc/format';
import type { AnnualResult, SalaryInput } from '../calc/annual';
import { CITIES } from '../policy';

export default function SummaryCards({ result, input }: { result: AnnualResult; input: SalaryInput }) {
  const resultHeadingId = useId();
  const schemeHeadingId = useId();
  const { totals, schemes, recommendedId } = result;
  const saving = round2(Math.abs(schemes[0].totalTax - schemes[1].totalTax));
  const hfTotal = round2(totals.personalHfYear + totals.employerHfYear);
  const hasStock = input.stockIncome > 0;
  const [cashWhole, cashFraction] = formatMoney(totals.cashNetYear).split('.');
  return (
    <section className="panel hero-card" aria-labelledby={resultHeadingId}>
      <div className="panel-heading"><h2 className="section-heading" id={resultHeadingId}><span className="section-number" aria-hidden="true">02</span>年度现金到手</h2></div>
      <p className={`hero-value money${cashWhole.length > 10 ? ' hero-value-long' : ''}`} data-testid="annual-cash"><small>¥</small>{cashWhole}<span className="hero-fraction">.{cashFraction}</span></p>
      {totals.cashNetYear < 0 && <p className="notice">收入不足以覆盖最低基数缴费；负数为模型收支差额，请核实任职与实际缴费。</p>}
      <p className="hero-caption">不含公积金与股权</p>
      <div className="hero-caption"><span>现金税前 ¥{formatMoney(totals.cashGrossYear)}</span><span>工资奖金个税 ¥{formatMoney(totals.taxYear - totals.stockTaxYear)}</span></div>
      <div className="stat-grid">
        <div className="stat"><p className="stat-label">年均每月现金</p><p className="stat-value money">¥{formatMoney(totals.cashNetYear / 12)}</p><p className="stat-note">全年现金 ÷ 12，非实际月薪</p></div>
        <div className="stat"><p className="stat-label">全年公积金入账</p><p className="stat-value money">¥{formatMoney(hfTotal)}</p><p className="stat-note">个人 + 单位，提取有条件</p></div>
        {hasStock && <div className="stat"><p className="stat-label">股权税后估值</p><p className="stat-value money" data-testid="annual-stock">¥{formatMoney(totals.stockNetYear)}</p><p className="stat-note">非现金，未计变现限制与波动</p></div>}
      </div>
      {input.signingBonus > 0 && <div className="summary-footnote">不含签字费的后续年度现金：<strong className="money">¥{formatMoney(totals.recurringCashNetYear)}</strong></div>}
      {input.bonus > 0 && <section className="disclosure" aria-labelledby={schemeHeadingId}>
        <div className="panel-heading"><h3 id={schemeHeadingId}>年终奖计税</h3>{saving === 0 && <span className="pill">两种方式结果相同</span>}</div>
        <div className="scheme-grid">{schemes.map((scheme) => {
          const best = saving > 0 && scheme.id === recommendedId;
          return <div key={scheme.id} className={`scheme ${best ? 'scheme-best' : ''}`}>
            <div className="scheme-title">{scheme.label}{best && <span className="pill pill-primary">推荐</span>}</div>
            <p className="scheme-amount money"><span className="stat-note">全年现金 </span>¥{formatMoney(scheme.cashNet)}</p>
            <p className="help">工资奖金个税 ¥{formatMoney(scheme.totalTax - totals.stockTaxYear)}</p>
          </div>;
        })}</div>
        <p className="inline-explanation">单独计税每纳税年度限一次，须符合适用条件。</p>
      </section>}
      <details className="disclosure">
        <summary>计算口径与风险</summary>
        <p className="help">按{CITIES[input.cityId].name}{input.cityId === 'hangzhou' ? '市区' : ''}当前配置年化模拟，非历史工资单；部分社保参数待核验。<a href="#policy-notes">政策来源与生效期</a>。</p>
        <p className="help">假设居民个人全年在同一单位任职，月薪、缴费基数和扣除额固定；额外薪数、签字费及并入计税的奖金均计入 12 月。</p>
        <p className="help">现金税前 ¥{formatMoney(totals.cashGrossYear)} − 个人实际社保公积金 − 工资奖金个税 ¥{formatMoney(totals.taxYear - totals.stockTaxYear)} = 现金到手。单位超限公积金对应个税从现金扣减，缴存额不计作现金收入。{hasStock && '股权按符合单独计税条件估算，未模拟从工资代扣股权税。'}</p>
        {input.signingBonus > 0 && <p className="help">后续年度假设其余收入与政策不变，已重新比较奖金计税方式。</p>}
        <p className="help">个税占输入税前收入 {formatPercent(totals.grossYear > 0 ? totals.taxYear / totals.grossYear : 0)}（分母不含单位公积金），非边际税率；未覆盖年中入离职、调基、境外所得及完整年度汇算退补税。</p>
      </details>
    </section>
  );
}
