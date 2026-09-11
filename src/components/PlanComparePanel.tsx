import { MAX_PLANS, bestOf, sortByTotalDesc } from '../calc/compare';
import type { PlanSnapshot } from '../calc/compare';
import { formatMoney, round2 } from '../calc/format';

interface Props {
  plans: PlanSnapshot[];
  canSave: boolean;
  onSave: () => void;
  onLoad: (plan: PlanSnapshot) => void;
  onDelete: (id: string) => void;
}

const cellCls = (best: boolean) =>
  `py-1.5 ${best ? 'text-positive font-semibold' : 'text-slate-300'}`;

export default function PlanComparePanel({ plans, canSave, onSave, onLoad, onDelete }: Props) {
  const best = bestOf(plans);
  const tablePlans = sortByTotalDesc(plans);
  const maxTotal = plans.length ? Math.max(...plans.map((p) => p.netYear + p.hfTotalYear)) : 0;
  const byNet = [...plans].sort((a, b) => b.netYear - a.netYear);
  const topNet = byNet[0];
  const secondNet = byNet[1];

  return (
    <section className="space-y-5 rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fade-in-up_0.4s_ease-out]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          <h2 className="text-sm font-semibold text-white tracking-wide">方案对比</h2>
        </div>
        <span className="text-xs text-slate-500">{plans.length}/{MAX_PLANS}</span>
      </div>

      <button
        onClick={onSave} disabled={!canSave}
        className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
          canSave
            ? 'bg-gradient-to-r from-accent to-accent-dark text-white shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 active:scale-[0.98]'
            : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/10'
        }`}>
        保存当前方案
      </button>
      {!canSave && <p className="text-xs text-warm">最多保留 {MAX_PLANS} 个方案，请先删除一个</p>}
      {plans.length === 0 && (
        <p className="text-xs text-slate-500">在左侧输入后点“保存当前方案”留存；保存 2 个以上即可横向对比。</p>
      )}

      {plans.length > 0 && (
        <div className="space-y-2">
          {plans.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{p.name} <span className="font-normal text-slate-400">· {p.cityName}</span></span>
                <span className="flex gap-1">
                  <button onClick={() => onLoad(p)} className="rounded-lg bg-white/10 px-2 py-1 text-slate-300 hover:bg-white/20 transition-colors">载入</button>
                  <button onClick={() => onDelete(p.id)} aria-label={`删除${p.name}`} className="rounded-lg bg-white/10 px-2 py-1 text-slate-300 hover:bg-white/20 transition-colors">删除</button>
                </span>
              </div>
              <p className="mb-1.5 text-slate-500 truncate">{p.summary}</p>
              <div className="flex items-center gap-3">
                <span>税后 <span className="font-semibold text-positive">{formatMoney(p.netYear)}</span></span>
                <span className="text-slate-600">·</span>
                <span>公积金 <span className="font-semibold text-info-light">{formatMoney(p.hfTotalYear)}</span></span>
                <span className="text-slate-600">·</span>
                <span>扣税 <span className="font-semibold text-negative">{formatMoney(p.taxYear)}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {plans.length >= 2 && (
        <div>
          <p className="mb-3 text-xs font-medium text-slate-400 uppercase tracking-wider">对比结果</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-right text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500 uppercase tracking-wider">
                  <th scope="col" className="py-2 text-left font-medium">维度</th>
                  {tablePlans.map((p) => (
                    <th scope="col" key={p.id} className="py-2 font-medium">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '税后到手', bestId: best.maxNetId, value: (p: PlanSnapshot) => p.netYear },
                  { label: '全年公积金', bestId: best.maxHfId, value: (p: PlanSnapshot) => p.hfTotalYear },
                  { label: '税后+公积金', bestId: best.maxTotalId, value: (p: PlanSnapshot) => p.netYear + p.hfTotalYear },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-white/[0.04]">
                    <td className="py-2 text-left text-slate-400">{row.label}</td>
                    {tablePlans.map((p) => (
                      <td key={p.id} className={cellCls(p.id === row.bestId)}>
                        {formatMoney(row.value(p))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-white/[0.04]">
                  <td className="py-2 text-left text-slate-400">与最高之差</td>
                  {tablePlans.map((p) => {
                    const diff = round2(maxTotal - p.netYear - p.hfTotalYear);
                    return (
                      <td key={p.id} className="py-2">
                        {diff < 0.005 ? <span className="text-slate-500">—</span> : <span className="text-slate-300">-{formatMoney(diff)}</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2 text-left text-slate-400">全年扣税</td>
                  {tablePlans.map((p) => (
                    <td key={p.id} className={cellCls(p.id === best.minTaxId)}>
                      {formatMoney(p.taxYear)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {topNet && secondNet && topNet.netYear > secondNet.netYear ? (
              <><span className="font-semibold text-positive">{topNet.name}</span> 税后到手最高，比第二名多 {formatMoney(topNet.netYear - secondNet.netYear)}。</>
            ) : (
              <>各方案税后到手并列。</>
            )}
          </p>
        </div>
      )}
    </section>
  );
}