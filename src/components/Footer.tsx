export default function Footer() {
  return (
    <footer className="mx-auto max-w-6xl space-y-2 border-t border-white/[0.06] px-4 py-6 text-[11px] text-slate-500 xl:max-w-[1600px]">
      <p className="leading-relaxed">
        政策依据：
        <a className="text-accent-light hover:text-accent underline underline-offset-2 transition-colors" href="https://rsj.sh.gov.cn/tgsgg_17341/20260818/t0035_1443203.html" target="_blank" rel="noopener noreferrer">上海市人社局 2026 年度社保基数 7546–37731 元（2026-07 起）</a> ·
        <a className="text-accent-light hover:text-accent underline underline-offset-2 transition-colors" href="https://www.shui5.cn/article/31/193339.html" target="_blank" rel="noopener noreferrer">沪公积金管委会〔2026〕3 号</a> ·
        <a className="text-accent-light hover:text-accent underline underline-offset-2 transition-colors" href="https://www.huichenglawyer.com/pufaku/161.html" target="_blank" rel="noopener noreferrer">浙江省 2026 年度社保基数 4986–25299 元</a> ·
        <a className="text-accent-light hover:text-accent underline underline-offset-2 transition-colors" href="https://m.hz.bendibao.com/live/171954.shtm" target="_blank" rel="noopener noreferrer">杭州公积金基数 2660–42151 元</a>。
      </p>
      <p>按 2026 年政策估算，实际以单位申报为准，仅供参考。</p>
    </footer>
  );
}