import type { CityPolicy } from './types';

export const SHANGHAI_2026: CityPolicy = {
  id: 'shanghai',
  name: '上海',
  year: 2026,
  dataVersion: 'shanghai-2026-07-reviewed-20260922',
  reviewedOn: '2026-09-22',
  coverage: '社保、公积金基数自 2026-07-01 起执行，不能回填为 1—6 月历史基数；失业费率的 2026 延续政策仍待核验。本工具按固定条件年化模拟。',
  sources: [
    { title: '上海人社：2026 年度社保缴费基数上下限', url: 'https://rsj.sh.gov.cn/tgsgg_17341/20260818/t0035_1443203.html', status: 'verified', period: '自 2026-07-01 起；原文未明确终止日' },
    { title: '上海公积金：2026 年度基数、比例及缴存额通知', url: 'https://www.shzfgjj.cn/html/newxxgk/zcwj/gfxwj/228478.html', status: 'verified', period: '自 2026-07-01 起；基本 5%–7%，参加补充制度后各 1%–5%' },
    { title: '上海医保：继续阶段性降低职工医保费率', url: 'https://ybj.sh.gov.cn/gfxwj/20260313/921e047144694b61b6df8ca0c5ef2cfc.html', status: 'verified', period: '2026-03-01 至 2027-02-28；单位合计 9%，个人 2%' },
    { title: '上海人社：养老缴费官方说明（历史口径）', url: 'https://rsj.sh.gov.cn/tmsztc_17502/20240416/t0035_1423583.html', status: 'unverified', period: '2024 年说明列个人 8%、单位 16%；未单独核验 2026 全年适用性' },
    { title: '上海人社：失业保险费率政策问答（历史口径）', url: 'https://rsj.sh.gov.cn/tzcjd_17352_17352/20250103/t0035_1429760.html', status: 'unverified', period: '原文执行至 2025-12-31；各 0.5% 的 2026 延续依据待核验' },
  ],
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
