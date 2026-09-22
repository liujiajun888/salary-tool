import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { createPlanSnapshot, DEFAULT_FORM } from '../src/storage';

async function section(page: Page, name: '薪资参数' | '测算结果' | '方案对比') {
  const id = { 薪资参数: 'input', 测算结果: 'results', 方案对比: 'compare' }[name];
  await page.locator(`#${id}`).scrollIntoViewIfNeeded();
}

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), {
    message: '页面在响应式布局稳定后不应横向溢出',
  }).toBeLessThanOrEqual(0);
}

async function nameAndSave(page: Page, name: string) {
  await section(page, '薪资参数');
  await page.locator('#company-name').fill(name);
  await page.getByRole('button', { name: '保存为对比方案', exact: true }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}

test('default cash, no-bonus state and responsive layout', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  await page.goto('/');
  await noOverflow(page);
  await section(page, '测算结果');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥186,720.00');
  await expect(page.getByTestId('annual-stock')).toHaveCount(0);
  await expect(page.getByText('推荐', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '年终奖计税', exact: true })).toHaveCount(0);
  await expect(page.locator('.chart-frame svg').first()).toBeVisible();
  await expect(page.locator('#input')).toBeVisible();
  await expect(page.locator('#results')).toBeVisible();
  await expect(page.locator('#compare')).toBeVisible();
  await expect(page.getByRole('navigation', { name: '测算分区' })).toHaveCount(0);
  await expect(page.locator('.mobile-bottom')).toHaveCount(0);
  await expect(page.getByTestId('annual-cash')).toHaveCount(1);
  await expect(page.locator('.monthly-desktop tbody tr')).toHaveCount(12);
  await noOverflow(page);
  expect(errors).toEqual([]);
});

test('cash and equity are isolated, signing bonus is removed by recalculation', async ({ page }) => {
  await page.goto('/');
  await page.locator('#monthly-salary').fill('30000');
  await page.locator('#salary-months').selectOption('13');
  await page.locator('#bonus').fill('100000');
  await page.locator('#signing-bonus').fill('50000');
  await page.locator('#stock-income').fill('100000');
  await section(page, '测算结果');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥419,880.00');
  await expect(page.getByTestId('annual-stock')).toHaveText('¥92,520.00');
  await expect(page.getByText(/不含签字费的后续年度现金/)).toContainText('380,730.00');
  await page.getByText('为什么这个月扣了这些税？', { exact: true }).click();
  await expect(page.locator('.formula')).toContainText('20,800.00');
  await page.getByLabel('查看月份', { exact: true }).selectOption('1');
  await expect(page.locator('.formula')).toContainText('592.50');
  await section(page, '薪资参数');
  await page.locator('#stock-income').fill('0');
  await section(page, '测算结果');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥419,880.00');
  await expect(page.getByTestId('annual-stock')).toHaveCount(0);
  await noOverflow(page);
});

test('empty and zero salaries do not show negative estimates or allow save', async ({ page }) => {
  await page.goto('/');
  await page.locator('#monthly-salary').fill('');
  await expect(page.getByRole('button', { name: '保存为对比方案', exact: true })).toBeDisabled();
  await section(page, '测算结果');
  await expect(page.getByRole('heading', { name: '先填写税前月薪' })).toBeVisible();
  await expect(page.getByTestId('annual-cash')).not.toBeVisible();
  await section(page, '薪资参数');
  await page.locator('#monthly-salary').fill('20000.50');
  await section(page, '测算结果');
  await expect(page.getByTestId('annual-cash')).toBeVisible();
});

test('equal tax outcomes do not recommend a winner', async ({ page }) => {
  await page.goto('/');
  await page.locator('#monthly-salary').fill('8000');
  await page.locator('#bonus').fill('1000');
  await section(page, '测算结果');
  await expect(page.getByText('两种方式结果相同', { exact: true })).toBeVisible();
  await expect(page.getByText('推荐', { exact: true })).toHaveCount(0);
});

test('scheme B is recommended for the low-salary bonus case', async ({ page }) => {
  await page.goto('/');
  await page.locator('#monthly-salary').fill('5000');
  await page.locator('#bonus').fill('36001');
  await section(page, '测算结果');
  await expect(page.locator('.scheme-best')).toContainText('年终奖并入综合所得');
  await expect(page.locator('.scheme-best')).toContainText('668.79');
});

