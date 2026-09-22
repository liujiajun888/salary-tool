import { CITY_LIST, TAX_SOURCES } from '../policy';
import { formatMoney } from '../calc/format';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content"><p>本地计算 · 无账号 · 薪资和方案不上传服务器</p><p>仅供薪酬估算与比较，不替代工资单或纳税申报</p></div>
      <details className="disclosure" id="policy-notes">
        <summary>数据来源、核验状态与适用范围</summary>
        <p className="help">资料核验日期：2026-09-22。模型按当前配置做年化模拟，不还原 2026 年各月份的实际政策；“已核验”仅指下方列明的范围，不能推定全部费率全年适用。</p>
        <h3 className="section-label">全国个税规则 · 已核验官方原文</h3>
        <ul className="policy-list">{TAX_SOURCES.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a><p className="help">{source.scope}</p></li>)}</ul>
        <h3 className="section-label">城市基数与费率 · 按条目列示状态</h3>
        <ul className="policy-list">{CITY_LIST.map((policy) => <li key={policy.id}>
          <h3>{policy.name} <span className="pill">部分参数待核验</span></h3>
          <p>社保基数 ¥{formatMoney(policy.social.minBase)}–{formatMoney(policy.social.maxBase)}；公积金基数 ¥{formatMoney(policy.housingFund.minBase)}–{formatMoney(policy.housingFund.maxBase)}</p>
          <p className="help">{policy.coverage}<br />资料审阅日期 {policy.reviewedOn} · 数据版本 {policy.dataVersion}</p>
          <ul className="policy-list">{policy.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> · {source.status === 'verified' ? '已核验所列范围' : '当前适用性待核验'}<br />{source.period}</li>)}</ul>
        </li>)}</ul>
        <div className="notice field-spaced">公积金按个人与单位相同比例、缴费基数与扣税基数相同估算，基本与补充合计超过 12% 的部分纳入计税；实际允许扣除的基数和缴存资格仍须确认。杭州补充比例选项仅用于模拟单位自定义方案，不代表普遍适用政策。</div>
      </details>
      <details className="disclosure"><summary>隐私、保存与备份</summary><p className="help">金额与方案保存在此设备的浏览器 localStorage 中；清理站点数据、使用无痕模式或浏览器限制存储可能导致数据丢失。可通过方案区导出 JSON 备份，导入只在本地解析。</p><p className="help">页面不加载第三方字体或统计脚本；主动打开政策链接会访问外部网站，但不会附带你的薪资参数。不要在共享设备保留敏感薪资，导出文件也需妥善保管。</p></details>
    </footer>
  );
}
