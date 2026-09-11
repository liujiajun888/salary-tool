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
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fade-in-up_0.4s_ease-out]">
      <h2 className="mb-1 text-sm font-semibold text-white tracking-wide">社保公积金明细</h2>
      <p className="mb-4 text-xs text-slate-500">
        社保基数 ¥{formatMoney(result.socialBase)} · 公积金基数 ¥{formatMoney(result.hfBase)} · 工伤费率因行业而异，取典型值展示
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3 text-left font-medium">险种</th>
              <th scope="col" className="py-3 font-medium">个人/月</th>
              <th scope="col" className="py-3 font-medium">单位/月</th>
              <th scope="col" className="py-3 font-medium">个人/年</th>
              <th scope="col" className="py-3 font-medium">单位/年</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ key, label }) => (
              <tr key={key} className="border-b border-white/[0.04]">
                <td className="py-2.5 text-left text-slate-300">{label}</td>
                <td>{key === 'workInjury' ? <span className="text-slate-500">—</span> : <span className="text-slate-300">{formatMoney(personal[key])}</span>}</td>
                <td className="text-slate-300">{formatMoney(employer[key])}</td>
                <td>{key === 'workInjury' ? <span className="text-slate-500">—</span> : <span className="text-slate-300">{formatMoney(personal[key] * 12)}</span>}</td>
                <td className="text-slate-300">{formatMoney(employer[key] * 12)}</td>
              </tr>
            ))}
            <tr className="text-sm font-semibold">
              <td className="py-3 text-left text-slate-200">合计</td>
              <td className="text-info-light">{formatMoney(sumAll(personal))}</td>
              <td className="text-info-light">{formatMoney(sumAll(employer))}</td>
              <td className="text-info">{formatMoney(result.totals.personalTotalYear)}</td>
              <td className="text-info">{formatMoney(result.totals.employerTotalYear)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}