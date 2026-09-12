import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
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

const FORM_KEY = 'salary-tool-form';
const PLANS_KEY = 'salary-tool-plans';

function load(k: string) {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; }
}

const defaultForm: FormState = {
  cityId: 'shanghai', monthlySalary: 20000, salaryMonths: 12, bonus: 0,
  hfRatio: CITIES.shanghai.housingFund.defaultRatio, hfSupplementRatio: 0,
  specialDeductionMonthly: 0, customSocialBase: null, customHfBase: null,
  companyName: '',
};

function mergeForm(saved: unknown): FormState {
  if (!saved || typeof saved !== 'object') return defaultForm;
  return { ...defaultForm, ...saved };
}

export default function App() {
  const [form, setForm] = useState<FormState>(() => mergeForm(load(FORM_KEY)));
  const [plans, setPlans] = useState<PlanSnapshot[]>(() => {
    const p = load(PLANS_KEY);
    return Array.isArray(p) ? p : [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { try { localStorage.setItem(FORM_KEY, JSON.stringify(form)); } catch { /* noop */ } }, [form]);
  useEffect(() => { try { localStorage.setItem(PLANS_KEY, JSON.stringify(plans)); } catch { /* noop */ } }, [plans]);

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const policy = CITIES[form.cityId];
  const result = useMemo(() => computeAnnual(form), [form]);

  const buildPlan = (id: string, name: string): PlanSnapshot => ({
    id, name,
    companyName: form.companyName.trim(), cityName: policy.name,
    summary: describeInput(form), netYear: result.totals.netYear,
    hfTotalYear: round2(result.totals.personalHfYear + result.totals.employerHfYear),
    taxYear: result.totals.taxYear, input: form,
  });

  const handleSavePlan = () => {
    setPlans((ps) => {
      if (editingId) {
        const rest = ps.filter((p) => p.id !== editingId);
        const updated = buildPlan(editingId, planName(form.companyName, rest));
        return ps.map((p) => (p.id === editingId ? updated : p));
      }
      if (ps.length >= MAX_PLANS) return ps;
      return [...ps, buildPlan(crypto.randomUUID(), planName(form.companyName, ps))];
    });
    setEditingId(null);
  };

  const handleEditPlan = (plan: PlanSnapshot) => {
    setForm({ ...plan.input, companyName: plan.companyName });
    setEditingId(plan.id);
  };
  const handleLoadPlan = (plan: PlanSnapshot) => {
    setForm({ ...plan.input, companyName: plan.companyName });
    setEditingId(null);
  };
  const handleDeletePlan = (id: string) => {
    setPlans((ps) => ps.filter((p) => p.id !== id));
    if (editingId === id) setEditingId(null);
  };
  const handleCancelEdit = () => setEditingId(null);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-8 xl:max-w-[1600px] animate-[fade-in-up_0.4s_ease-out]">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dark text-base font-bold text-white shadow-[0_2px_12px_rgba(6,182,212,0.3)]">¥</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">薪资计算器</h1>
            <p className="text-xs text-slate-400 mt-0.5">按 2026 年沪杭政策估算 · 数据自动保存在本地</p>
          </div>
        </header>
        <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_340px]">
          <InputPanel form={form} policy={policy} socialBase={result.socialBase} hfBase={result.hfBase} patch={patch} />
          <div className="space-y-5">
            <SummaryCards result={result} />
            <MonthlyTable result={result} />
            <InsuranceCard result={result} />
            <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100/60" />}>
              <MonthlyChart result={result} />
            </Suspense>
          </div>
          <PlanComparePanel
            plans={plans}
            canSave={plans.length < MAX_PLANS}
            editingId={editingId}
            onSave={handleSavePlan}
            onEdit={handleEditPlan}
            onCancelEdit={handleCancelEdit}
            onLoad={handleLoadPlan}
            onDelete={handleDeletePlan}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}