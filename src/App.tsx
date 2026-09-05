import { Suspense, lazy, useMemo, useState } from 'react';
import { CITIES } from './policy';
import { computeAnnual } from './calc/annual';
import { MAX_PLANS, describeInput, nextPlanName } from './calc/compare';
import type { PlanSnapshot } from './calc/compare';
import { round2 } from './calc/format';
import InputPanel from './components/InputPanel';
import type { FormState } from './components/InputPanel';
import SummaryCards from './components/SummaryCards';
import MonthlyTable from './components/MonthlyTable';
import InsuranceCard from './components/InsuranceCard';
import PlanComparePanel from './components/PlanComparePanel';
import Footer from './components/Footer';

const MonthlyChart = lazy(() => import('./components/MonthlyChart'));

export default function App() {
  const [form, setForm] = useState<FormState>({
    cityId: 'shanghai',
    monthlySalary: 20000,
    salaryMonths: 12,
    bonus: 0,
    hfRatio: CITIES.shanghai.housingFund.defaultRatio,
    hfSupplementRatio: 0,
    specialDeductionMonthly: 0,
    customSocialBase: null,
    customHfBase: null,
  });
  const [plans, setPlans] = useState<PlanSnapshot[]>([]);

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const policy = CITIES[form.cityId];
  const result = useMemo(() => computeAnnual(form), [form]);

  const handleSavePlan = () => {
    setPlans((ps) => {
      if (ps.length >= MAX_PLANS) return ps;
      return [
        ...ps,
        {
          id: crypto.randomUUID(),
          name: nextPlanName(ps),
          cityName: policy.name,
          summary: describeInput(form),
          netYear: result.totals.netYear,
          hfTotalYear: round2(result.totals.personalHfYear + result.totals.employerHfYear),
          taxYear: result.totals.taxYear,
          input: form,
        },
      ];
    });
  };

  const handleLoadPlan = (plan: PlanSnapshot) => setForm({ ...plan.input });
  const handleDeletePlan = (id: string) => setPlans((ps) => ps.filter((p) => p.id !== id));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-6xl px-4 py-8 xl:max-w-[1600px]">
        <h1 className="mb-6 text-2xl font-bold">工资计算器 · 2026</h1>
        <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_340px]">
          <InputPanel
            form={form}
            policy={policy}
            socialBase={result.socialBase}
            hfBase={result.hfBase}
            patch={patch}
          />
          <div className="space-y-6">
            <SummaryCards result={result} />
            <MonthlyTable result={result} />
            <InsuranceCard result={result} />
            <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-white shadow-sm" />}>
              <MonthlyChart result={result} />
            </Suspense>
          </div>
          <PlanComparePanel
            plans={plans}
            canSave={plans.length < MAX_PLANS}
            onSave={handleSavePlan}
            onLoad={handleLoadPlan}
            onDelete={handleDeletePlan}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
