import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { formatMoney, round2 } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyChart({ result }: { result: AnnualResult }) {
  const data = result.monthlyRows.map((r) => ({ name: `${r.month}月`, 税后: r.net, 个税: r.tax, 社保公积金: r.personalTotal }));
  const bonusNet = round2(result.bonuses.reduce((a, b) => a + b.net, 0));
  const bonusTax = round2(result.bonuses.reduce((a, b) => a + b.tax, 0));
  if (bonusNet > 0) data.push({ name: '奖金', 税后: bonusNet, 个税: bonusTax, 社保公积金: 0 });
  return (
    <section className="rounded-2xl border border-gray-100/70 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_6px_rgba(0,0,0,0.02)] animate-[fade-in-up_0.4s_ease-out]">
      <h2 className="mb-4 text-sm font-semibold text-slate-700 tracking-wide">月度收入构成</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} />
            <YAxis fontSize={12} tick={{ fill: '#94a3b8' }} tickFormatter={(v: number) => v >= 10000 ? `${Math.round(v / 10000)}万` : v === 0 ? '0' : `${+(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#334155', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} formatter={(v) => [`¥${formatMoney(Number(v))}`]} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
            <Bar dataKey="税后" stackId="a" fill="#10b981" radius={[2,2,0,0]} />
            <Bar dataKey="个税" stackId="a" fill="#f43f5e" radius={[2,2,0,0]} />
            <Bar dataKey="社保公积金" stackId="a" fill="#3b82f6" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}