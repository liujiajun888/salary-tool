import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { CITIES } from './policy';
import { computeAnnual } from './calc/annual';
import { MAX_PLANS, planName } from './calc/compare';
import type { PlanSnapshot } from './calc/compare';
import { formatMoney } from './calc/format';
import { createPlanSnapshot, parsePlanImport, restoreForm, restorePlans, serializePlans } from './storage';
import type { FormState } from './storage';
import InputPanel from './components/InputPanel';
import SummaryCards from './components/SummaryCards';
import MonthlyTable from './components/MonthlyTable';
import InsuranceCard from './components/InsuranceCard';
import PlanComparePanel from './components/PlanComparePanel';
import Footer from './components/Footer';

const MonthlyChart = lazy(() => import('./components/MonthlyChart'));
const FORM_KEY = 'salary-tool-form';
const PLANS_KEY = 'salary-tool-plans';
type View = 'input' | 'results' | 'compare';
const planContent = (plan: PlanSnapshot | undefined) => plan ? JSON.stringify([plan.input, plan.companyName, plan.name]) : null;

function initialState() {
  let damaged = false;
  const read = (key: string): unknown => {
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; }
    catch { damaged = true; return null; }
  };
  const form = restoreForm(read(FORM_KEY));
  const saved = restorePlans(read(PLANS_KEY));
  return { form, plans: saved.plans, notice: damaged ? '部分本地数据无法读取，已恢复可用数据；请及时导出备份。' : saved.changed ? '已校验已有方案并按当前口径重算；无法恢复的记录未展示，保存前不会改写原始方案缓存。' : '' };
}

