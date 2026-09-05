import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyTable({ result }: { result: AnnualResult }) {
  const { monthlyRows, bonuses } = result;
  const grossSum =
    monthlyRows.reduce((a, r) => a + r.gross, 0) + bonuses.reduce((a, b) => a + b.gross, 0);
  const dedSum = monthlyRows.reduce((a, r) => a + r.personalTotal, 0);
  const taxSum =
    monthlyRows.reduce((a, r) => a + r.tax, 0) + bonuses.reduce((a, b) => a + b.tax, 0);
  const netSum = grossSum - dedSum - taxSum;

  return (
    <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold">月度明细</h2>
      <table className="w-full min-w-[560px] text-right text-sm">
        <thead>
          <tr className="text-gray-500">
            <th scope="col" className="py-1 text-left font-normal">月份</th>
            <th scope="col" className="py-1 font-normal">税前</th>
            <th scope="col" className="py-1 font-normal">三险一金（个人）</th>
            <th scope="col" className="py-1 font-normal">个税</th>
            <th scope="col" className="py-1 font-normal">税后</th>
          </tr>
        </thead>
        <tbody>
          {monthlyRows.map((r) => (
            <tr key={r.month} className="border-t border-gray-200">
              <td className="py-1.5 text-left">{r.month} 月</td>
              <td>{formatMoney(r.gross)}</td>
              <td className="text-blue-600">{formatMoney(r.personalTotal)}</td>
              <td className="text-red-600">{formatMoney(r.tax)}</td>
              <td className="font-medium text-green-700">{formatMoney(r.net)}</td>
            </tr>
          ))}
          {bonuses.map((b) => (
            <tr key={b.label} className="border-t border-gray-200 bg-amber-50">
              <td className="py-1.5 text-left">{b.label}</td>
              <td>{formatMoney(b.gross)}</td>
              <td className="text-gray-500">—</td>
              <td className="text-red-600">{formatMoney(b.tax)}</td>
              <td className="font-medium text-green-700">{formatMoney(b.net)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-200 font-semibold">
            <td className="py-1.5 text-left">合计</td>
            <td>{formatMoney(grossSum)}</td>
            <td className="text-blue-600">{formatMoney(dedSum)}</td>
            <td className="text-red-600">{formatMoney(taxSum)}</td>
            <td className="text-green-700">{formatMoney(netSum)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