test('save, edit, cancel, update, load and delete preserve plan boundaries', async ({ page }) => {
  await page.goto('/');
  await nameAndSave(page, '当前工作');
  await section(page, '薪资参数');
  await page.locator('#monthly-salary').fill('30000');
  await nameAndSave(page, '新 Offer');
  await page.getByRole('button', { name: '编辑当前工作', exact: true }).click();
  await expect(page.locator('#monthly-salary')).toHaveValue('20000');
  await page.locator('#monthly-salary').fill('25000');
  await page.getByRole('button', { name: '取消编辑', exact: true }).click();
  await expect(page.locator('#monthly-salary')).toHaveValue('30000');
  await section(page, '方案对比');
  await page.getByRole('button', { name: '编辑当前工作', exact: true }).click();
  await page.locator('#monthly-salary').fill('25000');
  await page.getByRole('button', { name: '更新方案', exact: true }).click();
  await expect(page.locator('.plan-card')).toHaveCount(2);
  await expect(page.getByTestId('annual-cash')).toHaveText('¥226,920.00');
  await expect(page.locator('.plan-card').filter({ has: page.getByRole('heading', { name: '当前工作', exact: true }) })).toContainText('月薪 25,000.00');
  await page.getByRole('button', { name: '编辑新 Offer', exact: true }).click();
  await expect(page.locator('#monthly-salary')).toHaveValue('30000');
  await section(page, '方案对比');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除当前工作', exact: true }).click();
  await expect(page.locator('.plan-card')).toHaveCount(1);
  await page.reload();
  await section(page, '方案对比');
  await expect(page.getByRole('heading', { name: '新 Offer', exact: true })).toBeVisible();
});

const savedExamples = [
  createPlanSnapshot({ ...DEFAULT_FORM, companyName: '上海方案', monthlySalary: 30000, salaryMonths: 13, bonus: 100000, signingBonus: 50000, stockIncome: 100000 }, 'shanghai-saved', '上海方案'),
  createPlanSnapshot({ ...DEFAULT_FORM, companyName: '杭州方案', cityId: 'hangzhou', monthlySalary: 10000, hfRatio: 0.12, hfSupplementRatio: 0.09, customSocialBase: 10000, customHfBase: 10000 }, 'hangzhou-saved', '杭州方案'),
];

async function openSavedExamples(page: Page) {
  await page.addInitScript(({ plans, form }) => {
    localStorage.setItem('salary-tool-plans', JSON.stringify(plans));
    localStorage.setItem('salary-tool-form', JSON.stringify(form));
  }, { plans: savedExamples, form: { ...DEFAULT_FORM, monthlySalary: 90000, companyName: '未保存草稿' } });
  await page.goto('/');
  await section(page, '方案对比');
}

