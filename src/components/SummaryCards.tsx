import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function SummaryCards({ result }: { result: AnnualResult }) {
  return (
    <section className="rounded-2xl border border-gray-100/70 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_6px_rgba(0,0,0,0.02)] animate-[fade-in-up_0.4s_ease-out]">
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">年度总到手</p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-positive">¥ {formatMoney(result.totals.netYear)}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
          <span>年总包 ¥{formatMoney(result.totals.grossYear)}</span>
          <span className="h-3 w-px bg-gray-200" />
          <span>个税 ¥{formatMoney(result.totals.taxYear)}</span>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-5">
        <p className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">年终奖计税方案对比</p>
        <div className="space-y-2">
          {result.schemes.map((s) => {
            const best = s.id === result.recommendedId;
            return (
              <div key={s.id} className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all ${best ? 'bg-accent/[0.06] border border-accent/20' : 'bg-gray-50/60 border border-transparent'}`}>
                <div className="flex items-center gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${best ? 'bg-gradient-to-br from-accent to-accent-dark text-white shadow-[0_2px_6px_rgba(6,182,212,0.25)]' : 'bg-gray-200/70 text-slate-500'}`}>{s.id}</span>
                  <div>
                    <span className={`text-sm ${best ? 'text-accent-dark font-semibold' : 'text-slate-600'}`}>{s.label}</span>
                    {best && <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent-dark font-semibold">推荐</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${best ? 'text-positive' : 'text-slate-500'}`}>¥{formatMoney(s.totalNet)}</p>
                  <p className="text-[11px] text-slate-400">个税 ¥{formatMoney(s.totalTax)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">方案 A 为简化口径（严格政策下一年仅一笔奖金可单独计税）</p>
      </div>
    </section>
  );
}