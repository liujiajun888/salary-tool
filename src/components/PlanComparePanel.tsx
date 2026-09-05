import { MAX_PLANS, bestOf } from '../calc/compare';
import type { PlanSnapshot } from '../calc/compare';
import { formatMoney } from '../calc/format';

interface Props {
  plans: PlanSnapshot[];
  canSave: boolean;
  onSave: () => void;
  onLoad: (plan: PlanSnapshot) => void;
  onDelete: (id: string) => void;
}

const cellCls = (best: boolean) =>
  `py-1.5 ${best ? 'bg-green-50 font-semibold text-green-700' : ''}`;

export default function PlanComparePanel({ plans, canSave, onSave, onLoad, onDelete }: Props) {
  const best = bestOf(plans);
  const byNet = [...plans].sort((a, b) => b.netYear - a.netYear);
  const topNet = byNet[0];
  const secondNet = byNet[1];

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">薪资方案对比</h2>
        <span className="text-xs text-gray-400">{plans.length}/{MAX_PLANS}</span>
      </div>

      <div>
        <button
          onClick={onSave}
          disabled={!canSave}
          className={
            canSave
              ? 'w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700'
              : 'w-full cursor-not-allowed rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-400'
          }
        >
          保存当前方案
        </button>
        {!canSave && (
          <p className="mt-1 text-xs text-orange-500">最多保留 {MAX_PLANS} 个方案，请先删除一个</p>
        )}
        {plans.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">
            在左侧输入并计算后，点“保存当前方案”留存；保存 2 个以上即可横向对比税后到手、全年公积金与全年扣税。
          </p>
        )}
      </div>

      {plans.length > 0 && (
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 p-3 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  {p.name} · {p.cityName}
                </span>
                <span className="flex gap-1">
                  <button
                    onClick={() => onLoad(p)}
                    className="rounded bg-gray-100 px-1.5 py-0.5 hover:bg-gray-200"
                  >
                    载入
                  </button>
                  <button
                    onClick={() => onDelete(p.id)}
                    aria-label={`删除${p.name}`}
                    className="rounded bg-gray-100 px-1.5 py-0.5 hover:bg-gray-200"
                  >
                    删除
                  </button>
                </span>
              </div>
              <p className="mb-1 text-gray-500">{p.summary}</p>
              <p className="text-gray-700">
                税后 <span className="font-semibold text-green-700">{formatMoney(p.netYear)}</span>
                {' · '}公积金 <span className="font-semibold text-blue-700">{formatMoney(p.hfTotalYear)}</span>
                {' · '}扣税 <span className="font-semibold text-red-700">{formatMoney(p.taxYear)}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {plans.length >= 2 && (
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">对比结果</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[280px] text-right text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th scope="col" className="py-1 text-left font-normal">维度</th>
                  {plans.map((p) => (
                    <th scope="col" key={p.id} className="py-1 font-normal">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200">
                  <td className="py-1.5 text-left">税后到手</td>
                  {plans.map((p) => (
                    <td key={p.id} className={cellCls(p.id === best.maxNetId)}>
                      {formatMoney(p.netYear)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-1.5 text-left">全年公积金</td>
                  {plans.map((p) => (
                    <td key={p.id} className={cellCls(p.id === best.maxHfId)}>
                      {formatMoney(p.hfTotalYear)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-gray-200">
                  <td className="py-1.5 text-left">全年扣税</td>
                  {plans.map((p) => (
                    <td key={p.id} className={cellCls(p.id === best.minTaxId)}>
                      {formatMoney(p.taxYear)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {topNet && secondNet && topNet.netYear > secondNet.netYear ? (
              <>
                结论：<span className="font-semibold text-green-700">{topNet.name}</span>{' '}
                税后到手最高，比第二名多 {formatMoney(topNet.netYear - secondNet.netYear)}。
              </>
            ) : (
              <>结论：各方案税后到手并列。</>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
