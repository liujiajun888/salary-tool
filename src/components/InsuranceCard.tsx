import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';
import type { InsuranceBreakdown } from '../calc/social';

const ROWS: { key: keyof InsuranceBreakdown; label: string }[] = [
  { key: 'pension', label: '养老保险' },
  { key: 'medical', label: '医疗保险（含生育）' },
  { key: 'unemployment', label: '失业保险' },
  { key: 'workInjury', label: '工伤保险（仅单位）' },
  { key: 'hfBasic', label: '基本公积金' },
  { key: 'hfSupplement', label: '补充公积金' },
];

const sumAll = (b: InsuranceBreakdown) =>
  b.pension + b.medical + b.unemployment + b.workInjury + b.hfBasic + b.hfSupplement;

export default function InsuranceCard({ result }: { result: AnnualResult }) {
  const { personal, employer } = result.insurance;
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-semibold">社保公积金明细</h2>
      <p className="mb-3 text-xs text-gray-500">
        社保基数 ¥{formatMoney(result.socialBase)} · 公积金基数 ¥{formatMoney(result.hfBase)} · 工伤费率因行业而异，取典型值展示
      </p>
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="text-gray-500">
            <th scope="col" className="text-left font-normal">险种</th>
            <th scope="col" className="font-normal">个人/月</th>
            <th scope="col" className="font-normal">单位/月</th>
            <th scope="col" className="font-normal">个人/年</th>
            <th scope="col" className="font-normal">单位/年</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => (
            <tr key={key} className="border-t border-gray-200">
              <td className="py-1.5 text-left">{label}</td>
              <td>{key === 'workInjury' ? <span className="text-gray-500">—</span> : formatMoney(personal[key])}</td>
              <td>{formatMoney(employer[key])}</td>
              <td>{key === 'workInjury' ? <span className="text-gray-500">—</span> : formatMoney(personal[key] * 12)}</td>
              <td>{formatMoney(employer[key] * 12)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 font-semibold">
            <td className="py-1.5 text-left">合计</td>
            <td>{formatMoney(sumAll(personal))}</td>
            <td>{formatMoney(sumAll(employer))}</td>
            <td>{formatMoney(result.totals.personalTotalYear)}</td>
            <td>{formatMoney(result.totals.employerTotalYear)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
