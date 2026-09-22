import { useState } from 'react';
import { formatMoney, round2 } from '../calc/format';

const ITEMS = ['住房租金或贷款利息', '子女教育', '3 岁以下婴幼儿照护', '赡养老人', '继续教育', '其他已确认的按月扣除'];

export default function DeductionHelper({ onApply }: { onApply: (total: number) => void }) {
  const [amounts, setAmounts] = useState<string[]>(ITEMS.map(() => ''));
  const total = round2(amounts.reduce((sum, value) => sum + (Number(value) || 0), 0));
  return (
    <form id="deduction-helper" className="deduction-helper" onSubmit={(event) => { event.preventDefault(); onApply(total); }}>
      <p className="help">按已申报的个人每月份额填写，应用后覆盖原合计，不自动判断扣除资格。</p>
      {ITEMS.map((label, index) => <div className="field" key={label}>
        <label htmlFor={`deduction-${index}`}>{label}</label>
        <input id={`deduction-${index}`} className="form-control" type="text" inputMode="decimal" placeholder="0" value={amounts[index]} onChange={(event) => {
          const value = event.target.value;
          if (!/^\d*(\.\d{0,2})?$/.test(value) || Number(value) > 1_000_000_000) return;
          setAmounts((previous) => previous.map((amount, item) => item === index ? value : amount));
        }} />
      </div>)}
      <p className="help">租金与房贷利息请勿重复计算；大病医疗等年度汇算扣除不在此模型内。</p>
      <button className="button button-secondary full-width" type="submit" disabled={total > 1_000_000_000}>应用合计 ¥{formatMoney(total)} / 月</button>
    </form>
  );
}
