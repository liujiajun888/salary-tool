import { Suspense, lazy, useMemo, useState } from 'react';
import { CITIES } from './policy';
import { computeAnnual } from './calc/annual';
import { MAX_PLANS, describeInput, planName } from './calc/compare';
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
    companyName: '',
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
          name: planName(form.companyName, ps),
          companyName: form.companyName.trim(),
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

  const handleLoadPlan = (plan: PlanSnapshot) =>
    setForm({ ...plan.input, companyName: plan.companyName });
  const handleDeletePlan = (id: string) => setPlans((ps) => ps.filter((p) => p.id !== id));

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-8 xl:max-w-[1600px] animate-[fade-in-up_0.4s_ease-out]">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark text-lg font-bold text-white shadow-lg shadow-accent/20">
            ¥
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">薪资计算器</h1>
            <p className="text-xs text-slate-400 mt-0.5">按 2026 年沪杭政策估算 · 仅供参考</p>
          </div>
        </header>
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
            <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-white/5 backdrop-blur-xl border border-white/10" />}>
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
