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