export default function App() {
  const [initial] = useState(initialState);
  const [form, setForm] = useState(initial.form);
  const [plans, setPlans] = useState(initial.plans);
  const [notice, setNotice] = useState(initial.notice);
  const [formStorageError, setFormStorageError] = useState(false);
  const [planStorageError, setPlanStorageError] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [view, setView] = useState<View>('input');
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 980px)').matches);
  const [importing, setImporting] = useState(false);
  const beforeEdit = useRef<FormState | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const policy = CITIES[form.cityId];
  const result = useMemo(() => computeAnnual(form), [form]);
  const valid = form.monthlySalary > 0;
  const editingPlan = plans.find((plan) => plan.id === editingId);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 980px)');
    const update = () => setWide(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(FORM_KEY, JSON.stringify(form)); setFormStorageError(false); }
    catch { setFormStorageError(true); }
  }, [form]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.storageArea !== localStorage || (event.key !== PLANS_KEY && event.key !== null)) return;
      try {
        const next = restorePlans(event.newValue ? JSON.parse(event.newValue) : null).plans;
        if (editingId && planContent(plans.find((plan) => plan.id === editingId)) !== planContent(next.find((plan) => plan.id === editingId))) {
          setEditingId(null); beforeEdit.current = null;
          setNotice('正在编辑的方案已在其他标签页变更；当前参数已保留，可另存为新方案。');
        } else setNotice('已同步其他标签页的方案变化，当前输入不变。');
        setPlans(next);
      } catch { setNotice('其他标签页的方案数据无法读取，当前方案未改变。'); }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [editingId, plans]);

  const latestPlans = () => {
    if (planStorageError) return plans;
    try { const saved = localStorage.getItem(PLANS_KEY); return restorePlans(saved ? JSON.parse(saved) : null).plans; }
    catch { return plans; }
  };
  const commitPlans = (next: PlanSnapshot[]) => {
    setPlans(next);
    try { localStorage.setItem(PLANS_KEY, JSON.stringify(next)); setPlanStorageError(false); }
    catch { setPlanStorageError(true); }
  };
  const goTo = (next: View) => {
    setView(next);
    requestAnimationFrame(() => document.getElementById(next)?.scrollIntoView({ block: 'start' }));
  };
  const savePlan = () => {
    if (!valid || importing) return;
    const current = latestPlans();
    if (!editingId && current.length >= MAX_PLANS) { setPlans(current); setNotice('最多保存 5 个方案，请先移除一个。'); return; }
    if (editingId && planContent(current.find((plan) => plan.id === editingId)) !== planContent(editingPlan)) {
      setPlans(current); setEditingId(null); beforeEdit.current = null;
      setNotice('原方案已变更，当前参数已保留；请再次保存以创建新方案。'); return;
    }
    const snapshot = createPlanSnapshot(form, editingId ?? crypto.randomUUID(), planName(form.companyName, current.filter((plan) => plan.id !== editingId)));
    commitPlans(editingId ? current.map((plan) => plan.id === editingId ? snapshot : plan) : [...current, snapshot]);
    setNotice(`已${editingId ? '更新' : '保存'}「${snapshot.name}」；请留意浏览器存储状态并定期导出备份。`);
    setEditingId(null); beforeEdit.current = null; goTo('compare');
  };
  const loadPlan = (plan: PlanSnapshot, edit: boolean) => {
    if (edit && !beforeEdit.current) beforeEdit.current = form;
    if (!edit) beforeEdit.current = null;
    setForm({ ...plan.input, companyName: plan.companyName });
    setEditingId(edit ? plan.id : null); setRevision((previous) => previous + 1); goTo('input');
    setNotice(edit ? `正在编辑「${plan.name}」；修改后点击更新方案。` : `已载入「${plan.name}」，修改参数不会覆盖原方案。`);
  };
  const cancelEdit = () => {
    if (beforeEdit.current) setForm(beforeEdit.current);
    beforeEdit.current = null; setEditingId(null); setRevision((previous) => previous + 1); setNotice('已取消编辑，原方案未改变。');
  };
  const deletePlan = (id: string) => {
    const plan = plans.find((item) => item.id === id)!;
    if (!window.confirm(`删除「${plan.name}」？此操作不影响当前输入，建议先导出备份。`)) return;
    commitPlans(latestPlans().filter((item) => item.id !== id));
    if (editingId === id) { setEditingId(null); beforeEdit.current = null; }
    setNotice(`已删除「${plan.name}」，当前输入已保留。`);
  };
  const exportPlans = () => {
    try {
      const url = URL.createObjectURL(new Blob([serializePlans(plans)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `salary-plans-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setNotice('已导出方案文件，文件包含薪资信息，请妥善保管。');
    } catch (error) { setNotice(error instanceof Error ? error.message : '方案导出失败，请重试。'); }
  };
  const importPlans = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || importing) return;
    setImporting(true);
    try {
      if (file.size > 1024 * 1024) throw new Error('文件不能超过 1 MB。');
      const imported = parsePlanImport(await file.text());
      const current = latestPlans();
      if (current.length + imported.length > MAX_PLANS) throw new Error(`合计超过 ${MAX_PLANS} 个方案，请先移除部分已有方案；未覆盖任何数据。`);
      commitPlans([...current, ...imported]);
      setNotice(`已导入 ${imported.length} 个方案，并按当前政策与算法重算。`); goTo('compare');
    } catch (error) { setNotice(error instanceof Error ? error.message : '无法读取方案文件，原数据未改变。'); }
    finally { setImporting(false); }
  };

  return (
    <div className="shell">
      <a className="skip-link" href="#workspace">跳转到薪资测算</a>
      <header className="app-header"><div className="brand"><span className="brand-mark" aria-hidden="true">¥</span><div><h1>薪资计算器</h1><p className="help">看清现金、权益与差额，做更有依据的 Offer 选择</p></div></div><div className="actions desktop-only"><span className="pill">沪杭薪酬估算</span><button className="button button-secondary" onClick={() => goTo('compare')}>方案对比 · {plans.length}</button></div></header>
      <nav className="mobile-nav" aria-label="测算分区"><div className="segmented">{([['input', '薪资参数'], ['results', '测算结果'], ['compare', `方案对比 ${plans.length}`]] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} aria-controls={id} onClick={() => goTo(id)}>{label}</button>)}</div></nav>
      {(formStorageError || planStorageError) && <div className="notice status-banner" role="alert">浏览器存储不可用，修改只保留在本次页面中；请导出方案备份。</div>}
      {notice && <div className="notice notice-neutral status-banner" role="status"><span>{notice}</span><button className="button button-quiet button-small" aria-label="关闭提示" onClick={() => setNotice('')}>关闭</button></div>}
      <main className="workspace" id="workspace">
        <div className="mobile-pane" data-active={view === 'input'} id="input">
          <InputPanel key={revision} form={form} policy={policy} socialBase={result.socialBase} hfBase={result.hfBase} patch={(patch) => setForm((previous) => ({ ...previous, ...patch }))} onSave={savePlan} canSave={!importing && (!!editingId || plans.length < MAX_PLANS)} editingName={editingPlan?.name} onCancelEdit={cancelEdit} />
        </div>
        <div className="mobile-pane" data-active={view === 'results'} id="results">
          {valid ? <div className="results-stack"><SummaryCards result={result} input={form} />{(wide || view === 'results') && <Suspense fallback={<div className="panel loading-panel">正在加载现金流图表…</div>}><MonthlyChart result={result} /></Suspense>}<MonthlyTable result={result} /><InsuranceCard result={result} /></div> : <section className="panel empty-state"><h2>先填写税前月薪</h2><p>月薪需大于 0；填写后可查看全年现金收入、股权估值及税费明细。</p><button className="button button-primary" onClick={() => goTo('input')}>填写薪资参数</button></section>}
        </div>
        <div className="compare-pane mobile-pane" data-active={view === 'compare'} id="compare">
          <PlanComparePanel plans={plans} editingId={editingId} onEdit={(plan) => loadPlan(plan, true)} onLoad={(plan) => loadPlan(plan, false)} onDelete={deletePlan} onSave={savePlan} canSave={valid && !importing && (!!editingId || plans.length < MAX_PLANS)} onExport={exportPlans} onImport={() => fileInput.current?.click()} importing={importing} />
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={importPlans} aria-label="导入方案文件" />
        </div>
      </main>
      <Footer />
      <div className="mobile-bottom"><div><p className="stat-note">年度现金到手 · 估算</p><strong className="money">{valid ? `¥${formatMoney(result.totals.cashNetYear)}` : '等待输入'}</strong></div><button className="button button-primary" onClick={() => goTo(view === 'results' ? 'input' : 'results')}>{view === 'results' ? '调整参数' : '查看结果'}</button></div>
    </div>
  );
}
