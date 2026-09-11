import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyTable({ result }: { result: AnnualResult }) {
  const { monthlyRows, bonuses } = result;
  const grossSum = monthlyRows.reduce((a, r) => a + r.gross, 0) + bonuses.reduce((a, b) => a + b.gross, 0);
  const dedSum = monthlyRows.reduce((a, r) => a + r.personalTotal, 0);
  const taxSum = monthlyRows.reduce((a, r) => a + r.tax, 0) + bonuses.reduce((a, b) => a + b.tax, 0);
  const netSum = grossSum - dedSum - taxSum;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fade-in-up_0.4s_ease-out]">
      <h2 className="mb-4 text-sm font-semibold text-white tracking-wide">月度明细</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-right text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-xs text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3 text-left font-medium">月份</th>
              <th scope="col" className="py-3 font-medium">税前</th>
              <th scope="col" className="py-3 font-medium">三险一金</th>
              <th scope="col" className="py-3 font-medium">个税</th>
              <th scope="col" className="py-3 font-medium">税后</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((r) => (
              <tr key={r.month} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                <td className="py-2.5 text-left text-slate-400">{r.month} 月</td>
                <td className="text-slate-300">{formatMoney(r.gross)}</td>
                <td className="text-info-light">{formatMoney(r.personalTotal)}</td>
                <td className="text-negative">{formatMoney(r.tax)}</td>
                <td className="font-medium text-positive">{formatMoney(r.net)}</td>
              </tr>
            ))}
            {bonuses.map((b) => (
              <tr key={b.label} className="border-b border-white/[0.04] bg-accent/[0.03]">
                <td className="py-2.5 text-left text-accent-light">{b.label}</td>
                <td className="text-slate-300">{formatMoney(b.gross)}</td>
                <td className="text-slate-500">—</td>
                <td className="text-negative">{formatMoney(b.tax)}</td>
                <td className="font-medium text-positive">{formatMoney(b.net)}</td>
              </tr>
            ))}
            <tr className="text-sm font-semibold">
              <td className="py-3 text-left text-slate-200">合计</td>
              <td className="text-slate-200">{formatMoney(grossSum)}</td>
              <td className="text-info">{formatMoney(dedSum)}</td>
              <td className="text-negative">{formatMoney(taxSum)}</td>
              <td className="text-positive">{formatMoney(netSum)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}