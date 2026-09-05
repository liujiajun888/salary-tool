import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatMoney, round2 } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyChart({ result }: { result: AnnualResult }) {
  const data = result.monthlyRows.map((r) => ({
    name: `${r.month}月`,
    税后: r.net,
    个税: r.tax,
    社保公积金: r.personalTotal,
  }));
  const bonusNet = round2(result.bonuses.reduce((a, b) => a + b.net, 0));
  const bonusTax = round2(result.bonuses.reduce((a, b) => a + b.tax, 0));
  if (bonusNet > 0) {
    data.push({ name: '奖金', 税后: bonusNet, 个税: bonusTax, 社保公积金: 0 });
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold">月度构成</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v: number) => (v >= 10000 ? `${Math.round(v / 10000)}万` : v === 0 ? '0' : `${+(v / 1000).toFixed(1)}k`)} />
            <Tooltip formatter={(v) => `¥${formatMoney(Number(v))}`} />
            <Legend />
            <Bar dataKey="税后" stackId="a" fill="#16a34a" />
            <Bar dataKey="个税" stackId="a" fill="#dc2626" />
            <Bar dataKey="社保公积金" stackId="a" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
