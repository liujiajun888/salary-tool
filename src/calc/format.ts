// round2 按计算出的浮点值就近取到分；真实十进制半分（如 16.025）可能舍低，
// 需要精确四舍五入的调用方（社保）应使用整数基点运算。负数平局向 +∞ 取整。
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
