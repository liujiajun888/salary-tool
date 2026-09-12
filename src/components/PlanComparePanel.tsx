import { MAX_PLANS, bestOf, sortByTotalDesc } from '../calc/compare';
import type { PlanSnapshot } from '../calc/compare';
import { formatMoney, round2 } from '../calc/format';

interface Props {
  plans: PlanSnapshot[];
  canSave: boolean;
  editingId: string | null;
  onSave: () => void;
  onEdit: (plan: PlanSnapshot) => void;
  onCancelEdit: () => void;
  onLoad: (plan: PlanSnapshot) => void;
  onDelete: (id: string) => void;
}

const cellCls = (best: boolean) => `py-1.5 ${best ? 'text-positive font-semibold' : 'text-slate-600'}`;

export default function PlanComparePanel({ plans, canSave, editingId, onSave, onEdit, onCancelEdit, onLoad, onDelete }: Props) {
  const best = bestOf(plans);
  const tablePlans = sortByTotalDesc(plans);
  const maxTotal = plans.length ? Math.max(...plans.map((p) => p.netYear + p.hfTotalYear)) : 0;
  const byNet = [...plans].sort((a, b) => b.netYear - a.netYear);
  const topNet = byNet[0];
  const secondNet = byNet[1];
  const editingPlan = plans.find((p) => p.id === editingId);
  return (
    <section className="space-y-5 rounded-2xl border border-gray-100/70 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_6px_rgba(0,0,0,0.02)] animate-[fade-in-up_0.4s_ease-out]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent" />
          <h2 className="text-sm font-semibold text-slate-700 tracking-wide">方案对比</h2>
        </div>
        <span className="text-xs text-slate-400">{plans.length}/{MAX_PLANS}</span>
      </div>
      {editingPlan ? (
        <div className="space-y-2">
          <p className="text-xs text-accent-dark bg-accent/[0.06] border border-accent/20 rounded-lg px-3 py-2">
            正在编辑「{editingPlan.name}」：修改左侧参数后点“更新方案”覆盖保存
          </p>
          <div className="flex gap-2">
            <button onClick={onSave}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold bg-gradient-to-r from-accent to-accent-dark text-white shadow-[0_2px_8px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_12px_rgba(6,182,212,0.3)] active:scale-[0.98] transition-all duration-200">
              更新方案
            </button>
            <button onClick={onCancelEdit}
              className="rounded-xl border border-gray-200/70 bg-white px-3 py-2.5 text-sm text-slate-500 hover:bg-gray-50 transition-colors">
              取消编辑
            </button>
          </div>
        </div>
      ) : (
        <>
          <button onClick={onSave} disabled={!canSave}
            className={`w-full rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${canSave ? 'bg-gradient-to-r from-accent to-accent-dark text-white shadow-[0_2px_8px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_12px_rgba(6,182,212,0.3)] active:scale-[0.98]' : 'bg-gray-100 text-slate-400 cursor-not-allowed border border-gray-200/70'}`}>
            保存当前方案</button>
          {!canSave && <p className="text-xs text-warm">最多保留 {MAX_PLANS} 个方案，请先删除一个</p>}
        </>
      )}
      {plans.length === 0 && <p className="text-xs text-slate-400">输入后点“保存当前方案”留存；保存 2 个以上即可横向对比。</p>}
      {plans.length > 0 && (
        <div className="space-y-2">
          {plans.map((p) => {
            const isEditing = p.id === editingId;
            return (
              <div key={p.id} className={`rounded-xl border p-3 text-xs transition-all ${isEditing ? 'border-accent/40 bg-accent/[0.04] ring-1 ring-accent/15' : 'border-gray-100/70 bg-gray-50/40'}`}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {p.name} <span className="font-normal text-slate-400">· {p.cityName}</span>
                    {isEditing && <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent-dark font-semibold">编辑中</span>}
                  </span>
                  <span className="flex gap-1">
                    <button onClick={() => onEdit(p)} aria-label={`编辑${p.name}`}
                      className={`rounded-lg border px-2 py-1 transition-colors ${isEditing ? 'border-accent/30 bg-accent/10 text-accent-dark' : 'bg-white border-gray-200/70 text-slate-500 hover:bg-gray-100'}`}>
                      编辑</button>
                    <button onClick={() => onLoad(p)} className="rounded-lg bg-white border border-gray-200/70 px-2 py-1 text-slate-500 hover:bg-gray-100 transition-colors">载入</button>
                    <button onClick={() => onDelete(p.id)} aria-label={`删除${p.name}`} className="rounded-lg bg-white border border-gray-200/70 px-2 py-1 text-slate-500 hover:bg-gray-100 transition-colors">删除</button>
                  </span>
                </div>
                <p className="mb-1.5 text-slate-400 truncate">{p.summary}</p>
                <div className="flex items-center gap-3">
                  <span>税后 <span className="font-semibold text-positive">{formatMoney(p.netYear)}</span></span>
                  <span className="text-slate-200">·</span>
                  <span>公积金 <span className="font-semibold text-info">{formatMoney(p.hfTotalYear)}</span></span>
                  <span className="text-slate-200">·</span>
                  <span>扣税 <span className="font-semibold text-negative">{formatMoney(p.taxYear)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {plans.length >= 2 && (
        <div>
          <p className="mb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">对比结果</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-right text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-slate-400 uppercase tracking-wider">
                  <th scope="col" className="py-2 text-left font-medium">维度</th>
                  {tablePlans.map((p) => (<th scope="col" key={p.id} className="py-2 font-medium">{p.name}</th>))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: '税后到手', bestId: best.maxNetId, val: (p: PlanSnapshot) => p.netYear },
                  { label: '全年公积金', bestId: best.maxHfId, val: (p: PlanSnapshot) => p.hfTotalYear },
                  { label: '税后+公积金', bestId: best.maxTotalId, val: (p: PlanSnapshot) => p.netYear + p.hfTotalYear },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-50">
                    <td className="py-2 text-left text-slate-400">{row.label}</td>
                    {tablePlans.map((p) => (<td key={p.id} className={cellCls(p.id === row.bestId)}>{formatMoney(row.val(p))}</td>))}
                  </tr>
                ))}
                <tr className="border-b border-gray-50">
                  <td className="py-2 text-left text-slate-400">与最高之差</td>
                  {tablePlans.map((p) => { const d = round2(maxTotal - p.netYear - p.hfTotalYear); return <td key={p.id} className="py-2">{d < 0.005 ? <span className="text-slate-300">—</span> : <span className="text-slate-500">-{formatMoney(d)}</span>}</td>; })}
                </tr>
                <tr>
                  <td className="py-2 text-left text-slate-400">全年扣税</td>
                  {tablePlans.map((p) => (<td key={p.id} className={cellCls(p.id === best.minTaxId)}>{formatMoney(p.taxYear)}</td>))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">{(topNet && secondNet && topNet.netYear > secondNet.netYear) ? <><span className="font-semibold text-positive">{topNet.name}</span> 税后到手最高，比第二名多 {formatMoney(topNet.netYear - secondNet.netYear)}。</> : <>各方案税后到手并列。</>}</p>
        </div>
      )}
    </section>
  );
}