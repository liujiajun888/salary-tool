import { useMemo, useState } from 'react';
import { CITIES } from './policy';
import { computeAnnual } from './calc/annual';
import InputPanel from './components/InputPanel';
import type { FormState } from './components/InputPanel';
import SummaryCards from './components/SummaryCards';
import MonthlyTable from './components/MonthlyTable';
import InsuranceCard from './components/InsuranceCard';
import MonthlyChart from './components/MonthlyChart';
import Footer from './components/Footer';

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

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const policy = CITIES[form.cityId];
  const result = useMemo(() => computeAnnual(form), [form]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">工资计算器 · 2026</h1>
        <div className="grid items-start gap-6 lg:grid-cols-[360px_1fr]">
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
            <MonthlyChart result={result} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
