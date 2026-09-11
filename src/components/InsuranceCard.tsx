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
    <section className="rounded-2xl border border-gray-100/70 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_6px_rgba(0,0,0,0.02)] animate-[fade-in-up_0.4s_ease-out]">
      <h2 className="mb-1 text-sm font-semibold text-slate-700 tracking-wide">社保公积金明细</h2>
      <p className="mb-4 text-xs text-slate-400">基数 ¥{formatMoney(result.socialBase)} · 公积金 ¥{formatMoney(result.hfBase)} · 工伤取典型费率</p>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-slate-400 uppercase tracking-wider">
              <th scope="col" className="py-3 text-left font-medium">险种</th>
              <th scope="col" className="py-3 font-medium">个人/月</th>
              <th scope="col" className="py-3 font-medium">单位/月</th>
              <th scope="col" className="py-3 font-medium">个人/年</th>
              <th scope="col" className="py-3 font-medium">单位/年</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label }) => (
              <tr key={key} className="border-b border-gray-50">
                <td className="py-2.5 text-left text-slate-600">{label}</td>
                <td>{key === 'workInjury' ? <span className="text-slate-300">—</span> : <span className="text-slate-600">{formatMoney(personal[key])}</span>}</td>
                <td className="text-slate-600">{formatMoney(employer[key])}</td>
                <td>{key === 'workInjury' ? <span className="text-slate-300">—</span> : <span className="text-slate-600">{formatMoney(personal[key] * 12)}</span>}</td>
                <td className="text-slate-600">{formatMoney(employer[key] * 12)}</td>
              </tr>
            ))}
            <tr className="text-sm font-semibold">
              <td className="py-3 text-left text-slate-700">合计</td>
              <td className="text-info">{formatMoney(sumAll(personal))}</td>
              <td className="text-info">{formatMoney(sumAll(employer))}</td>
              <td className="text-info">{formatMoney(result.totals.personalTotalYear)}</td>
              <td className="text-info">{formatMoney(result.totals.employerTotalYear)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}