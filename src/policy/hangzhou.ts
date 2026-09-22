import type { CityPolicy } from './types';

export const HANGZHOU_2026: CityPolicy = {
  id: 'hangzhou',
  name: '杭州',
  year: 2026,
  dataVersion: 'hangzhou-2026-07-reviewed-20260922',
  reviewedOn: '2026-09-22',
  coverage: '公积金采用杭州市区口径，非桐庐、淳安、建德的下限；社保 4986–25299 的 2026 适用依据及补充缴存资格待核验。按固定条件年化模拟，不还原历史工资单。',
  sources: [
    { title: '杭州公积金：2026 年度调整通知及官方附件', url: 'https://gjj.hangzhou.gov.cn/col/col1229468386/art/2026/art_09cee14331fb44f2967fca0b8ac2ce27.html', status: 'verified', period: '2026-07-01 至 2027-06-30；市区 2660–42151，比例 5%–12%；未规定普遍补充 0%–9%' },
    { title: '杭州市政府：基本医疗保障办法', url: 'https://zfgb.hangzhou.gov.cn/10/110220253/t114220253104/529703.shtml', status: 'verified', period: '自 2026-01-01 起；单位 9.5% 已含生育 0.6%，个人 2%' },
    { title: '浙江人社：2025 年社会保险有关基数（历史文件）', url: 'https://rlsbt.zj.gov.cn/art/2025/9/18/art_1229506773_2569490.html', status: 'unverified', period: '2025 年口径，不足以证明现有基数适用于 2026 年' },
  ],
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
