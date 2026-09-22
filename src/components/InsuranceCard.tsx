import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';
import type { InsuranceBreakdown } from '../calc/social';

const ROWS: { key: keyof InsuranceBreakdown; label: string }[] = [
  { key: 'pension', label: '养老保险' },
  { key: 'medical', label: '医疗保险（含生育）' },
  { key: 'unemployment', label: '失业保险' },
  { key: 'workInjury', label: '工伤保险' },
  { key: 'hfBasic', label: '基本公积金' },
  { key: 'hfSupplement', label: '补充公积金' },
];

export default function InsuranceCard({ result }: { result: AnnualResult }) {
  const { personal, employer } = result.insurance;
  return (
    <section className="panel" aria-labelledby="insurance-heading">
      <div className="panel-heading"><div><h2 id="insurance-heading">社保与公积金</h2><p className="help">个人月缴 ¥{formatMoney(result.totals.personalTotalYear / 12)} · 单位月缴 ¥{formatMoney(result.totals.employerTotalYear / 12)}</p></div><span className="pill">缴费估算</span></div>
      <details className="disclosure"><summary>展开个人与单位缴费明细</summary>
        <p className="help">采用社保基数 ¥{formatMoney(result.socialBase)}、公积金基数 ¥{formatMoney(result.hfBase)}；单位工伤采用典型费率，单位公积金按与个人相同比例估算。</p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="社保公积金缴费明细，可横向滚动">
          <table className="data-table"><thead><tr><th scope="col">险种</th><th scope="col">个人 / 月</th><th scope="col">单位 / 月</th><th scope="col">个人 / 年</th><th scope="col">单位 / 年</th></tr></thead>
            <tbody>{ROWS.map(({ key, label }) => <tr key={key}><th scope="row">{label}</th><td>{key === 'workInjury' ? '—' : formatMoney(personal[key])}</td><td>{formatMoney(employer[key])}</td><td>{key === 'workInjury' ? '—' : formatMoney(personal[key] * 12)}</td><td>{formatMoney(employer[key] * 12)}</td></tr>)}</tbody>
            <tfoot><tr><th scope="row">合计</th><td>{formatMoney(result.totals.personalTotalYear / 12)}</td><td>{formatMoney(result.totals.employerTotalYear / 12)}</td><td>{formatMoney(result.totals.personalTotalYear)}</td><td>{formatMoney(result.totals.employerTotalYear)}</td></tr></tfoot>
          </table>
        </div>
        <p className="help">个人公积金可扣除 ¥{formatMoney(result.housingFundTax.personalDeductible)} / 月；个人超限不可扣除 ¥{formatMoney(result.housingFundTax.personalExcess)} / 月；单位公积金计入应税收入 ¥{formatMoney(result.housingFundTax.employerTaxable)} / 月。</p>
        {result.housingFundTax.personalExcess > 0 && <p className="notice notice-neutral field-spaced">实际缴存不等于税前扣除。模型按每方每月 ¥{formatMoney(result.housingFundTax.monthlyLimit)} 的 12% 参考限额计算；个人超额不抵税，单位超额参与工资计税，但不计入现金收入。</p>}
        <p className="help">单位社保不属于个人到手收入；公积金虽记入个人账户，提取仍需符合当地条件。扣税基数暂按缴存基数估算，具体限额以单位申报依据为准。</p>
      </details>
    </section>
  );
}
