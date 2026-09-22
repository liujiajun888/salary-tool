import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyChart({ result }: { result: AnnualResult }) {
  const headingId = useId();
  const data = result.monthlyRows.map((row) => ({ name: `${row.month}月`, 现金到手: row.net, 个税: row.tax, 个人社保公积金: row.personalTotal }));
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="help">工资构成 · 元 / 月，单独计税奖金与股权另列</h3>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 6, right: 0, left: -18, bottom: 0 }} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" fontSize={11} tick={{ fill: 'hsl(var(--muted))' }} axisLine={false} tickLine={false} minTickGap={8} />
            <YAxis fontSize={11} width={64} tick={{ fill: 'hsl(var(--muted))' }} axisLine={false} tickLine={false} tickFormatter={(value: number) => Math.abs(value) >= 10000 ? `${Number((value / 10000).toFixed(1))}万` : String(value)} />
            <Tooltip contentStyle={{ background: 'hsl(var(--surface))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(value) => [`¥${formatMoney(Number(value))}`]} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} iconType="circle" iconSize={7} />
            <Bar dataKey="现金到手" stackId="salary" isAnimationActive={false} fill="var(--chart-cash)" maxBarSize={32} />
            <Bar dataKey="个税" stackId="salary" isAnimationActive={false} fill="var(--chart-tax)" maxBarSize={32} />
            <Bar dataKey="个人社保公积金" stackId="salary" isAnimationActive={false} fill="var(--chart-insurance)" radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
