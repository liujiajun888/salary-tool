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
