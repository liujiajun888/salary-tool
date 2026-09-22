import type { CityId, CityPolicy } from './types';
import { SHANGHAI_2026 } from './shanghai';
import { HANGZHOU_2026 } from './hangzhou';

export const CITIES: Record<CityId, CityPolicy> = {
  shanghai: SHANGHAI_2026,
  hangzhou: HANGZHOU_2026,
};

export const CITY_LIST: CityPolicy[] = Object.values(CITIES);

export const TAX_SOURCES = [
  {
    title: '全年一次性奖金政策（2023 年第 30 号）',
    url: 'https://shanghai.chinatax.gov.cn/zcfw/zcfgk/grsds/202308/t468460.html',
    scope: '执行至 2027-12-31；居民个人符合条件的全年一次性奖金，可选择单独计税或并入综合所得。',
  },
  {
    title: '上海税务：全年一次性奖金政策问答',
    url: 'https://shanghai.chinatax.gov.cn/zcfw/rdwd/202501/t474844.html',
    scope: '每个纳税人每个纳税年度，全年一次性奖金单独计税办法只能使用一次，并非每家单位各一次。',
  },
  {
    title: '上市公司股权激励政策（2023 年第 25 号）',
    url: 'https://shanghai.chinatax.gov.cn/zcfw/zcfgk/grsds/202308/t468395.html',
    scope: '执行至 2027-12-31；仅限居民个人符合所引政策条件的激励收入，同年多次取得须合并计税，不是所有股票收入。',
  },
  {
    title: '公积金等个人所得税政策（财税〔2006〕10 号）',
    url: 'https://guangdong.chinatax.gov.cn/gdsw/zjfg/2011-02/23/content_7b91565005274888b073c854a6f7c910.shtml',
    scope: '单位与个人分别在规定基数 12% 以内按实际缴存额扣除；基数不超过当地规定的上年度职工月平均工资 3 倍，超限部分并入当期工资薪金。原文未列终止日。',
  },
  {
    title: '上海税务：补充住房公积金答复',
    url: 'https://shanghai.chinatax.gov.cn/bsfw/nszx/hdfk/201908/t446765.html',
    scope: '补充与基本公积金共享税前扣除限制，不因允许补充缴存而另获一套免税额度。',
  },
];

export type { CityId, CityPolicy } from './types';
