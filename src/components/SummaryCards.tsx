import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function SummaryCards({ result }: { result: AnnualResult }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fade-in-up_0.4s_ease-out]">
      <div className="mb-6">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">年度总到手</p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-positive bg-gradient-to-r from-positive to-positive-light bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          ¥ {formatMoney(result.totals.netYear)}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span>税前年总包 ¥{formatMoney(result.totals.grossYear)}</span>
          <span className="h-3 w-px bg-white/10" />
          <span>年度个税 ¥{formatMoney(result.totals.taxYear)}</span>
        </div>
      </div>

      <div className="border-t border-white/10 pt-5">
        <p className="mb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">年终奖计税方案对比</p>
        <div className="space-y-2">
          {result.schemes.map((s) => {
            const best = s.id === result.recommendedId;
            return (
              <div key={s.id} className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 ${best ? 'bg-accent/10 border border-accent/20' : 'bg-white/[0.02] border border-transparent'}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${best ? 'bg-gradient-to-br from-accent to-accent-dark text-white' : 'bg-white/10 text-slate-400'}`}>{s.id}</span>
                  <div>
                    <span className={`text-sm ${best ? 'text-accent-light font-semibold' : 'text-slate-300'}`}>{s.label}</span>
                    {best && <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent-light font-semibold">推荐</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${best ? 'text-positive' : 'text-slate-400'}`}>¥{formatMoney(s.totalNet)}</p>
                  <p className="text-[11px] text-slate-500">个税 ¥{formatMoney(s.totalTax)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">方案 A 为常用简化口径（严格政策下一年仅一笔奖金可单独计税）</p>
      </div>
    </section>
  );
}