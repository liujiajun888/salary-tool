import { formatMoney, formatPercent, round2 } from '../calc/format';
import type { AnnualResult, SalaryInput } from '../calc/annual';
import { CITIES } from '../policy';

export default function SummaryCards({ result, input }: { result: AnnualResult; input: SalaryInput }) {
  const { totals, schemes, recommendedId } = result;
  const saving = round2(Math.abs(schemes[0].totalTax - schemes[1].totalTax));
  const recommended = schemes.find((scheme) => scheme.id === recommendedId)!;
  const hfTotal = round2(totals.personalHfYear + totals.employerHfYear);
  return (
    <>
      <section className="panel hero-card" aria-labelledby="result-heading">
        <div className="panel-heading"><div><p className="eyebrow">Annual compensation</p><h2 id="result-heading">这一年，收入有多少</h2></div><span className="pill pill-primary">{input.signingBonus > 0 ? '首年估算' : '全年估算'}</span></div>
        <p className="stat-label">年度现金到手</p>
        <p className="hero-value money" data-testid="annual-cash"><small>¥</small>{formatMoney(totals.cashNetYear)}</p>
        {totals.cashNetYear < 0 && <p className="notice">输入收入不足以覆盖按最低基数估算的个人缴费，负数仅表示模型收支差额；请核实任职及实际缴费情况。</p>}
        <div className="hero-caption"><span>现金税前 ¥{formatMoney(totals.cashGrossYear)}</span><span>工资奖金个税 ¥{formatMoney(totals.taxYear - totals.stockTaxYear)}</span><span>不含股权及公积金</span></div>
        <div className="stat-grid">
          <div className="stat"><p className="stat-label">年均每月现金</p><p className="stat-value money">¥{formatMoney(totals.cashNetYear / 12)}</p><p className="stat-note">含奖金摊分，非实际月工资</p></div>
          <div className="stat"><p className="stat-label">全年公积金入账</p><p className="stat-value money">¥{formatMoney(hfTotal)}</p><p className="stat-note">个人 + 单位，提取有条件</p></div>
          <div className="stat"><p className="stat-label">股权税后估值</p><p className="stat-value money" data-testid="annual-stock">¥{formatMoney(totals.stockNetYear)}</p><p className="stat-note">{input.stockIncome > 0 ? '非现金，未考虑变现限制与波动' : '未填写股权激励'}</p></div>
        </div>
        {input.signingBonus > 0 && <div className="summary-footnote">不含签字费的后续年度现金：<strong className="money">¥{formatMoney(totals.recurringCashNetYear)}</strong><br />首年现金多 ¥{formatMoney(totals.cashNetYear - totals.recurringCashNetYear)}；其余收入与政策不变，已重新比较年终奖计税方式。</div>}
        <div className="summary-footnote">现金 + 公积金 + 股权税后估值合计 <strong className="money">¥{formatMoney(totals.netYear + hfTotal)}</strong>，不等于可支配现金。</div>
        <p className="help">按{CITIES[input.cityId].name}{input.cityId === 'hangzhou' ? '市区' : ''}当前配置年化模拟，不还原全年历史工资单；部分社保参数仍待核验，<a href="#policy-notes">查阅官方来源与生效期间</a>。</p>
      </section>
      <section className="panel" aria-labelledby="scheme-heading">
        <div className="panel-heading"><div><h2 id="scheme-heading">年终奖怎么计税更合适</h2><p className="help">比较全年的现金到手，而不只看奖金税额</p></div>{input.bonus > 0 && <span className={`pill ${saving > 0 ? 'pill-primary' : ''}`}>{saving > 0 ? `可少缴 ¥${formatMoney(saving)}` : '两种方式结果相同'}</span>}</div>
        {input.bonus <= 0 ? <p className="notice notice-neutral">未填写年终奖，无需选择奖金计税方式；额外薪数与签字费仍并入工资计税。</p> : <>
          <div className="scheme-grid">{schemes.map((scheme) => {
            const best = saving > 0 && scheme.id === recommendedId;
            return <div key={scheme.id} className={`scheme ${best ? 'scheme-best' : ''}`}>
              <div className="scheme-title">{scheme.label}{best && <span className="pill pill-primary">推荐</span>}</div>
              <p className="scheme-amount money">¥{formatMoney(scheme.cashNet)}</p>
              <p className="help">年度现金到手 · 工资奖金个税 ¥{formatMoney(scheme.totalTax - totals.stockTaxYear)}</p>
            </div>;
          })}</div>
          <p className="inline-explanation">{saving > 0 ? `${recommended.label}比另一种方式少缴 ${formatMoney(saving)} 元，以下明细采用此方式。` : '两种方式税额相同，以下按年终奖单独计税展示明细。'}单独计税每纳税年度限一次，须符合适用条件。</p>
        </>}
        <details className="disclosure"><summary>计算范围与结果口径</summary>
          <p className="help">假设居民个人全年在同一单位任职，月薪、缴费基数和扣除额固定；额外薪数、签字费及并入计税的奖金均计入 12 月。</p>
          <p className="help">现金税前 − 个人实际社保公积金 − 工资奖金个税 = 现金到手；单位超限公积金对应的个税从现金中扣减，但缴存额不当作现金收入。股权税后估值另列，未模拟从工资代扣股权税。</p>
          <p className="help">个税占输入税前收入的比例为 {formatPercent(totals.grossYear > 0 ? totals.taxYear / totals.grossYear : 0)}（分母不含单位公积金），不是边际税率；未覆盖年中入离职、调基、境外所得和完整年度汇算退补税。</p>
        </details>
      </section>
    </>
  );
}
