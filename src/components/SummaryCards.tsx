import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function SummaryCards({ result }: { result: AnnualResult }) {
  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">年度总到手</p>
        <p className="text-4xl font-bold text-green-600">¥ {formatMoney(result.totals.netYear)}</p>
        <p className="mt-1 text-xs text-gray-500">
          税前年总包 ¥{formatMoney(result.totals.grossYear)} · 年度个税 ¥{formatMoney(result.totals.taxYear)}
        </p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">年终奖计税方案对比</p>
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left font-normal">方案</th>
              <th className="font-normal">年度总个税</th>
              <th className="font-normal">年度总到手</th>
            </tr>
          </thead>
          <tbody>
            {result.schemes.map((s) => {
              const best = s.id === result.recommendedId;
              return (
                <tr key={s.id} className={`border-t ${best ? 'bg-green-50' : ''}`}>
                  <td className="py-1.5 text-left">
                    {s.id} · {s.label}
                    {best && (
                      <span className="ml-2 rounded bg-green-600 px-1.5 py-0.5 text-xs text-white">推荐</span>
                    )}
                  </td>
                  <td className={best ? 'font-semibold text-green-700' : ''}>¥{formatMoney(s.totalTax)}</td>
                  <td className={best ? 'font-semibold text-green-700' : ''}>¥{formatMoney(s.totalNet)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-gray-400">方案 A 为常用简化口径（严格政策下一年仅一笔奖金可单独计税）</p>
      </div>
    </section>
  );
}
