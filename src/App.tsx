import { useMemo, useState } from 'react';
import { CITY_LIST } from './policy';
import { computeAnnual } from './calc/annual';
import InputPanel from './components/InputPanel';
import type { FormState } from './components/InputPanel';

export default function App() {
  const [form, setForm] = useState<FormState>({
    cityId: 'shanghai',
    monthlySalary: 20000,
    salaryMonths: 12,
    bonus: 0,
    hfRatio: CITY_LIST[0].housingFund.defaultRatio,
    hfSupplementRatio: 0,
    specialDeductionMonthly: 0,
    customSocialBase: null,
    customHfBase: null,
  });

  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const policy = CITY_LIST.find((c) => c.id === form.cityId)!;
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
            <div className="rounded-xl bg-white p-5 text-sm text-gray-500 shadow-sm">
              结果组件将在后续任务接入（当前推荐方案：{result.recommendedId}，年度总到手 ¥{result.totals.netYear}）
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
