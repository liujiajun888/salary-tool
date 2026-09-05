# 工资计算器（2026 沪杭）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 纯前端工资计算网页：输入月薪/薪数/年终奖/城市（上海、杭州）/公积金比例，按 2026 年政策输出逐月税前税后明细、年度总到手、社保公积金明细。

**Architecture:** 计算层（`src/policy` 纯数据 + `src/calc` 纯函数）与 UI 层（`src/components`）严格分离；单向数据流 `输入 → 基数 clamp → 社保公积金 → 逐月累计预扣个税 → 三方案对比 → 汇总`。UI 只渲染 `computeAnnual` 的结果。

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind CSS v4 + recharts + Vitest。

**Spec:** `docs/superpowers/specs/2026-09-05-salary-calculator-design.md`

**金样本例（贯穿计划的验收基准，已手工核算）：** 上海、月薪 30000、13 薪、年终奖 100000、公积金 7%、无补充、无专项附加、不自定义基数 → 推荐方案 A，年度总个税 41170.00，年度总到手 385830.00。

---

## File Structure

```
salary_tool/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .gitignore
├── src/
│   ├── main.tsx
│   ├── index.css              # @import "tailwindcss"
│   ├── App.tsx                # 持有表单状态，useMemo 调 computeAnnual
│   ├── policy/
│   │   ├── types.ts           # CityId / InsuranceRates / CityPolicy
│   │   ├── shanghai.ts        # SHANGHAI_2026
│   │   ├── hangzhou.ts        # HANGZHOU_2026
│   │   └── index.ts           # CITIES 注册表
│   ├── calc/
│   │   ├── format.ts          # round2 / round0 / formatMoney / formatPercent
│   │   ├── tax.ts             # 税率表、累计预扣、奖金单独计税
│   │   ├── social.ts          # 基数 clamp、社保公积金月度明细
│   │   └── annual.ts          # computeAnnual：整年流水 + 三方案 + 汇总
│   └── components/
│       ├── InputPanel.tsx     # 输入表单（含 FormState 类型）
│       ├── SummaryCards.tsx   # 总到手 + 方案对比
│       ├── MonthlyTable.tsx   # 月度明细 + 奖金行 + 合计
│       ├── InsuranceCard.tsx  # 社保公积金明细表
│       ├── MonthlyChart.tsx   # 堆叠柱状图
│       └── Footer.tsx         # 政策来源 + 免责声明
└── tests/
    ├── policy.test.ts
    ├── format.test.ts
    ├── tax.test.ts
    ├── social.test.ts
    └── annual.test.ts
```

---

### Task 1: 项目脚手架

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `src/main.tsx`, `src/index.css`, `src/App.tsx`

- [ ] **Step 1: 写 package.json**

```json
{
  "name": "salary-tool",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
npm i react react-dom recharts
npm i -D vite @vitejs/plugin-react typescript @types/react @types/react-dom tailwindcss @tailwindcss/vite vitest
```

- [ ] **Step 3: 写 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>工资计算器 · 2026</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 写 vite.config.ts**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
});
```

- [ ] **Step 5: 写 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "useDefineForClassFields": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 6: 写 .gitignore**

```
node_modules
dist
```

- [ ] **Step 7: 写 src/index.css、src/main.tsx、src/App.tsx（占位）**

`src/index.css`:

```css
@import "tailwindcss";
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx`（Task 7 会整体替换）:

```tsx
export default function App() {
  return <h1 className="p-8 text-2xl font-bold">工资计算器 · 2026</h1>;
}
```

- [ ] **Step 8: 验证 dev server 与 vitest**

```bash
npm run dev &
sleep 2 && curl -s http://localhost:5173 | head -5; kill %1
npx vitest run --passWithNoTests
```

Expected: curl 返回含 `<div id="root">` 的 HTML；vitest 输出 "No test files found" 且退出码 0。

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json .gitignore src/
git commit -m "chore: scaffold Vite+React+TS+Tailwind+Vitest"
```

---

### Task 2: policy 模块（城市政策参数）

**Files:**
- Create: `src/policy/types.ts`, `src/policy/shanghai.ts`, `src/policy/hangzhou.ts`, `src/policy/index.ts`
- Test: `tests/policy.test.ts`

- [ ] **Step 1: 写失败测试 tests/policy.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { CITY_LIST } from '../src/policy';

