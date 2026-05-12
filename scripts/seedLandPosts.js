/**
 * 踏取官方土地刊登批次匯入腳本
 *
 * 使用方式：
 *   node scripts/seedLandPosts.js
 *
 * 行為：
 *   1. 確保官方會員 touching_admin 存在（不存在則建立，密碼 bcrypt 加密）。
 *   2. 將 29 筆土地出售案件以 status=approved、visibility=platform_public 寫入 landposts 集合。
 *   3. 已存在的案件以 idempotencyKey 判斷，重複執行不會重複建立。
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../src/models/user.js");
const LandPost = require("../src/models/landPost.js");

const OFFICIAL_USERNAME = "touching_admin";
const OFFICIAL_PASSWORD = "Shit161@";
const OFFICIAL_NAME = "踏取官方";
const OFFICIAL_EMAIL = "touchingdevelopment.service@gmail.com";

const BASE = {
  type: "sell",
  contactName: "踏取藍先生",
  contactPhone: "",
  contactLine: "@447asmbe",
  visibility: "platform_public",
  status: "approved",
  agreedToTerms: true,
  landAreaUnit: "ping",
  images: [],
};

const POSTS = [
  {
    ref: "official-land-001",
    city: "台北市",
    district: "大安區",
    section: "",
    approximateLocation: "忠孝東路三段98號",
    landArea: 108,
    landCondition: "商三（建蔽65%/容積630%）；建物1332坪（15F+B2）；車位29個",
    description:
      "台北市核心地段，距捷運忠孝新生站步行4分鐘，1分鐘上建國高架，車行5分鐘上國道1號中山高，10分鐘抵台北車站、松山機場、信義計畫區。已有委託出售授權書。",
    priceBudget: "20億元(可議)",
  },
  {
    ref: "official-land-002",
    city: "桃園市",
    district: "大園區",
    section: "圳股段古亭小段",
    approximateLocation: "濱海路",
    landArea: 9638,
    landCondition:
      "基地9638坪（丁建9285坪+農牧246坪+交通111坪）；均價1坪25萬元",
    description:
      "桃園大園濱海路圳股段古亭小段，以丁建為主的大型土地，腹地廣闊。已有委售授權書。",
    priceBudget: "24億971萬元",
  },
  {
    ref: "official-land-003",
    city: "新北市",
    district: "樹林區",
    section: "大學段二小段",
    approximateLocation: "",
    landArea: undefined,
    landCondition:
      "住宅區（建蔽50%/容積210%）；預估容積獎勵35%；面臨20米學勤路、30米佳園路",
    description:
      "新北樹林大學段二小段住宅用地，雙面臨路且具容積獎勵潛力，適合大型開發。已有委售授權書。",
    priceBudget: "8億3600萬元",
  },
  {
    ref: "official-land-004",
    city: "新北市",
    district: "鶯歌區",
    section: "鳳鳴段",
    approximateLocation: "鳳鳴國中隔壁",
    landArea: 3075,
    landCondition:
      "住一（建50%/容200%）；三面臨路20米、12米、12米；面寬128米/43米、深度133米；適合商場、住宅、辦公",
    description:
      "鳳鳴國中隔壁三面臨路建地，距鳳鳴火車站400m、捷運站200m、大湳交流道600m。已有委售授權書。",
    priceBudget: "1坪70萬元",
  },
  {
    ref: "official-land-005",
    city: "桃園市",
    district: "中壢區",
    section: "廣青段",
    approximateLocation: "",
    landArea: 10627,
    landCondition:
      "零星工業區；面臨20米新生路三段；含廠房4483坪；鄰中壢/內壢交流道、A18高鐵站、A19棒球場站",
    description:
      "桃園中壢廣青段零星工業區土地+廠房整體出售，鄰高鐵與雙交流道，運輸機能極佳。已有專任委售授權書。",
    priceBudget: "42億5千萬元",
  },
  {
    ref: "official-land-006",
    city: "桃園市",
    district: "龍潭區",
    section: "龍源段",
    approximateLocation: "",
    landArea: 6106,
    landCondition:
      "丁工6106坪+鋼筋廠房1141坪；面臨20米路；距北二高高原交流道2.5公里",
    description:
      "桃園龍潭龍源段丁工土地附鋼筋廠房，鄰北二高高原交流道，可立即生產使用。已有委售授權書。",
    priceBudget: "13億元",
  },
  {
    ref: "official-land-007",
    city: "桃園市",
    district: "觀音區",
    section: "工業區段五小段",
    approximateLocation: "",
    landArea: 7429,
    landCondition:
      "丁建（建70%/容300%）；地上5F+地下1F共5871坪鋼骨挑高廠房；30米臨路；樓地板承重1噸/m²以上",
    description:
      "桃園觀音工業區段五小段大型鋼骨挑高廠房，1坪23萬8千元，產業條件優異。已有委售授權書。",
    priceBudget: "17億6810萬元",
  },
  {
    ref: "official-land-008",
    city: "台北市",
    district: "內湖區",
    section: "",
    approximateLocation: "舊宗路二段175號",
    landArea: 350,
    landCondition:
      "科技工業A區；建物1677坪（1層1戶共5戶，5F+B4 RC廠辦）；公設比41%；車位48平面坡道+裝卸1+機車27",
    description:
      "內湖科技工業A區RC廠辦大樓，整棟出售，適銀行、資訊、餐飲等用途。已有委售授權書。",
    priceBudget: "13億9800萬元",
  },
  {
    ref: "official-land-009",
    city: "苗栗縣",
    district: "三義鄉",
    section: "伯公段",
    approximateLocation: "裕隆旁三義工業園區",
    landArea: 35787,
    landCondition:
      "工業區（丁工）；建蔽70%/容積210%；不可分割出售；單價1坪5萬5千元",
    description:
      "苗栗三義裕隆旁三義工業園區大面積丁工用地，35,787坪整筆出售，適大型製造廠進駐。已有委售授權書。",
    priceBudget: "19億6830萬元",
  },
  {
    ref: "official-land-010",
    city: "苗栗縣",
    district: "竹南鎮",
    section: "大同段",
    approximateLocation: "",
    landArea: 746,
    landCondition: "住宅區；臨路路寬10米；1坪47萬元",
    description: "苗栗竹南大同段住宅區土地，方正易規劃。已有委託出售授權書。",
    priceBudget: "3億5千萬元",
  },
  {
    ref: "official-land-011",
    city: "苗栗縣",
    district: "後龍鎮",
    section: "維真段",
    approximateLocation: "中山路旁",
    landArea: 335,
    landCondition:
      "住宅區（建60%/容200%）；現況空地；鄰後龍市場、苗栗高中、維真國中、後龍國小、仁德醫護專校、海埔公園",
    description:
      "苗栗後龍維真段住宅用地，生活機能完整、文教醫療便利。已有委售授權書。",
    priceBudget: "1億1729萬元",
  },
  {
    ref: "official-land-012",
    city: "台北市",
    district: "內湖區",
    section: "",
    approximateLocation: "潭美街環河企業大樓",
    landArea: 242.86,
    landCondition:
      "樓層B3~9F/9F；登記1246.88坪；土地242.86坪；汽機車停車位；鄰捷運葫洲站、潭美國小、三民國中、南湖左岸河濱公園",
    description:
      "內湖潭美街環河企業大樓整棟出售，鄰捷運葫洲站。已有委售授權書。",
    priceBudget: "8億8千萬元",
  },
  {
    ref: "official-land-013",
    city: "新北市",
    district: "鶯歌區",
    section: "建國段一小段",
    approximateLocation: "",
    landArea: 2523.758,
    landCondition: "乙工（建60%/容210%），另有獎勵容積；面臨16米中山路",
    description:
      "新北鶯歌建國段乙工土地，鄰台鐵鶯歌站、捷運三鶯線、中山高架橋與建國國小，大湳交流道車程10分鐘。已有專委授權書。",
    priceBudget: "10億8千萬元(可議)",
  },
  {
    ref: "official-land-014",
    city: "桃園市",
    district: "大溪區",
    section: "中華段",
    approximateLocation: "信義路282號",
    landArea: 6689.96,
    landCondition:
      "主建物4991.1坪+附屬37.15坪；面臨16米路；距大溪交流道車程10分鐘；1坪22.87萬元",
    description:
      "大溪中華段大面積土地附建物，距大溪交流道10分鐘車程，發展潛力佳。已有專任委售授權書。",
    priceBudget: "15億3千萬元",
  },
  {
    ref: "official-land-015",
    city: "新北市",
    district: "新店區",
    section: "",
    approximateLocation: "華城三路11巷",
    landArea: 2331.22,
    landCondition:
      "住一1363坪(25萬/坪=3億4075萬)+保安保護地968坪(1萬/坪=968萬)；制高點視野佳；現況空地",
    description:
      "新店華城三路制高點視野空地，環境安全安靜，住一+保護地組合。已有委售授權書。",
    priceBudget: "3億5043萬元",
  },
  {
    ref: "official-land-016",
    city: "新北市",
    district: "深坑區",
    section: "烏月段",
    approximateLocation: "",
    landArea: 46694,
    landCondition: "山坡用地及一般農業區；臨路25公尺；可分割出售；1坪2.7萬元",
    description:
      "深坑烏月段大面積山坡用地與一般農業區，4萬6千餘坪，可分割出售。已有委售授權書。",
    priceBudget: "12億6073萬元",
  },
  {
    ref: "official-land-017",
    city: "新北市",
    district: "三芝區",
    section: "",
    approximateLocation: "四棧橋39號之1",
    landArea: 34000,
    landCondition:
      "農業區；鄰淡金公路；可分割出售；1坪2.5萬元；係屬祭祀公業土地",
    description:
      "三芝四棧橋大面積農業用地，鄰淡金公路，祭祀公業土地，買賣確定即開會簽約。",
    priceBudget: "8億5千萬元",
  },
  {
    ref: "official-land-018",
    city: "台北市",
    district: "士林區",
    section: "芝蘭段二小段",
    approximateLocation: "德行東路400號",
    landArea: 8098,
    landCondition: "保護區（可做低密度開發建築群）；面臨6米道路",
    description:
      "士林芝蘭段保護區土地，鄰天母SOGO、高島屋、新光三越、天母運動公園與棒球場、榮總/振興/陽明/新光醫院。已有委售授權書。",
    priceBudget: "10億元",
  },
  {
    ref: "official-land-019",
    city: "新北市",
    district: "鶯歌區",
    section: "永吉段",
    approximateLocation: "",
    landArea: 3302.02,
    landCondition:
      "乙工&道路用地（建60%/容140%）；面臨20米鶯桃路、6米永吉街；底價1坪35萬元",
    description:
      "鶯歌永吉段乙工&道路用地，雙面臨路，開發彈性高。已有委售授權書。",
    priceBudget: "11億5570萬元",
  },
  {
    ref: "official-land-020",
    city: "新北市",
    district: "淡水區",
    section: "淡海段",
    approximateLocation: "輕軌崁頂站旁",
    landArea: 4096,
    landCondition:
      "商業區（容積率500%）；四面臨路；採銀行信託履約保證買賣方式交易",
    description: "淡水淡海段商業區土地，輕軌崁頂站旁四面臨路，發展性高。",
    priceBudget: "85萬元/坪 x 4,096坪",
  },
  {
    ref: "official-land-021",
    city: "新北市",
    district: "淡水區",
    section: "樹梅段",
    approximateLocation: "中央北路4段楓丹白露社區附近",
    landArea: 2456,
    landCondition: "山坡保育地、農牧用地；面對觀音山、淡水河美景；1坪4.8萬元",
    description:
      "淡水樹梅段山坡保育農牧用地，面對觀音山與淡水河景觀。已有委託售地授權書。",
    priceBudget: "1億1788萬元",
  },
  {
    ref: "official-land-022",
    city: "桃園市",
    district: "中壢區",
    section: "青山段",
    approximateLocation: "青埔、桃園高鐵站旁",
    landArea: 106.4,
    landCondition:
      "住宅區（建50%/容200%）；面臨10米道路；面寬8米、深度42米；鄰桃園高鐵站、國泰站前廣場",
    description:
      "桃園青埔高鐵站旁住宅用地，地段稀有、增值潛力佳。已有委售授權書。",
    priceBudget: "9150萬元",
  },
  {
    ref: "official-land-023",
    city: "桃園市",
    district: "觀音區",
    section: "大觀段",
    approximateLocation: "",
    landArea: 774,
    landCondition: "住二（建40%/容120%）；1坪27萬元",
    description: "桃園觀音大觀段住二用地。已有委託售地授權書。",
    priceBudget: "2億898萬元",
  },
  {
    ref: "official-land-024",
    city: "新北市",
    district: "金山區",
    section: "下中股段南勢湖小段",
    approximateLocation: "",
    landArea: 23406,
    landCondition:
      "丁建（建70%/容300%）；路寬25米；距交流道車程15分鐘；1坪7.5萬元",
    description:
      "金山下中股段南勢湖小段大面積丁建土地，25米路寬，距交流道車程15分鐘。已有委售授權書。",
    priceBudget: "17億5545萬元",
  },
  {
    ref: "official-land-025",
    city: "桃園市",
    district: "大園區",
    section: "横山段尖山小段/湳子小段",
    approximateLocation: "大園國小、麥當勞附近",
    landArea: 7005.9,
    landCondition:
      "乙工（建60%/容240%）；現況空地；可分割出售，分割後1坪35萬元（臨25米路面優先選購）",
    description:
      "大園橫山段乙工土地7005坪，鄰大園國小與麥當勞，可分割出售。已有委託售地授權書。",
    priceBudget: "23億1195萬元",
  },
  {
    ref: "official-land-026",
    city: "桃園市",
    district: "八德區",
    section: "大竹段",
    approximateLocation: "",
    landArea: 2553.48,
    landCondition:
      "一般農業區、農牧用地；地上物鋼構廠房+RC建物（月租40萬元）；1坪13萬元",
    description:
      "八德大竹段農牧用地附鋼構/RC廠房，月租收益40萬元，現金流穩定。已有委售授權書。",
    priceBudget: "3億3195萬元",
  },
  {
    ref: "official-land-027",
    city: "桃園市",
    district: "大溪區",
    section: "瑞興段",
    approximateLocation: "",
    landArea: 539.02,
    landCondition: "特定農業區、農牧用地；1坪7.5萬元",
    description: "大溪瑞興段特定農業區農牧用地。已有委售授權書。",
    priceBudget: "4047萬元",
  },
  {
    ref: "official-land-028",
    city: "桃園市",
    district: "觀音區",
    section: "下埔頂段",
    approximateLocation: "觀音國中附近",
    landArea: 18317.53,
    landCondition:
      "丁工17896.67坪（建60%/容300%）+乙工420.86坪（建70%/容210%）；現況舊廠房；15米臨路；不可分割出售",
    description:
      "觀音下埔頂段大型丁工為主土地（含部分乙工）附舊廠房，鄰觀音國中。已有委託出售授權書。",
    priceBudget: "16億6350萬元",
  },
  {
    ref: "official-land-029",
    city: "桃園市",
    district: "大溪區",
    section: "瑞源段",
    approximateLocation: "",
    landArea: 5755.54,
    landCondition:
      "丁建4658.71坪（1坪22.8萬元）+農地1096.83坪（1坪10萬元）；20米臨路",
    description: "大溪瑞源段丁建與農地組合出售，20米臨路。已有委託售地授權書。",
    priceBudget: "11億7187萬元",
  },
  {
    ref: "official-land-030",
    city: "嘉義縣",
    district: "民雄鄉",
    section: "崙子頂段",
    approximateLocation: "",
    landArea: 2381,
    landCondition:
      "甲建（建60%/容240%）；建物527坪；路寬22米；土地方正雙面臨路；鄰中山高、二高、台1線省道",
    description:
      "嘉義民雄崙子頂段甲建用地，雙面臨路土地方正，1坪6.8萬元。已有委託出售授權書。",
    priceBudget: "1億6193萬元",
  },
  {
    ref: "official-land-031",
    city: "台南市",
    district: "柳營區",
    section: "外環段",
    approximateLocation: "",
    landArea: 18352,
    landCondition:
      "丁建（丁工）；建物6173坪閒置中可配合拆除；距高速公路柳營交流道車行10分鐘",
    description:
      "台南柳營外環段大面積丁建土地，適物流、倉儲、科技、大型工廠進駐。已有委售授權書。",
    priceBudget: "27億5288萬元",
  },
  {
    ref: "official-land-032",
    city: "台南市",
    district: "安南區",
    section: "國安段",
    approximateLocation: "九份子角窗、緊鄰台17線",
    landArea: 593.62,
    landCondition:
      "住六-1（建50%/容250%）；臨路20米；地形方正；鄰海佃、國安雙商圈、全聯、7-11",
    description:
      "安南國安段住六-1九份子角窗用地，地形方正，1坪65萬元。已有委售授權書。",
    priceBudget: "3億8586萬元",
  },
  {
    ref: "official-land-033",
    city: "台南市",
    district: "永康區",
    section: "蔦松北段",
    approximateLocation: "縱貫公路旁",
    landArea: 3229,
    landCondition:
      "甲工（建70%/容210%）；可申請立體化獎勵；114年8月拆遷現有地上物；含綠地；1坪約27萬8千元",
    description:
      "永康蔦松北段大面積甲工方正土地，鄰永康車站、產業園區、科技工業區、應用科大。已有委售授權書。",
    priceBudget: "9億元(甲工+綠地)",
  },
  {
    ref: "official-land-034",
    city: "台南市",
    district: "東區",
    section: "裕東段",
    approximateLocation: "",
    landArea: 393.13,
    landCondition: "住二（建50%/容160%）；臨路20米；1坪87.99萬元",
    description:
      "台南東區裕東段住二用地，鄰台南紡織、圓環、平實公園、仁德及大灣交流道。已有委售授權書。",
    priceBudget: "3億4595萬元",
  },
  {
    ref: "official-land-035",
    city: "台南市",
    district: "北區",
    section: "小北段",
    approximateLocation: "",
    landArea: 234.098,
    landCondition: "住四（建60%/容180%）；臨路30米；1坪89.99萬元",
    description:
      "台南北區小北段住四用地，鄰花園夜市、好市多、小北夜市、大潤發、民德國中、文賢國中、立人國小。已有委售授權書。",
    priceBudget: "2億1065萬元",
  },
  {
    ref: "official-land-036",
    city: "台南市",
    district: "龍崎區",
    section: "龍船段",
    approximateLocation: "歸仁分局龍船派出所旁",
    landArea: 29634,
    landCondition:
      "丁工（建70%/容300%）；臨路20公尺；現況雜草；另贈農地4萬932坪（免費加送）；採銀行信託履約保證交易",
    description:
      "龍崎龍船段丁工土地2萬9千餘坪，另免費加送農地4萬932坪。需開購買意向書與斡旋支票後進入正式法定不動產交易程序。",
    priceBudget: "13億3353萬元",
  },
  {
    ref: "official-land-037",
    city: "台南市",
    district: "歸仁區",
    section: "武東段",
    approximateLocation: "台南高鐵特區",
    landArea: 2695.65,
    landCondition:
      "住宅區（建50%/容200%）；面寬約58.8米、深約149.8米；1坪60萬元",
    description:
      "台南高鐵特區歸仁武東段住宅用地2695坪，方正土地、開發條件優異。已有委託售地授權書。",
    priceBudget: "16億1739萬元",
  },
  {
    ref: "official-land-038",
    city: "台南市",
    district: "安南區",
    section: "",
    approximateLocation: "科技工業區",
    landArea: 5457.15,
    landCondition:
      "工業區生產事業用地（建60%/容210%）；臨20米路；有廠房；1坪17萬元",
    description:
      "台南安南區科技工業區生產事業用地附廠房，臨20米路。已有委託出售授權書。",
    priceBudget: "9億2772萬元",
  },
  {
    ref: "official-land-039",
    city: "台南市",
    district: "學甲區",
    section: "學甲段",
    approximateLocation: "",
    landArea: 18530.545,
    landCondition:
      "工業區（建70%/容300%）；臨路15米；現況空地；1坪7萬元；可分割9千坪出售（每坪加價2萬元）",
    description:
      "台南學甲段大面積工業區空地18530坪，可分割9千坪出售。已有委託售地授權書。",
    priceBudget: "12億9714萬元",
  },
  {
    ref: "official-land-040",
    city: "台南市",
    district: "安南區",
    section: "",
    approximateLocation: "科技三路",
    landArea: 4321.84,
    landCondition:
      "乙種工業用地（工15相）（建50%/容300%）；建坪8640.24坪；地上4F+地下1F廠辦；臨路30米、20米；容積未用完可擴建",
    description:
      "台南安南科技三路乙工廠辦，土地4321坪、建坪8640坪，容積未用完可擴建。需開購買意向書與委售授權書互看認可後進入正式交易。",
    priceBudget: "12億元",
  },
  {
    ref: "official-land-041",
    city: "台中市",
    district: "西屯區",
    section: "何厝段",
    approximateLocation: "捷運市政府站M7旁、台灣大道/文心路口",
    landArea: 341.83,
    landCondition:
      "商業用地（商四，建60%/容500%）；七期重劃區；金錢豹KTV酒店對面；鄰台中歌劇院與百貨；1坪281萬元",
    description:
      "台中七期重劃區商四用地，捷運市政府站M7旁、台灣大道與文心路口，地段稀有。已有委託售地授權書。",
    priceBudget: "9億6千萬元",
  },
  {
    ref: "official-land-042",
    city: "台中市",
    district: "西區",
    section: "",
    approximateLocation: "五期重劃區、東興路三段",
    landArea: 211.15,
    landCondition: "住二（建50%/容220%）；面寬16米；臨路20米",
    description:
      "台中五期重劃區東興路三段住二用地，方正易規劃。已有委售授權書。",
    priceBudget: "2億7852萬元",
  },
  {
    ref: "official-land-043",
    city: "屏東縣",
    district: "東港鎮",
    section: "船頭段",
    approximateLocation: "鄰東港華僑市場",
    landArea: 56022.21,
    landCondition:
      "乙工（建60%/容300%）；現況空地；臨30米路貨櫃車進出順暢；距東港港口車程5分鐘；距高雄49公里、行國3+台88線車程約46分鐘",
    description:
      "屏東東港船頭段乙工空地近17甲，臨30米路、便利進出口作業，物美價廉。已有土地所有權人委託售地授權書。",
    priceBudget: "46億4984萬元",
  },
  {
    ref: "official-land-044",
    city: "台南市",
    district: "新營區",
    section: "茄苳脚段",
    approximateLocation: "中山高國道1新營交流道旁",
    landArea: 1543.6,
    landNumbers: ["1037", "1049"],
    landCondition:
      "住宅用地；1037地號947.7坪(20萬/坪=1.8954億)+1049地號595.9坪(28萬/坪=1.6685億)",
    description:
      "新營茄苳脚段住宅用地，中山高新營交流道旁，1037、1049兩地號合售。已有委託售地授權書。",
    priceBudget: "3億5639萬元",
  },
];

async function ensureOfficialMember() {
  let member = await User.findOne({ username: OFFICIAL_USERNAME });
  if (member) {
    console.log(
      `[member] 已存在 username=${OFFICIAL_USERNAME}, _id=${member._id}`,
    );
    return member;
  }

  const hashed = await bcrypt.hash(OFFICIAL_PASSWORD, 15);
  member = await User.create({
    username: OFFICIAL_USERNAME,
    password: hashed,
    name: OFFICIAL_NAME,
    email: OFFICIAL_EMAIL,
    level: 0,
    subscribe: false,
    created_at: new Date(),
  });
  console.log(`[member] 建立官方會員成功 _id=${member._id}`);
  return member;
}

async function seedPosts(userId) {
  let created = 0;
  let skipped = 0;

  for (const post of POSTS) {
    const idempotencyKey = post.ref;
    const existing = await LandPost.findOne({ idempotencyKey });
    if (existing) {
      console.log(`[skip] ${idempotencyKey} 已存在 _id=${existing._id}`);
      skipped++;
      continue;
    }

    const doc = {
      ...BASE,
      userId,
      city: post.city,
      district: post.district,
      section: post.section || undefined,
      approximateLocation: post.approximateLocation || undefined,
      landArea: post.landArea,
      landNumbers: post.landNumbers,
      landCondition: post.landCondition,
      description: post.description,
      priceBudget: post.priceBudget,
      idempotencyKey,
      version: 1,
    };

    const result = await LandPost.create(doc);
    console.log(
      `[create] ${idempotencyKey} -> _id=${result._id} (${post.city}${post.district})`,
    );
    created++;
  }

  return { created, skipped };
}

async function main() {
  if (!process.env.MONGOOSE_CONNTECTION_STRING) {
    console.error("缺少 MONGOOSE_CONNTECTION_STRING 環境變數");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGOOSE_CONNTECTION_STRING, {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log("DB connected");

  try {
    const member = await ensureOfficialMember();
    const { created, skipped } = await seedPosts(member._id);
    console.log(
      `\n完成：新增 ${created} 筆、略過 ${skipped} 筆，共 ${POSTS.length} 筆來源資料`,
    );
  } catch (err) {
    console.error("執行錯誤：", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("DB disconnected");
  }
}

main();