test('plan cards refill the same form and update the single result panel', async ({ page }) => {
  await openSavedExamples(page);
  const results = page.locator('#results');
  const shanghaiCard = page.locator('.plan-card').filter({ has: page.getByRole('button', { name: '查看上海方案', exact: true }) });
  await shanghaiCard.click({ position: { x: 15, y: 85 } });
  await expect(page.getByRole('button', { name: '查看上海方案', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#company-name')).toHaveValue('上海方案');
  await expect(page.locator('#monthly-salary')).toHaveValue('30000');
  await expect(page.locator('#salary-months')).toHaveValue('13');
  await expect(page.locator('#signing-bonus')).toHaveValue('50000');
  await expect(results.getByTestId('annual-cash')).toHaveText('¥419,880.00');
  await expect(results.getByTestId('annual-stock')).toHaveText('¥92,520.00');
  await expect(results.locator('.monthly-desktop tbody tr').last()).toContainText('110,000.00');
  await results.getByText('为什么这个月扣了这些税？', { exact: true }).click();
  await expect(results.locator('.formula')).toContainText('20,800.00');
  await page.getByRole('button', { name: '查看杭州方案', exact: true }).click();
  await expect(page.locator('#company-name')).toHaveValue('杭州方案');
  await expect(page.locator('#monthly-salary')).toHaveValue('10000');
  await expect(page.locator('#salary-months')).toHaveValue('12');
  await expect(page.locator('#signing-bonus')).toHaveValue('0');
  await expect(page.locator('#hf-ratio')).toHaveValue('0.12');
  await expect(page.locator('#hf-supplement')).toHaveValue('0.09');
  await expect(page.locator('#custom-social-base')).toHaveValue('10000');
  await expect(results.getByTestId('annual-cash')).toHaveText('¥80,340.00');
  await expect(results.getByTestId('annual-stock')).toHaveCount(0);
  await expect(results.locator('.formula-grid')).toContainText('130,800.00');
  await expect(results.locator('.formula')).toContainText('1,860.00');
  await expect(page.getByTestId('annual-cash')).toHaveCount(1);
  await expect(page.getByTestId('selected-plan-details')).toHaveCount(0);
  await expect(page.locator('#input')).toBeVisible();
  await expect(page.locator('#compare')).toBeVisible();
  await page.locator('#monthly-salary').fill('12000');
  await expect(page.getByRole('button', { name: '查看杭州方案', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(results.getByTestId('annual-cash')).not.toHaveText('¥80,340.00');
  const salaries = await page.evaluate(() => JSON.parse(localStorage.getItem('salary-tool-plans')!).map((plan: {input: {monthlySalary: number}}) => plan.input.monthlySalary));
  expect(salaries).toEqual([30000, 10000]);
  await noOverflow(page);
});

test('keyboard selection switches results without separate detail screens', async ({ page }) => {
  await openSavedExamples(page);
  const choice = page.getByRole('button', { name: '查看上海方案', exact: true });
  await choice.focus();
  await choice.press('Enter');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥419,880.00');
  await expect(page.getByText(/不含签字费的后续年度现金/)).toContainText('380,730.00');
  await expect(page.locator('.result-context')).toContainText('上海方案');
  await page.getByRole('button', { name: '查看杭州方案', exact: true }).focus();
  await page.getByRole('button', { name: '查看杭州方案', exact: true }).press('Space');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥80,340.00');
  await expect(page.locator('.result-context')).toContainText('杭州方案');
  await page.getByRole('button', { name: '编辑上海方案', exact: true }).click();
  await expect(page.locator('#signing-bonus')).toHaveValue('50000');
  expect(await page.locator('[id]').evaluateAll((elements) => {
    const ids = elements.map((element) => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  })).toEqual([]);
});

test('deleting selected plan keeps the current form and allows another selection', async ({ page }) => {
  await openSavedExamples(page);
  await page.getByRole('button', { name: '查看上海方案', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除上海方案', exact: true }).click();
  await expect(page.locator('.result-context')).toHaveCount(0);
  await expect(page.locator('#monthly-salary')).toHaveValue('30000');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥419,880.00');
  await page.getByRole('button', { name: '查看杭州方案', exact: true }).click();
  await expect(page.getByTestId('annual-cash')).toHaveText('¥80,340.00');
  await expect(page.locator('.compare-table')).toHaveCount(0);
});

test('clearing optional amounts does not collapse the focused inputs', async ({ page }) => {
  await page.goto('/');
  await page.locator('#signing-bonus').fill('50000');
  await page.locator('#signing-bonus').fill('');
  await expect(page.locator('#signing-bonus')).toBeVisible();
  await page.locator('#signing-bonus').fill('60000');
  await expect(page.locator('#signing-bonus')).toHaveValue('60000');
  await page.locator('#custom-social-base').fill('10000');
  await page.locator('#custom-social-base').fill('');
  await expect(page.locator('#custom-social-base')).toBeVisible();
  await page.locator('#custom-social-base').fill('12000');
  await expect(page.locator('#custom-social-base')).toHaveValue('12000');
});

test('deleting the edited plan preserves current draft inputs', async ({ page }) => {
  await page.goto('/');
  await nameAndSave(page, '待删除');
  await section(page, '薪资参数');
  await page.locator('#monthly-salary').fill('30000');
  await section(page, '方案对比');
  await page.getByRole('button', { name: '编辑待删除', exact: true }).click();
  await page.locator('#monthly-salary').fill('25000');
  await section(page, '方案对比');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: '删除待删除', exact: true }).click();
  await section(page, '薪资参数');
  await expect(page.locator('#monthly-salary')).toHaveValue('25000');
  await expect(page.getByRole('button', { name: '保存为对比方案', exact: true })).toBeEnabled();
});

test('tabs synchronize saved plans without input changes overwriting them', async ({ page, context }) => {
  await page.goto('/');
  const other = await context.newPage();
  await other.goto('/');
  await nameAndSave(page, '标签页 A');
  await other.locator('#monthly-salary').fill('30000');
  await nameAndSave(other, '标签页 B');
  await expect(other.locator('.plan-card')).toHaveCount(2);
  await section(page, '方案对比');
  await expect(page.locator('.plan-card')).toHaveCount(2);
  await page.reload();
  await section(page, '方案对比');
  await expect(page.locator('.plan-card')).toHaveCount(2);
});

test('concurrent edits retain the draft rather than overwrite another tab', async ({ page, context }) => {
  await page.goto('/');
  await nameAndSave(page, '共享方案');
  const other = await context.newPage();
  await other.goto('/');
  await page.getByRole('button', { name: '编辑共享方案', exact: true }).click();
  await page.locator('#monthly-salary').fill('28000');
  await section(other, '方案对比');
  await other.getByRole('button', { name: '编辑共享方案', exact: true }).click();
  await other.locator('#monthly-salary').fill('29000');
  await other.getByRole('button', { name: '更新方案', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('当前参数已保留');
  await expect(page.locator('#monthly-salary')).toHaveValue('28000');
  await page.getByRole('button', { name: '保存为对比方案', exact: true }).click();
  await expect(page.locator('.plan-card')).toHaveCount(2);
  const salaries = await page.evaluate(() => JSON.parse(localStorage.getItem('salary-tool-plans')!).map((plan: { input: { monthlySalary: number } }) => plan.input.monthlySalary));
  expect(salaries.sort()).toEqual([28000, 29000]);
});

test('comparison shows recurring cash without another view switch', async ({ page }) => {
  await page.goto('/');
  await page.locator('#signing-bonus').fill('50000');
  await nameAndSave(page, '有签字费');
  await page.locator('#signing-bonus').fill('0');
  await nameAndSave(page, '无签字费');
  await expect(page.locator('.compare-table')).toBeVisible();
  const recurring = page.locator('.compare-table tr').filter({ hasText: '次年现金（无签字费）' });
  await expect(recurring.locator('td')).toHaveText(['186,720.00', '186,720.00']);
  await expect(page.getByRole('button', { name: '后续年度', exact: true })).toHaveCount(0);
  await noOverflow(page);
});

test('housing fund cap separates actual contributions from tax deductions', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '杭州', exact: true }).click();
  await page.locator('#monthly-salary').fill('10000');
  await page.locator('#hf-supplement').selectOption('0.09');
  await section(page, '测算结果');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥80,340.00');
  await page.getByText('为什么这个月扣了这些税？', { exact: true }).click();
  await expect(page.locator('.formula')).toContainText('43,800.00');
  await expect(page.locator('.formula')).toContainText('1,860.00');
  await expect(page.locator('.formula-grid')).toContainText('130,800.00');
  await page.getByText('缴费与扣税说明', { exact: true }).click();
  await expect(page.getByText(/个人公积金可扣除/)).toContainText('1,200.00');
  await noOverflow(page);
});

test('official source dates and unverified limits remain distinguishable', async ({ page }) => {
  await page.goto('/');
  await page.getByText('政策与隐私说明', { exact: true }).click();
  await expect(page.locator('#policy-notes')).toContainText('2026-07-01 至 2027-06-30');
  await expect(page.locator('#policy-notes')).toContainText('2027-12-31');
  await expect(page.locator('#policy-notes')).toContainText('当前适用性待核验');
  await expect(page.locator('#policy-notes a').first()).toHaveAttribute('href', /^https:\/\/shanghai\.chinatax\.gov\.cn\//);
  await noOverflow(page);
});

test('deduction helper and city base reset are usable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '按扣除项目辅助合计' }).click();
  await page.locator('#deduction-0').fill('1500');
  await page.locator('#deduction-1').fill('1000');
  await page.getByRole('button', { name: /应用合计/ }).click();
  await expect(page.locator('#special-deduction')).toHaveValue('2500');
  await page.locator('#custom-social-base').fill('1');
  await expect(page.locator('#base-help')).toContainText('7,546.00');
  await page.getByRole('button', { name: '杭州', exact: true }).click();
  await expect(page.locator('#hf-ratio')).toHaveValue('0.12');
  await expect(page.locator('#custom-social-base')).toHaveValue('');
  await expect(page.locator('#hf-supplement')).toHaveValue('0');
  await noOverflow(page);
});

test('export and import roundtrip, malformed files leave saved plans untouched', async ({ page }) => {
  await page.goto('/');
  await nameAndSave(page, '备份方案');
  const downloadEvent = page.waitForEvent('download');
  await page.getByText('导入 / 导出', { exact: true }).click();
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  const download = await downloadEvent;
  const path = await download.path();
  await page.locator('input[type=file]').setInputFiles(path!);
  await expect(page.locator('.plan-card')).toHaveCount(2);
  await page.locator('input[type=file]').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('status')).toContainText('不是有效的 JSON');
  await expect(page.locator('.plan-card')).toHaveCount(2);
});

test('legacy snapshot is migrated instead of rendering NaN', async ({ page }) => {
  const input: Record<string, unknown> = { ...DEFAULT_FORM };
  delete input.signingBonus; delete input.stockIncome; delete input.companyName;
  await page.addInitScript((legacy) => localStorage.setItem('salary-tool-plans', JSON.stringify([legacy])), {
    id: 'old-plan', name: '旧方案', companyName: '旧方案', cityName: '上海', summary: '旧摘要', netYear: 1, hfTotalYear: 1, taxYear: 1, input,
  });
  await page.goto('/');
  await section(page, '方案对比');
  await expect(page.locator('.plan-card')).toContainText('186,720.00');
  await expect(page.locator('body')).not.toContainText('NaN');
  await page.getByRole('button', { name: '编辑旧方案', exact: true }).click();
  await section(page, '测算结果');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥186,720.00');
});

test('damaged local storage and unknown cities recover safely', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('salary-tool-form', JSON.stringify({ cityId: '__proto__', monthlySalary: -100 }));
    localStorage.setItem('salary-tool-plans', '{');
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('部分本地数据无法读取');
  await section(page, '测算结果');
  await expect(page.getByTestId('annual-cash')).toHaveText('¥186,720.00');
});

test('desktop keeps inputs results and comparison side by side', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const input = await page.locator('#input').boundingBox();
  const results = await page.locator('#results').boundingBox();
  const compare = await page.locator('#compare').boundingBox();
  expect(input!.x).toBeLessThan(results!.x);
  expect(results!.x).toBeLessThan(compare!.x);
  expect(Math.abs(input!.y - results!.y)).toBeLessThan(2);
  expect(Math.abs(results!.y - compare!.y)).toBeLessThan(2);
  await expect(page.getByRole('button', { name: '保存当前方案', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: '保存当前方案', exact: true }).click();
  await expect(page.locator('.plan-card')).toHaveCount(1);
  await page.getByRole('button', { name: '保存当前方案', exact: true }).click();
  await expect(page.locator('.plan-card')).toHaveCount(2);
  expect(await page.locator('.compare-table').evaluate((table) => table.parentElement!.scrollWidth - table.parentElement!.clientWidth)).toBeLessThanOrEqual(1);
  await noOverflow(page);
});

test('layout remains contained across phone tablet and desktop breakpoints', async ({ page }) => {
  await page.goto('/');
  for (const width of [320, 768, 980, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await section(page, '薪资参数');
    await noOverflow(page);
    await section(page, '测算结果');
    await expect(page.getByTestId('annual-cash')).toBeVisible();
    await noOverflow(page);
  }
});

test('unavailable browser storage is reported and export still works', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage disabled', 'QuotaExceededError'); };
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('浏览器存储不可用');
  await nameAndSave(page, '临时方案');
  const downloadEvent = page.waitForEvent('download');
  await page.getByText('导入 / 导出', { exact: true }).click();
  await page.getByRole('button', { name: '导出备份', exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toMatch(/^salary-plans-.*\.json$/);
});

test('long names, large numbers and maximum plan count stay contained', async ({ page }) => {
  await page.goto('/');
  await page.locator('#monthly-salary').fill('1000000000');
  for (let index = 0; index < 5; index++) await nameAndSave(page, `${'长名称'.repeat(20)}${index}`);
  await expect(page.locator('.plan-card')).toHaveCount(5);
  await noOverflow(page);
  await section(page, '薪资参数');
  await expect(page.getByRole('button', { name: '保存为对比方案', exact: true })).toBeDisabled();
  await section(page, '测算结果');
  await expect(page.locator('#results').getByTestId('annual-cash')).toBeVisible();
  await noOverflow(page);
});