describe('policy 参数完整性', () => {
  it.each(CITY_LIST)('$name ($id)', (p) => {
    expect(p.year).toBe(2026);
    expect(p.social.minBase).toBeLessThan(p.social.maxBase);
    expect(p.housingFund.minBase).toBeLessThan(p.housingFund.maxBase);
    for (const rate of [...Object.values(p.social.personal), ...Object.values(p.social.employer)]) {
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThan(1);
    }
    expect(p.social.personal.workInjury).toBe(0);
    expect(p.housingFund.ratioOptions).toContain(p.housingFund.defaultRatio);
    expect(p.housingFund.ratioOptions[p.housingFund.ratioOptions.length - 1]).toBe(p.housingFund.defaultRatio);
    expect(p.housingFund.supplementOptions[0]).toBe(0);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/policy.test.ts`
Expected: FAIL（Cannot find module '../src/policy'）

- [ ] **Step 3: 写实现**

`src/policy/types.ts`:

```ts
export type CityId = 'shanghai' | 'hangzhou';

export interface InsuranceRates {
  pension: number;
  medical: number;      // 已含生育
  unemployment: number;
  workInjury: number;   // 展示用典型费率，个人恒为 0
}

export interface CityPolicy {
  id: CityId;
  name: string;
  year: number;
  social: {
    minBase: number;
    maxBase: number;
    personal: InsuranceRates;
    employer: InsuranceRates;
  };
  housingFund: {
    minBase: number;
    maxBase: number;
    ratioOptions: number[];        // 基本比例可选档，升序
    defaultRatio: number;          // 默认最高档
    supplementOptions: number[];   // 补充比例可选档，首项为 0
  };
}
```

`src/policy/shanghai.ts`:

```ts
import type { CityPolicy } from './types';

export const SHANGHAI_2026: CityPolicy = {
  id: 'shanghai',
  name: '上海',
  year: 2026,
  social: {
    minBase: 7546,
    maxBase: 37731,
    personal: { pension: 0.08, medical: 0.02, unemployment: 0.005, workInjury: 0 },
    employer: { pension: 0.16, medical: 0.09, unemployment: 0.005, workInjury: 0.0026 },
  },
  housingFund: {
    minBase: 2740,
    maxBase: 37731,
    ratioOptions: [0.05, 0.06, 0.07],
    defaultRatio: 0.07,
    supplementOptions: [0, 0.01, 0.02, 0.03, 0.04, 0.05],
  },
};
```

`src/policy/hangzhou.ts`:

```ts
import type { CityPolicy } from './types';

export const HANGZHOU_2026: CityPolicy = {
  id: 'hangzhou',
  name: '杭州',
  year: 2026,
  social: {
    minBase: 4986,
    maxBase: 25299,
    personal: { pension: 0.08, medical: 0.02, unemployment: 0.005, workInjury: 0 },
    employer: { pension: 0.16, medical: 0.095, unemployment: 0.005, workInjury: 0.004 },
  },
  housingFund: {
    minBase: 2660,
    maxBase: 42151,
    ratioOptions: [0.05, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12],
    defaultRatio: 0.12,
    supplementOptions: [0, 0.01, 0.02, 0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09],
  },
};
```

`src/policy/index.ts`:

```ts
import type { CityId, CityPolicy } from './types';
import { SHANGHAI_2026 } from './shanghai';
import { HANGZHOU_2026 } from './hangzhou';

export const CITIES: Record<CityId, CityPolicy> = {
  shanghai: SHANGHAI_2026,
  hangzhou: HANGZHOU_2026,
};

export const CITY_LIST: CityPolicy[] = Object.values(CITIES);

export type { CityId, CityPolicy } from './types';
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/policy.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/policy/ tests/policy.test.ts
git commit -m "feat: 2026 沪杭社保公积金政策参数"
```

---

### Task 3: format 工具

**Files:**
- Create: `src/calc/format.ts`
- Test: `tests/format.test.ts`

- [ ] **Step 1: 写失败测试 tests/format.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { round2, round0, formatMoney, formatPercent } from '../src/calc/format';

describe('rounding', () => {
  it('round2 到分', () => expect(round2(3150.005)).toBe(3150.01));
  it('round0 到元', () => expect(round0(528.22)).toBe(528));
  it('round2 浮点噪声', () => expect(round2(0.1 + 0.2)).toBe(0.3));
});

describe('formatting', () => {
  it('千分位两位小数', () => expect(formatMoney(385830)).toBe('385,830.00'));
  it('百分比整数', () => expect(formatPercent(0.08)).toBe('8%'));
  it('百分比小数', () => expect(formatPercent(0.095)).toBe('9.5%'));
  it('工伤典型值', () => expect(formatPercent(0.0026)).toBe('0.26%'));
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/format.test.ts`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 写实现 src/calc/format.ts**

```ts
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function round0(n: number): number {
  return Math.round(n + Number.EPSILON);
}

export function formatMoney(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(r: number): string {
  return `${+(r * 100).toFixed(2)}%`;
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/format.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/calc/format.ts tests/format.test.ts
git commit -m "feat: 金额与百分比格式化工具"
```

---

### Task 4: tax 计算模块（累计预扣 + 奖金单独计税）

**Files:**
- Create: `src/calc/tax.ts`
- Test: `tests/tax.test.ts`

- [ ] **Step 1: 写失败测试 tests/tax.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { cumulativeTax, bonusTax, withhold } from '../src/calc/tax';

describe('cumulativeTax 综合所得年度税率表', () => {
  it('3% 档', () => expect(cumulativeTax(19750)).toBeCloseTo(592.5));
  it('10% 档上边界', () => expect(cumulativeTax(144000)).toBeCloseTo(11880));
  it('20% 档', () => expect(cumulativeTax(237000)).toBeCloseTo(30480));
  it('25% 档', () => expect(cumulativeTax(337000)).toBeCloseTo(52330));
  it('0 与负数为 0', () => {
    expect(cumulativeTax(0)).toBe(0);
    expect(cumulativeTax(-100)).toBe(0);
  });
});

describe('bonusTax 全年一次性奖金（月度税率表）', () => {
  it('2500/月 落 3% 档', () => expect(bonusTax(30000)).toBeCloseTo(900));
  it('36000 边界', () => expect(bonusTax(36000)).toBeCloseTo(1080));
  it('36001 跳 10% 档', () => expect(bonusTax(36001)).toBeCloseTo(3390.1));
  it('100000', () => expect(bonusTax(100000)).toBeCloseTo(9790));
  it('0 为 0', () => expect(bonusTax(0)).toBe(0));
});

describe('withhold 累计预扣法', () => {
  const months = Array.from({ length: 12 }, () => ({
    gross: 30000,
    personalDeduction: 5250,
    specialDeduction: 0,
  }));

  it('金样逐月税额（前低后高）', () => {
    expect(withhold(months)).toEqual([
      592.5, 837.5, 1975, 1975, 1975, 1975, 1975, 3375, 3950, 3950, 3950, 3950,
    ]);
  });

  it('年终奖并入 12 月后重算', () => {
    const withBonus = months.map((m, i) =>
      i === 11 ? { ...m, gross: m.gross + 100000 } : m,
    );
    const taxes = withhold(withBonus);
    expect(taxes[11]).toBeCloseTo(25800);
    expect(taxes.reduce((a, b) => a + b, 0)).toBeCloseTo(52330);
  });

  it('专项附加扣除进入累计减除', () => {
    const withDeduct = months.map((m) => ({ ...m, specialDeduction: 1500 }));
    // 年应纳税所得额 = 360000 - 60000 - 63000 - 18000 = 219000 → 20% 档
    const taxes = withhold(withDeduct);
    expect(taxes.reduce((a, b) => a + b, 0)).toBeCloseTo(219000 * 0.2 - 16920);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/tax.test.ts`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 写实现 src/calc/tax.ts**

```ts
import { round2 } from './format';

interface Bracket {
  limit: number;
  rate: number;
  quickDeduction: number;
}

// 综合所得年度税率表（累计预扣预缴率表一）
export const ANNUAL_BRACKETS: Bracket[] = [
  { limit: 36000, rate: 0.03, quickDeduction: 0 },
  { limit: 144000, rate: 0.1, quickDeduction: 2520 },
  { limit: 300000, rate: 0.2, quickDeduction: 16920 },
  { limit: 420000, rate: 0.25, quickDeduction: 31920 },
  { limit: 660000, rate: 0.3, quickDeduction: 52920 },
  { limit: 960000, rate: 0.35, quickDeduction: 85920 },
  { limit: Infinity, rate: 0.45, quickDeduction: 181920 },
];

// 全年一次性奖金月度税率表（按 bonus÷12 查档，速算扣除数只减一次）
export const MONTHLY_BRACKETS: Bracket[] = [
  { limit: 3000, rate: 0.03, quickDeduction: 0 },
  { limit: 12000, rate: 0.1, quickDeduction: 210 },
  { limit: 25000, rate: 0.2, quickDeduction: 1410 },
  { limit: 35000, rate: 0.25, quickDeduction: 2660 },
  { limit: 55000, rate: 0.3, quickDeduction: 4410 },
  { limit: 80000, rate: 0.35, quickDeduction: 7160 },
  { limit: Infinity, rate: 0.45, quickDeduction: 15160 },
];

function taxByBrackets(taxable: number, brackets: Bracket[]): number {
  for (const b of brackets) {
    if (taxable <= b.limit) return taxable * b.rate - b.quickDeduction;
  }
  return 0;
}

export function cumulativeTax(cumTaxable: number): number {
  if (cumTaxable <= 0) return 0;
  return taxByBrackets(cumTaxable, ANNUAL_BRACKETS);
}

export function bonusTax(bonus: number): number {
  if (bonus <= 0) return 0;
  return taxByBrackets(bonus, MONTHLY_BRACKETS);
}

export interface MonthInput {
  gross: number;
  personalDeduction: number; // 当月个人三险一金 + 公积金
  specialDeduction: number;  // 当月专项附加扣除
}

export function withhold(months: MonthInput[]): number[] {
  let cumGross = 0;
  let cumDeduct = 0;
  let cumPaid = 0;
  return months.map((m) => {
    cumGross += m.gross;
    cumDeduct += 5000 + m.personalDeduction + m.specialDeduction;
    const cumTaxable = Math.max(0, cumGross - cumDeduct);
    const cumTax = round2(cumulativeTax(cumTaxable));
    const tax = round2(Math.max(0, cumTax - cumPaid));
    cumPaid = round2(cumPaid + tax);
    return tax;
  });
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/tax.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add src/calc/tax.ts tests/tax.test.ts
git commit -m "feat: 个税计算（累计预扣法与全年一次性奖金）"
```

---

### Task 5: social 计算模块（基数 clamp + 社保公积金）

**Files:**
- Create: `src/calc/social.ts`
- Test: `tests/social.test.ts`

- [ ] **Step 1: 写失败测试 tests/social.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { resolveBase, monthlyInsurance } from '../src/calc/social';
import { CITIES } from '../src/policy';

describe('resolveBase 基数 clamp', () => {
  it('中间值不 clamp', () => expect(resolveBase(30000, null, 7546, 37731)).toBe(30000));
  it('低于下限取下限', () => expect(resolveBase(5000, null, 7546, 37731)).toBe(7546));
  it('高于上限取上限', () => expect(resolveBase(50000, null, 7546, 37731)).toBe(37731));
  it('自定义仍被 clamp', () => expect(resolveBase(30000, 6000, 7546, 37731)).toBe(7546));
});

describe('monthlyInsurance 上海（月薪 30000）', () => {
  const { personal, employer } = monthlyInsurance(CITIES.shanghai, 30000, 30000, 0.07, 0);

  it('个人三险', () => {
    expect(personal.pension).toBe(2400);
    expect(personal.medical).toBe(600);
    expect(personal.unemployment).toBe(150);
    expect(personal.workInjury).toBe(0);
  });
  it('个人公积金', () => {
    expect(personal.hfBasic).toBe(2100);
    expect(personal.hfSupplement).toBe(0);
  });
  it('单位部分', () => {
    expect(employer.pension).toBe(4800);
    expect(employer.medical).toBe(2700);
    expect(employer.unemployment).toBe(150);
    expect(employer.workInjury).toBe(78);
    expect(employer.hfBasic).toBe(2100);
  });
});

describe('monthlyInsurance 杭州（月薪 10000）', () => {
  const { personal, employer } = monthlyInsurance(CITIES.hangzhou, 10000, 10000, 0.12, 0);
  it('个人', () => {
    expect(personal.pension).toBe(800);
    expect(personal.medical).toBe(200);
    expect(personal.unemployment).toBe(50);
    expect(personal.hfBasic).toBe(1200);
  });
  it('单位', () => {
    expect(employer.pension).toBe(1600);
    expect(employer.medical).toBe(950);
    expect(employer.workInjury).toBe(40);
  });
});

describe('公积金四舍五入到元', () => {
  it('7546 × 7% = 528.22 → 528', () => {
    const { personal } = monthlyInsurance(CITIES.shanghai, 7546, 7546, 0.07, 0);
    expect(personal.hfBasic).toBe(528);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/social.test.ts`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 写实现 src/calc/social.ts**

```ts
import { round0, round2 } from './format';
import type { CityPolicy, InsuranceRates } from '../policy/types';

export function resolveBase(
  salary: number,
  custom: number | null,
  min: number,
  max: number,
): number {
  return Math.min(Math.max(custom ?? salary, min), max);
}

export interface InsuranceBreakdown {
  pension: number;
  medical: number;
  unemployment: number;
  workInjury: number;
  hfBasic: number;
  hfSupplement: number;
}

function byRates(
  base: number,
  rates: InsuranceRates,
): Pick<InsuranceBreakdown, 'pension' | 'medical' | 'unemployment' | 'workInjury'> {
  return {
    pension: round2(base * rates.pension),
    medical: round2(base * rates.medical),
    unemployment: round2(base * rates.unemployment),
    workInjury: round2(base * rates.workInjury),
  };
}

export function monthlyInsurance(
  policy: CityPolicy,
  socialBase: number,
  hfBase: number,
  hfRatio: number,
  hfSupplementRatio: number,
): { personal: InsuranceBreakdown; employer: InsuranceBreakdown } {
  const p = byRates(socialBase, policy.social.personal);
  const e = byRates(socialBase, policy.social.employer);
  // 公积金按上海规则计算到元（四舍五入）
  const hfBasic = round0(hfBase * hfRatio);
  const hfSupplement = round0(hfBase * hfSupplementRatio);
  return {
    personal: { ...p, workInjury: 0, hfBasic, hfSupplement },
    employer: { ...e, hfBasic, hfSupplement },
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/social.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/calc/social.ts tests/social.test.ts
git commit -m "feat: 社保公积金月度计算与基数 clamp"
```

---

### Task 6: annual 计算模块（整年流水 + 三方案对比）

**Files:**
- Create: `src/calc/annual.ts`
- Test: `tests/annual.test.ts`

- [ ] **Step 1: 写失败测试 tests/annual.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { computeAnnual } from '../src/calc/annual';

const GOLDEN = {
  cityId: 'shanghai' as const,
  monthlySalary: 30000,
  salaryMonths: 13,
  bonus: 100000,
  hfRatio: 0.07,
  hfSupplementRatio: 0,
  specialDeductionMonthly: 0,
  customSocialBase: null,
  customHfBase: null,
};

describe('computeAnnual 金样本例：上海 30000 / 13 薪 / 年终奖 100000', () => {
  const r = computeAnnual(GOLDEN);

  it('推荐方案 A', () => expect(r.recommendedId).toBe('A'));

  it('三方案年度总个税', () => {
    expect(r.schemes.find((s) => s.id === 'A')!.totalTax).toBeCloseTo(41170);
    expect(r.schemes.find((s) => s.id === 'B')!.totalTax).toBeCloseTo(53230);
    expect(r.schemes.find((s) => s.id === 'C')!.totalTax).toBeCloseTo(43270);
  });

  it('年度总到手', () => expect(r.totals.netYear).toBeCloseTo(385830));

  it('逐月税额', () => {
    expect(r.monthlyRows.map((m) => m.tax)).toEqual([
      592.5, 837.5, 1975, 1975, 1975, 1975, 1975, 3375, 3950, 3950, 3950, 3950,
    ]);
  });

  it('逐月税后', () => {
    expect(r.monthlyRows[0].net).toBeCloseTo(24157.5);
    expect(r.monthlyRows[7].net).toBeCloseTo(21375);
    expect(r.monthlyRows[11].net).toBeCloseTo(20800);
  });

  it('奖金行（13 薪 900、年终奖 9790）', () => {
    expect(r.bonuses.map((b) => b.label)).toEqual(['13 薪', '年终奖']);
    expect(r.bonuses[0].tax).toBeCloseTo(900);
    expect(r.bonuses[1].tax).toBeCloseTo(9790);
  });

  it('社保公积金年度合计', () => {
    expect(r.totals.personalSocialYear).toBeCloseTo(37800);
    expect(r.totals.personalHfYear).toBeCloseTo(25200);
    expect(r.totals.employerSocialYear).toBeCloseTo(92736);
    expect(r.totals.employerHfYear).toBeCloseTo(25200);
    expect(r.totals.personalTotalYear).toBeCloseTo(63000);
  });
});

describe('computeAnnual 方案 B 更优的场景', () => {
  // 低薪 + 中等奖金：并入后累计应纳税所得额仍在 3% 档，远低于奖金单独计税的 10% 档
  const input = { ...GOLDEN, monthlySalary: 5000, bonus: 36001, salaryMonths: 12 };
  const r = computeAnnual(input);
  it('推荐 B', () => expect(r.recommendedId).toBe('B'));
  it('12 月税前含并入的年终奖', () => {
    expect(r.monthlyRows[11].gross).toBe(5000 + 36001);
  });
  it('B 总个税 604.71 且低于 A', () => {
    const b = r.schemes.find((s) => s.id === 'B')!;
    expect(b.totalTax).toBeCloseTo(604.71);
    expect(b.totalTax).toBeLessThan(r.schemes.find((s) => s.id === 'A')!.totalTax);
  });
});

describe('computeAnnual 无奖金', () => {
  const r = computeAnnual({ ...GOLDEN, salaryMonths: 12, bonus: 0 });
  it('三方案税额一致', () => {
    expect(new Set(r.schemes.map((s) => s.totalTax)).size).toBe(1);
  });
  it('无奖金行', () => expect(r.bonuses).toHaveLength(0));
});
```

- [ ] **Step 2: 运行确认失败**

Run: `npx vitest run tests/annual.test.ts`
Expected: FAIL（Cannot find module）

- [ ] **Step 3: 写实现 src/calc/annual.ts**

```ts
import { CITIES } from '../policy';
import type { CityId } from '../policy/types';
import { monthlyInsurance, resolveBase } from './social';
import type { InsuranceBreakdown } from './social';
import { bonusTax, withhold } from './tax';
import type { MonthInput } from './tax';
import { round2 } from './format';

export interface SalaryInput {
  cityId: CityId;
  monthlySalary: number;
  salaryMonths: number; // 12-16，超出 12 的部分为奖金
  bonus: number;
  hfRatio: number;
  hfSupplementRatio: number;
  specialDeductionMonthly: number;
  customSocialBase: number | null;
  customHfBase: number | null;
}

export interface MonthRow {
  month: number;
  gross: number;
  personalTotal: number;
  tax: number;
  net: number;
}

export interface BonusRow {
  label: string;
  gross: number;
  tax: number;
  net: number;
}

export interface SchemeResult {
  id: 'A' | 'B' | 'C';
  label: string;
  totalTax: number;
  totalNet: number;
}

export interface AnnualResult {
  cityId: CityId;
  socialBase: number;
  hfBase: number;
  insurance: { personal: InsuranceBreakdown; employer: InsuranceBreakdown };
  monthlyRows: MonthRow[];
  bonuses: BonusRow[];
  schemes: SchemeResult[];
  recommendedId: SchemeResult['id'];
  totals: {
    grossYear: number;
    personalSocialYear: number;
    personalHfYear: number;
    personalTotalYear: number;
    employerSocialYear: number;
    employerHfYear: number;
    employerTotalYear: number;
    taxYear: number;
    netYear: number;
  };
}

const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));

export function computeAnnual(input: SalaryInput): AnnualResult {
  const policy = CITIES[input.cityId];
  const socialBase = resolveBase(
    input.monthlySalary,
    input.customSocialBase,
    policy.social.minBase,
    policy.social.maxBase,
  );
  const hfBase = resolveBase(
    input.monthlySalary,
    input.customHfBase,
    policy.housingFund.minBase,
    policy.housingFund.maxBase,
  );
  const insurance = monthlyInsurance(
    policy,
    socialBase,
    hfBase,
    input.hfRatio,
    input.hfSupplementRatio,
  );
  const p = insurance.personal;
  const e = insurance.employer;
  const personalMonthly = sum([
    p.pension, p.medical, p.unemployment, p.hfBasic, p.hfSupplement,
  ]);

  const months: MonthInput[] = Array.from({ length: 12 }, () => ({
    gross: input.monthlySalary,
    personalDeduction: personalMonthly,
    specialDeduction: input.specialDeductionMonthly,
  }));

  const bonus = Math.max(0, input.bonus);
  const extraSalaries = Array.from(
    { length: Math.max(0, input.salaryMonths - 12) },
    () => input.monthlySalary,
  );

  const bonusRow = (label: string, gross: number): BonusRow => {
    const tax = round2(bonusTax(gross));
    return { label, gross, tax, net: round2(gross - tax) };
  };

  // 方案 A：各笔奖金分别单独计税（常用简化口径）
  const taxesA = withhold(months);
  const bonusesA: BonusRow[] = [
    ...extraSalaries.map((gross, i) => bonusRow(`${13 + i} 薪`, gross)),
    ...(bonus > 0 ? [bonusRow('年终奖', bonus)] : []),
  ];

  // 方案 B：年终奖并入 12 月综合所得，其余奖金仍单独计税
  const monthsB = months.map((m, i) =>
    i === 11 ? { ...m, gross: m.gross + bonus } : m,
  );
  const taxesB = withhold(monthsB);
  const bonusesB: BonusRow[] = extraSalaries.map((gross, i) => bonusRow(`${13 + i} 薪`, gross));

  // 方案 C：全部奖金合并为一笔单独计税
  const pool = round2(extraSalaries.reduce((a, b) => a + b, 0) + bonus);
  const taxesC = taxesA;
  const bonusesC: BonusRow[] = pool > 0 ? [bonusRow('奖金合并', pool)] : [];

  const grossYear = round2(input.monthlySalary * 12 + pool);

  const buildScheme = (
    id: SchemeResult['id'],
    label: string,
    taxes: number[],
    bonuses: BonusRow[],
  ): SchemeResult => {
    const totalTax = round2(sum(taxes) + sum(bonuses.map((b) => b.tax)));
    return {
      id,
      label,
      totalTax,
      totalNet: round2(grossYear - personalMonthly * 12 - totalTax),
    };
  };

  const schemes: SchemeResult[] = [
    buildScheme('A', '各笔奖金分别单独计税', taxesA, bonusesA),
    buildScheme('B', '年终奖并入综合所得', taxesB, bonusesB),
    buildScheme('C', '全部奖金合并一笔单独计税', taxesC, bonusesC),
  ];
  const recommendedId = schemes.reduce(
    (best, s) => (s.totalTax < best.totalTax ? s : best),
    schemes[0],
  ).id;
  const rec = schemes.find((s) => s.id === recommendedId)!;

  const useB = recommendedId === 'B';
  const recTaxes = useB ? taxesB : taxesA;
  const recBonuses =
    recommendedId === 'A' ? bonusesA : useB ? bonusesB : bonusesC;
  const flowMonths = useB ? monthsB : months;

  const monthlyRows: MonthRow[] = flowMonths.map((m, i) => ({
    month: i + 1,
    gross: m.gross,
    personalTotal: personalMonthly,
    tax: recTaxes[i],
    net: round2(m.gross - personalMonthly - recTaxes[i]),
  }));

  const personalSocialYear = round2((p.pension + p.medical + p.unemployment) * 12);
  const personalHfYear = round2((p.hfBasic + p.hfSupplement) * 12);
  const employerSocialYear = round2(
    (e.pension + e.medical + e.unemployment + e.workInjury) * 12,
  );
  const employerHfYear = round2((e.hfBasic + e.hfSupplement) * 12);

  return {
    cityId: input.cityId,
    socialBase,
    hfBase,
    insurance,
    monthlyRows,
    bonuses: recBonuses,
    schemes,
    recommendedId,
    totals: {
      grossYear,
      personalSocialYear,
      personalHfYear,
      personalTotalYear: round2(personalSocialYear + personalHfYear),
      employerSocialYear,
      employerHfYear,
      employerTotalYear: round2(employerSocialYear + employerHfYear),
      taxYear: rec.totalTax,
      netYear: rec.totalNet,
    },
  };
}
```

- [ ] **Step 4: 运行确认通过**

Run: `npx vitest run tests/annual.test.ts`
Expected: PASS (12 tests)。若金样数字不符，回查本计划"金样本例"手工过程，勿改期望值迁就实现。

- [ ] **Step 5: 全量测试**

Run: `npm run test`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/calc/annual.ts tests/annual.test.ts
git commit -m "feat: 整年流水与年终奖三方案对比"
```

---

### Task 7: App 骨架 + 输入面板

**Files:**
- Modify: `src/App.tsx`（整体替换）
- Create: `src/components/InputPanel.tsx`

- [ ] **Step 1: 写 src/components/InputPanel.tsx**

```tsx
import { CITY_LIST } from '../policy';
import type { CityId, CityPolicy } from '../policy/types';
import { formatMoney, formatPercent } from '../calc/format';

export interface FormState {
  cityId: CityId;
  monthlySalary: number;
  salaryMonths: number;
  bonus: number;
  hfRatio: number;
  hfSupplementRatio: number;
  specialDeductionMonthly: number;
  customSocialBase: number | null;
  customHfBase: number | null;
}

interface Props {
  form: FormState;
  policy: CityPolicy;
  socialBase: number;
  hfBase: number;
  patch: (p: Partial<FormState>) => void;
}

const labelCls = 'block text-xs text-gray-500 mb-1';
const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const overrideCls = 'border-orange-400 ring-1 ring-orange-300';

export default function InputPanel({ form, policy, socialBase, hfBase, patch }: Props) {
  const num =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      patch({ [key]: Number(e.target.value) || 0 } as Partial<FormState>);

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div>
        <span className={labelCls}>工作城市</span>
        <div className="flex gap-2">
          {CITY_LIST.map((c) => (
            <button
              key={c.id}
              onClick={() =>
                patch({
                  cityId: c.id,
                  hfRatio: c.housingFund.defaultRatio,
                  customSocialBase: null,
                  customHfBase: null,
                })
              }
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                form.cityId === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls}>月薪（税前，元/月）</label>
        <input type="number" min={0} className={inputCls} value={form.monthlySalary} onChange={num('monthlySalary')} />
      </div>

      <div>
        <label className={labelCls}>薪数</label>
        <select
          className={inputCls}
          value={form.salaryMonths}
          onChange={(e) => patch({ salaryMonths: Number(e.target.value) })}
        >
          {[12, 13, 14, 15, 16].map((m) => (
            <option key={m} value={m}>{m} 薪</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">超出 12 的部分按奖金单独计税</p>
      </div>

      <div>
        <label className={labelCls}>年终奖（元）</label>
        <input type="number" min={0} className={inputCls} value={form.bonus} onChange={num('bonus')} />
      </div>

      <div>
        <label className={labelCls}>基本公积金比例（单位 = 个人）</label>
        <select
          className={inputCls}
          value={form.hfRatio}
          onChange={(e) => patch({ hfRatio: Number(e.target.value) })}
        >
          {policy.housingFund.ratioOptions.map((r) => (
            <option key={r} value={r}>{formatPercent(r)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>补充公积金比例（单位 = 个人）</label>
        <select
          className={inputCls}
          value={form.hfSupplementRatio}
          onChange={(e) => patch({ hfSupplementRatio: Number(e.target.value) })}
        >
          {policy.housingFund.supplementOptions.map((r) => (
            <option key={r} value={r}>{r === 0 ? '无' : formatPercent(r)}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">上海政策上限 5%；杭州以单位实际执行为准</p>
      </div>

      <div>
        <label className={labelCls}>每月专项附加扣除（元）</label>
        <input type="number" min={0} className={inputCls} value={form.specialDeductionMonthly} onChange={num('specialDeductionMonthly')} />
        <p className="mt-1 text-xs text-gray-400">房租/房贷、子女教育、赡养老人等每月合计</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>社保基数</label>
          <input
            type="number" min={0}
            className={`${inputCls} ${form.customSocialBase !== null ? overrideCls : ''}`}
            placeholder={`自动 ¥${formatMoney(socialBase)}`}
            value={form.customSocialBase ?? ''}
            onChange={(e) => patch({ customSocialBase: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <label className={labelCls}>公积金基数</label>
          <input
            type="number" min={0}
            className={`${inputCls} ${form.customHfBase !== null ? overrideCls : ''}`}
            placeholder={`自动 ¥${formatMoney(hfBase)}`}
            value={form.customHfBase ?? ''}
            onChange={(e) => patch({ customHfBase: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {policy.name} {policy.year} 年政策 · 社保基数下限 ¥{formatMoney(policy.social.minBase)} / 上限 ¥{formatMoney(policy.social.maxBase)}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: 整体替换 src/App.tsx**

```tsx
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
```

- [ ] **Step 3: 类型检查与构建**

Run: `npm run build`
Expected: tsc 无错误，vite build 成功

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/InputPanel.tsx
git commit -m "feat: 输入面板与城市切换"
```

---

### Task 8: 汇总卡片 + 月度明细表

**Files:**
- Create: `src/components/SummaryCards.tsx`, `src/components/MonthlyTable.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 写 src/components/SummaryCards.tsx**

```tsx
import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function SummaryCards({ result }: { result: AnnualResult }) {
  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">年度总到手</p>
        <p className="text-4xl font-bold text-green-600">¥ {formatMoney(result.totals.netYear)}</p>
        <p className="mt-1 text-xs text-gray-500">
          税前年总包 ¥{formatMoney(result.totals.grossYear)} · 年度个税 ¥{formatMoney(result.totals.taxYear)}
        </p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">年终奖计税方案对比</p>
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left font-normal">方案</th>
              <th className="font-normal">年度总个税</th>
              <th className="font-normal">年度总到手</th>
            </tr>
          </thead>
          <tbody>
            {result.schemes.map((s) => {
              const best = s.id === result.recommendedId;
              return (
                <tr key={s.id} className={`border-t ${best ? 'bg-green-50' : ''}`}>
                  <td className="py-1.5 text-left">
                    {s.id} · {s.label}
                    {best && (
                      <span className="ml-2 rounded bg-green-600 px-1.5 py-0.5 text-xs text-white">推荐</span>
                    )}
                  </td>
                  <td className={best ? 'font-semibold text-green-700' : ''}>¥{formatMoney(s.totalTax)}</td>
                  <td className={best ? 'font-semibold text-green-700' : ''}>¥{formatMoney(s.totalNet)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1 text-xs text-gray-400">方案 A 为常用简化口径（严格政策下一年仅一笔奖金可单独计税）</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: 写 src/components/MonthlyTable.tsx**

```tsx
import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyTable({ result }: { result: AnnualResult }) {
  const { monthlyRows, bonuses } = result;
  const grossSum =
    monthlyRows.reduce((a, r) => a + r.gross, 0) + bonuses.reduce((a, b) => a + b.gross, 0);
  const dedSum = monthlyRows.reduce((a, r) => a + r.personalTotal, 0);
  const taxSum =
    monthlyRows.reduce((a, r) => a + r.tax, 0) + bonuses.reduce((a, b) => a + b.tax, 0);
  const netSum = grossSum - dedSum - taxSum;

  return (
    <section className="overflow-x-auto rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold">月度明细</h2>
      <table className="w-full min-w-[560px] text-right text-sm">
        <thead>
          <tr className="text-gray-500">
            <th className="py-1 text-left font-normal">月份</th>
            <th className="py-1 font-normal">税前</th>
            <th className="py-1 font-normal">三险一金（个人）</th>
            <th className="py-1 font-normal">个税</th>
            <th className="py-1 font-normal">税后</th>
          </tr>
        </thead>
        <tbody>
          {monthlyRows.map((r) => (
            <tr key={r.month} className="border-t">
              <td className="py-1.5 text-left">{r.month} 月</td>
              <td>{formatMoney(r.gross)}</td>
              <td className="text-blue-600">{formatMoney(r.personalTotal)}</td>
              <td className="text-red-600">{formatMoney(r.tax)}</td>
              <td className="font-medium text-green-600">{formatMoney(r.net)}</td>
            </tr>
          ))}
          {bonuses.map((b) => (
            <tr key={b.label} className="border-t bg-amber-50">
              <td className="py-1.5 text-left">{b.label}</td>
              <td>{formatMoney(b.gross)}</td>
              <td className="text-gray-400">—</td>
              <td className="text-red-600">{formatMoney(b.tax)}</td>
              <td className="font-medium text-green-600">{formatMoney(b.net)}</td>
            </tr>
          ))}
          <tr className="border-t-2 font-semibold">
            <td className="py-1.5 text-left">合计</td>
            <td>{formatMoney(grossSum)}</td>
            <td className="text-blue-600">{formatMoney(dedSum)}</td>
            <td className="text-red-600">{formatMoney(taxSum)}</td>
            <td className="text-green-600">{formatMoney(netSum)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 3: 修改 src/App.tsx 接入两个组件**

把 App.tsx 中"结果组件将在后续任务接入"占位 `<div>` 整体替换为：

```tsx
<SummaryCards result={result} />
<MonthlyTable result={result} />
```

并在文件头部增加导入：

```tsx
import SummaryCards from './components/SummaryCards';
import MonthlyTable from './components/MonthlyTable';
```

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 成功

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/SummaryCards.tsx src/components/MonthlyTable.tsx
git commit -m "feat: 年度汇总卡片与月度明细表"
```

---

### Task 9: 社保公积金卡片 + 图表 + 页脚

**Files:**
- Create: `src/components/InsuranceCard.tsx`, `src/components/MonthlyChart.tsx`, `src/components/Footer.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 写 src/components/InsuranceCard.tsx**

```tsx
import { formatMoney } from '../calc/format';
import type { AnnualResult } from '../calc/annual';
import type { InsuranceBreakdown } from '../calc/social';

const ROWS: { key: keyof InsuranceBreakdown; label: string }[] = [
  { key: 'pension', label: '养老保险' },
  { key: 'medical', label: '医疗保险（含生育）' },
  { key: 'unemployment', label: '失业保险' },
  { key: 'workInjury', label: '工伤保险（仅单位）' },
  { key: 'hfBasic', label: '基本公积金' },
  { key: 'hfSupplement', label: '补充公积金' },
];

const sumAll = (b: InsuranceBreakdown) =>
  b.pension + b.medical + b.unemployment + b.workInjury + b.hfBasic + b.hfSupplement;

export default function InsuranceCard({ result }: { result: AnnualResult }) {
  const { personal, employer } = result.insurance;
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-semibold">社保公积金明细</h2>
      <p className="mb-3 text-xs text-gray-500">
        社保基数 ¥{formatMoney(result.socialBase)} · 公积金基数 ¥{formatMoney(result.hfBase)} · 工伤费率因行业而异，取典型值展示
      </p>
      <table className="w-full text-right text-sm">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left font-normal">险种</th>
            <th className="font-normal">个人/月</th>
            <th className="font-normal">单位/月</th>
            <th className="font-normal">个人/年</th>
            <th className="font-normal">单位/年</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => (
            <tr key={key} className="border-t">
              <td className="py-1.5 text-left">{label}</td>
              <td>{formatMoney(personal[key])}</td>
              <td>{formatMoney(employer[key])}</td>
              <td>{formatMoney(personal[key] * 12)}</td>
              <td>{formatMoney(employer[key] * 12)}</td>
            </tr>
          ))}
          <tr className="border-t-2 font-semibold">
            <td className="py-1.5 text-left">合计</td>
            <td>{formatMoney(sumAll(personal))}</td>
            <td>{formatMoney(sumAll(employer))}</td>
            <td>{formatMoney(result.totals.personalTotalYear)}</td>
            <td>{formatMoney(result.totals.employerTotalYear)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 2: 写 src/components/MonthlyChart.tsx**

```tsx
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { formatMoney, round2 } from '../calc/format';
import type { AnnualResult } from '../calc/annual';

export default function MonthlyChart({ result }: { result: AnnualResult }) {
  const data = result.monthlyRows.map((r) => ({
    name: `${r.month}月`,
    税后: r.net,
    个税: r.tax,
    社保公积金: r.personalTotal,
  }));
  const bonusNet = round2(result.bonuses.reduce((a, b) => a + b.net, 0));
  const bonusTax = round2(result.bonuses.reduce((a, b) => a + b.tax, 0));
  if (bonusNet > 0) {
    data.push({ name: '奖金', 税后: bonusNet, 个税: bonusTax, 社保公积金: 0 });
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold">月度构成</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v) => `¥${formatMoney(Number(v))}`} />
            <Legend />
            <Bar dataKey="税后" stackId="a" fill="#16a34a" />
            <Bar dataKey="个税" stackId="a" fill="#dc2626" />
            <Bar dataKey="社保公积金" stackId="a" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: 写 src/components/Footer.tsx**

```tsx
export default function Footer() {
  return (
    <footer className="mx-auto max-w-6xl space-y-1 px-4 py-8 text-xs text-gray-500">
      <p>
        政策依据：上海市人社局 2026 年度社保基数 7546–37731 元（2026-07 起）· 沪公积金管委会〔2026〕3 号（公积金 5%–7%、补充 1%–5%）·
        浙江省 2026 年度社保基数 4986–25299 元 · 杭州公积金基数 2660–42151 元（比例 5%–12%，补充以单位实际执行为准）。
      </p>
      <p>按 2026 年政策估算，实际以单位申报为准，仅供参考。</p>
    </footer>
  );
}
```

- [ ] **Step 4: 修改 src/App.tsx 接入**

`<MonthlyTable ... />` 之后、`</div>` 之前插入：

```tsx
<InsuranceCard result={result} />
<MonthlyChart result={result} />
```

`</main>` 之前插入：

```tsx
<Footer />
```

文件头部增加导入：

```tsx
import InsuranceCard from './components/InsuranceCard';
import MonthlyChart from './components/MonthlyChart';
import Footer from './components/Footer';
```

- [ ] **Step 5: 构建验证**

Run: `npm run build`
Expected: 成功

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/InsuranceCard.tsx src/components/MonthlyChart.tsx src/components/Footer.tsx
git commit -m "feat: 社保公积金明细卡片、月度图表与页脚"
```

---

### Task 10: 浏览器端到端验证 + 发布构建

**Files:** 无新文件（验证任务）

- [ ] **Step 1: 全量单测**

Run: `npm run test`
Expected: 全部 PASS

- [ ] **Step 2: 启动 dev server（后台）**

Run: `npm run dev`（后台运行，端口 5173）

- [ ] **Step 3: Chrome DevTools MCP 浏览器验证金样本例**

1. `navigate_page` 打开 `http://localhost:5173`
2. `take_snapshot` 确认输入面板渲染
3. 填入金样本例：月薪 30000、薪数"13 薪"、年终奖 100000（城市默认上海、公积金 7%）
4. `take_snapshot` 核对：
   - 年度总到手 = ¥385,830.00，方案 A 标"推荐"
   - 方案对比：A 41,170 / B 53,230 / C 43,270
   - 月度明细：1 月税后 24,157.50、8 月 21,375.00、12 月 20,800.00；"13 薪"行税 900、"年终奖"行税 9,790
   - 社保卡片：个人/年 63,000.00、单位/年 117,936.00
5. `take_screenshot` 留档
6. 切换杭州 Tab，确认公积金比例下拉变为 5%–12% 且默认 12%、社保基数说明变为 4,986–25,299

- [ ] **Step 4: 生产构建验证**

Run: `npm run build`
Expected: `dist/` 生成成功

- [ ] **Step 5: 停止 dev server，收尾 commit（若有微调）**

```bash
git add -A
git commit -m "chore: 端到端验证通过"
```

---

## 自审记录

- **Spec 覆盖**：2.1 全部输入项 → Task 7；2.2 全部输出项 → Task 8/9；2.3 计税口径 → Task 6；政策参数 → Task 2；测试规范 → Task 2-6 + Task 10 浏览器验证；免责与来源 → Task 9 Footer。无缺口。
- **占位符扫描**：无 TBD/TODO；所有步骤含完整代码或精确命令。
- **类型一致性**：`FormState`（InputPanel 定义、App 消费）、`AnnualResult/MonthRow/BonusRow/SchemeResult`（annual 定义，组件消费）、`InsuranceBreakdown` 键名（social 定义、InsuranceCard ROWS 消费）一致。
