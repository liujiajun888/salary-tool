import { lazy, Suspense } from 'react';
import type { AnnualResult, SalaryInput } from '../calc/annual';
import SummaryCards from './SummaryCards';
import MonthlyTable from './MonthlyTable';
import InsuranceCard from './InsuranceCard';

const MonthlyChart = lazy(() => import('./MonthlyChart'));

export default function ResultPanel({ result, input }: { result: AnnualResult; input: SalaryInput }) {
  return (
    <div className="results-stack">
      <SummaryCards result={result} input={input} />
      <MonthlyTable result={result} />
      <InsuranceCard result={result} />
      <section className="panel" aria-label="月度趋势图">
        <h2>月度趋势图</h2>
        <Suspense fallback={<p className="help">正在加载图表…</p>}><MonthlyChart result={result} /></Suspense>
      </section>
    </div>
  );
}
