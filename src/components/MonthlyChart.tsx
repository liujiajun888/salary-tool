import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts';
import { formatMoney, round2 } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyChart({ result }: { result: AnnualResult }) {
  const data = result.monthlyRows.map((r) => ({
    name: `${r.month}月`, 税后: r.net, 个税: r.tax, 社保公积金: r.personalTotal,
  }));
  const bonusNet = round2(result.bonuses.reduce((a, b) => a + b.net, 0));
  const bonusTax = round2(result.bonuses.reduce((a, b) => a + b.tax, 0));
  if (bonusNet > 0) {
    data.push({ name: '奖金', 税后: bonusNet, 个税: bonusTax, 社保公积金: 0 });
  }

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fade-in-up_0.4s_ease-out]">
      <h2 className="mb-4 text-sm font-semibold text-white tracking-wide">月度构成</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" fontSize={12} tick={{ fill: '#94a3b8' }} />
            <YAxis fontSize={12} tick={{ fill: '#94a3b8' }}
              tickFormatter={(v: number) => v >= 10000 ? `${Math.round(v / 10000)}万` : v === 0 ? '0' : `${+(v / 1000).toFixed(1)}k`} />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                backdropFilter: 'blur(12px)',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              formatter={(v) => [`¥${formatMoney(Number(v))}`]} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
            <Bar dataKey="税后" stackId="a" fill="#10b981" />
            <Bar dataKey="个税" stackId="a" fill="#f43f5e" />
            <Bar dataKey="社保公积金" stackId="a" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}