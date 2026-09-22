import { lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import type { AnnualResult, SalaryInput } from '../calc/annual';
import SummaryCards from './SummaryCards';
import MonthlyTable from './MonthlyTable';
import InsuranceCard from './InsuranceCard';

const MonthlyChart = lazy(() => import('./MonthlyChart'));

export default function ResultPanel({ result, input, active, children }: { result: AnnualResult; input: SalaryInput; active: boolean; children?: ReactNode }) {
  const [chartOpen, setChartOpen] = useState(false);
  return (
    <div className="results-stack">
      <SummaryCards result={result} input={input} />
      {children}
      <MonthlyTable result={result} />
      <InsuranceCard result={result} />
      <details className="panel chart-disclosure" open={chartOpen} onToggle={(event) => setChartOpen(event.currentTarget.open)}>
        <summary>月度趋势图</summary>
        {chartOpen && active && <Suspense fallback={<p className="help">正在加载图表…</p>}><MonthlyChart result={result} /></Suspense>}
      </details>
    </div>
  );
}
