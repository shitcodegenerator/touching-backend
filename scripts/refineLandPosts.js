/**
 * 重整既有 44 筆官方土地刊登的欄位分布
 *
 * 規則：
 *   - landCondition (現況): 只放使用分區 / 建蔽率 / 容積率 / 用地類別
 *   - priceBudget (預算)  : 總價（單價），如無總價則保留原表示
 *   - description (說明)  : 路寬、面寬、深度、地段優勢、鄰近設施、授權書資訊、特別約定
 *
 * 使用方式：
 *   node scripts/refineLandPosts.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const LandPost = require("../src/models/landPost.js");

const UPDATES = [
  {
    ref: "official-land-001",
    landCondition: "商三（建蔽65%/容積630%）",
    priceBudget: "20億元(可議)",
    description:
      "建物1332坪(15F+B2)、車位29個。台北市核心地段，距捷運忠孝新生站步行4分鐘，1分鐘上建國高架，車行5分鐘上國道1號，10分鐘抵台北車站、松山機場、信義計畫區。已有委託出售授權書。",
  },
  {
    ref: "official-land-002",
    landCondition: "丁建為主（含農牧、交通用地）",
    priceBudget: "24億971萬元(1坪25萬)",
    description:
      "基地9638坪（丁建9285坪+農牧246坪+交通111坪），桃園大園濱海路圳股段古亭小段大型土地。已有委售授權書。",
  },
  {
    ref: "official-land-003",
    landCondition: "住宅區（建50%/容210%）",
    priceBudget: "8億3600萬元",
    description:
      "預估容積獎勵35%，面臨20米學勤路與30米佳園路雙面臨路，新北樹林大學段二小段，開發潛力佳。已有委售授權書。",
  },
  {
    ref: "official-land-004",
    landCondition: "住一（建50%/容200%）",
    priceBudget: "1坪70萬元",
    description:
      "面積3075坪，三面臨路20米、12米、12米，面寬128米/43米、深度133米。鳳鳴國中隔壁，距鳳鳴火車站400m、捷運站200m、大湳交流道600m，適合商場、住宅、辦公。已有委售授權書。",
  },
  {
    ref: "official-land-005",
    landCondition: "零星工業區",
    priceBudget: "42億5千萬元",
    description:
      "土地10,627坪含廠房4483坪，面臨20米新生路三段。鄰中壢/內壢交流道、A18桃園高鐵站、A19桃園棒球場站。已有專任委售授權書。",
  },
  {
    ref: "official-land-006",
    landCondition: "丁工",
    priceBudget: "13億元",
    description:
      "丁工6106坪+鋼筋廠房1141坪，面臨20米路，距北二高高原交流道2.5公里。已有委售授權書。",
  },
  {
    ref: "official-land-007",
    landCondition: "丁建（建70%/容300%）",
    priceBudget: "17億6810萬元(1坪23.8萬)",
    description:
      "土地7429坪，地上5F+地下1F共5871坪鋼骨挑高廠房，30米臨路，樓地板承重1噸/m²以上。已有委售授權書。",
  },
  {
    ref: "official-land-008",
    landCondition: "科技工業A區",
    priceBudget: "13億9800萬元",
    description:
      "土地350坪、建物1677坪（1層1戶共5戶，5F+B4 RC廠辦），公設比41%，車位48平面坡道+裝卸1+機車27。內湖舊宗路二段175號，適銀行、資訊、餐飲等用途。已有委售授權書。",
  },
  {
    ref: "official-land-009",
    landCondition: "工業區（丁工，建70%/容210%）",
    priceBudget: "19億6830萬元(1坪5.5萬)",
    description:
      "35,787坪不可分割整筆出售，裕隆旁三義工業園區，適大型製造廠進駐。已有委售授權書。",
  },
  {
    ref: "official-land-010",
    landCondition: "住宅區",
    priceBudget: "3億5千萬元(1坪47萬)",
    description: "746坪住宅用地，臨路路寬10米。已有委託出售授權書。",
  },
  {
    ref: "official-land-011",
    landCondition: "住宅區（建60%/容200%）",
    priceBudget: "1億1729萬元",
    description:
      "335坪空地，座落中山路旁。鄰後龍市場、苗栗高中、維真國中、後龍國小、仁德醫護專校、海埔公園。已有委售授權書。",
  },
  {
    ref: "official-land-012",
    landCondition: "廠辦大樓（B3~9F/9F）",
    priceBudget: "8億8千萬元",
    description:
      "登記1246.88坪、土地242.86坪，含汽機車停車位。內湖潭美街環河企業大樓，鄰捷運葫洲站、潭美國小、三民國中、南湖左岸河濱公園。已有委售授權書。",
  },
  {
    ref: "official-land-013",
    landCondition: "乙工（建60%/容210%）",
    priceBudget: "10億8千萬元(1坪43萬)",
    description:
      "土地2523.758坪，另有獎勵容積，面臨16米中山路。鄰台鐵鶯歌站、捷運三鶯線、中山高架橋與建國國小，大湳交流道車程10分鐘。售價可議。已有專委授權書。",
  },
  {
    ref: "official-land-014",
    landCondition: "土地附建物",
    priceBudget: "15億3千萬元(1坪22.87萬)",
    description:
      "土地6689.96坪，主建物4991.1坪+附屬37.15坪，面臨16米路，距大溪交流道車程10分鐘。已有專任委售授權書。",
  },
  {
    ref: "official-land-015",
    landCondition: "住一+保安保護地",
    priceBudget: "3億5043萬元",
    description:
      "住一1363坪(1坪25萬=3億4075萬)+保安保護地968坪(1坪1萬=968萬)，制高點視野佳、現況空地。新店華城三路11巷，環境安全安靜。已有委售授權書。",
  },
  {
    ref: "official-land-016",
    landCondition: "山坡用地+一般農業區",
    priceBudget: "12億6073萬元(1坪2.7萬)",
    description:
      "4萬6千餘坪，臨路25公尺，可分割出售。深坑烏月段大面積土地。已有委售授權書。",
  },
  {
    ref: "official-land-017",
    landCondition: "農業區",
    priceBudget: "8億5千萬元(1坪2.5萬)",
    description:
      "3萬4千坪，鄰淡金公路，可分割出售。係屬祭祀公業土地，買賣確定即開會簽約。",
  },
  {
    ref: "official-land-018",
    landCondition: "保護區（可低密度開發建築群）",
    priceBudget: "10億元",
    description:
      "8098坪，面臨6米道路，鄰天母SOGO、高島屋、新光三越、天母運動公園、棒球場、榮總/振興/陽明/新光醫院。德行東路400號。已有委售授權書。",
  },
  {
    ref: "official-land-019",
    landCondition: "乙工+道路用地（建60%/容140%）",
    priceBudget: "11億5570萬元(1坪35萬)",
    description:
      "土地3302.02坪，面臨20米鶯桃路、6米永吉街雙面臨路，開發彈性高。已有委售授權書。",
  },
  {
    ref: "official-land-020",
    landCondition: "商業區（容積率500%）",
    priceBudget: "1坪85萬x4096坪",
    description:
      "4096坪商業用地，輕軌崁頂站旁四面臨路。採銀行信託履約保證買賣方式交易。",
  },
  {
    ref: "official-land-021",
    landCondition: "山坡保育地（農牧用地）",
    priceBudget: "1億1788萬元(1坪4.8萬)",
    description:
      "2456坪，中央北路4段楓丹白露社區附近，面對觀音山、淡水河美景。已有委託售地授權書。",
  },
  {
    ref: "official-land-022",
    landCondition: "住宅區（建50%/容200%）",
    priceBudget: "9150萬元(1坪86萬)",
    description:
      "106.4坪，面寬8米、深度42米，面臨10米道路。桃園青埔、鄰桃園高鐵站、國泰站前廣場。已有委售授權書。",
  },
  {
    ref: "official-land-023",
    landCondition: "住二（建40%/容120%）",
    priceBudget: "2億898萬元(1坪27萬)",
    description: "774坪住二用地，桃園觀音大觀段。已有委託售地授權書。",
  },
  {
    ref: "official-land-024",
    landCondition: "丁建（建70%/容300%）",
    priceBudget: "17億5545萬元(1坪7.5萬)",
    description:
      "23,406坪大面積丁建土地，路寬25米，距交流道車程15分鐘。新北金山下中股段南勢湖小段。已有委售授權書。",
  },
  {
    ref: "official-land-025",
    landCondition: "乙工（建60%/容240%）",
    priceBudget: "23億1195萬元(1坪33萬)",
    description:
      "7005.9坪空地，可分割出售，分割後1坪35萬元（臨25米路面優先選購）。鄰大園國小與麥當勞。已有委託售地授權書。",
  },
  {
    ref: "official-land-026",
    landCondition: "一般農業區（農牧用地）",
    priceBudget: "3億3195萬元(1坪13萬)",
    description:
      "2553.48坪，地上物含鋼構廠房+RC建物，月租收益40萬元、現金流穩定。已有委售授權書。",
  },
  {
    ref: "official-land-027",
    landCondition: "特定農業區（農牧用地）",
    priceBudget: "4047萬元(1坪7.5萬)",
    description: "539.02坪農牧用地，桃園大溪瑞興段。已有委售授權書。",
  },
  {
    ref: "official-land-028",
    landCondition: "丁工+乙工（不可分割）",
    priceBudget: "16億6350萬元(1坪20萬)",
    description:
      "丁工17896.67坪(建60%/容300%)+乙工420.86坪(建70%/容210%)，現況舊廠房，15米臨路，鄰觀音國中。已有委託出售授權書。",
  },
  {
    ref: "official-land-029",
    landCondition: "丁建+農地",
    priceBudget: "11億7187萬元",
    description:
      "丁建4658.71坪(1坪22.8萬=10億6219萬)+農地1096.83坪(1坪10萬=1億968萬)，20米臨路。大溪瑞源段。已有委託售地授權書。",
  },
  {
    ref: "official-land-030",
    landCondition: "甲建（建60%/容240%）",
    priceBudget: "1億6193萬元(1坪6.8萬)",
    description:
      "土地2381坪、建物527坪，路寬22米，土地方正雙面臨路。鄰中山高、二高、台1線省道。已有委託出售授權書。",
  },
  {
    ref: "official-land-031",
    landCondition: "丁建（丁工）",
    priceBudget: "27億5288萬元",
    description:
      "土地1萬8352坪、建物6173坪閒置中可配合拆除。距高速公路柳營交流道車行10分鐘，適物流、倉儲、科技、大型工廠進駐。已有委售授權書。",
  },
  {
    ref: "official-land-032",
    landCondition: "住六-1（建50%/容250%）",
    priceBudget: "3億8586萬元(1坪65萬)",
    description:
      "593.62坪九份子角窗用地，地形方正，臨路20米，緊鄰台17線。鄰海佃、國安雙商圈、全聯、7-11。已有委售授權書。",
  },
  {
    ref: "official-land-033",
    landCondition: "甲工（建70%/容210%）",
    priceBudget: "9億(含綠地,1坪27.8萬)",
    description:
      "甲工3229坪，可申請立體化獎勵，民國114年8月拆遷現有地上物。縱貫公路旁，鄰永康車站、產業園區、科技工業區、應科大。已有委售授權書。",
  },
  {
    ref: "official-land-034",
    landCondition: "住二（建50%/容160%）",
    priceBudget: "3億4595萬元(1坪87.99萬)",
    description:
      "393.13坪住二用地，臨路20米。鄰台南紡織、圓環、平實公園、仁德及大灣交流道。已有委售授權書。",
  },
  {
    ref: "official-land-035",
    landCondition: "住四（建60%/容180%）",
    priceBudget: "2億1065萬元(1坪89.99萬)",
    description:
      "234.098坪住四用地，臨路30米。鄰花園夜市、好市多、小北夜市、大潤發、民德國中、文賢國中、立人國小。已有委售授權書。",
  },
  {
    ref: "official-land-036",
    landCondition: "丁工（建70%/容300%）",
    priceBudget: "13億3353萬元(1坪4.5萬)",
    description:
      "丁工2萬9634坪，臨路20公尺，現況雜草。另免費加送農地4萬932坪。歸仁分局龍船派出所旁。需開購買意向書與斡旋支票後進入正式法定不動產交易程序。",
  },
  {
    ref: "official-land-037",
    landCondition: "住宅區（建50%/容200%）",
    priceBudget: "16億1739萬元(1坪60萬)",
    description:
      "面寬約58.8米、深約149.8米，台南高鐵特區歸仁武東段住宅用地2695坪，方正土地、開發條件優異。已有委託售地授權書。",
  },
  {
    ref: "official-land-038",
    landCondition: "工業區生產事業用地（建60%/容210%）",
    priceBudget: "9億2772萬元(1坪17萬)",
    description:
      "5457.15坪，臨20米路，有廠房。台南安南區科技工業區。已有委託出售授權書。",
  },
  {
    ref: "official-land-039",
    landCondition: "工業區（建70%/容300%）",
    priceBudget: "12億9714萬元(1坪7萬)",
    description:
      "18,530.545坪空地，臨路15米，可分割9千坪出售（每坪加價2萬元）。台南學甲段。已有委託售地授權書。",
  },
  {
    ref: "official-land-040",
    landCondition: "乙種工業用地（工15相，建50%/容300%）",
    priceBudget: "12億元",
    description:
      "土地4321.84坪、建坪8640.24坪，地上4F+地下1F廠辦，臨路30米、20米，容積未用完可擴建。台南安南科技三路。需開購買意向書與委售授權書互看認可後進入正式交易。",
  },
  {
    ref: "official-land-041",
    landCondition: "商業用地（商四，建60%/容500%）",
    priceBudget: "9億6千萬元(1坪281萬)",
    description:
      "341.83坪七期重劃區商四用地，捷運市政府站M7旁、台灣大道/文心路口，金錢豹KTV酒店對面，鄰台中歌劇院與百貨。已有委託售地授權書。",
  },
  {
    ref: "official-land-042",
    landCondition: "住二（建50%/容220%）",
    priceBudget: "2億7852萬元",
    description:
      "211.15坪住二用地，面寬16米、臨路20米。五期重劃區東興路三段。已有委售授權書。",
  },
  {
    ref: "official-land-043",
    landCondition: "乙工（建60%/容300%）",
    priceBudget: "46億4984萬元(1坪8.3萬)",
    description:
      "56,022坪空地（近17甲），臨30米路貨櫃車進出順暢。鄰東港華僑市場，距東港港口車程5分鐘、距高雄49公里(經國3、台88線)約46分鐘。已有委售授權書。",
  },
  {
    ref: "official-land-044",
    landCondition: "住宅用地",
    priceBudget: "3億5639萬元",
    description:
      "1037地號947.7坪(1坪20萬=1.8954億)+1049地號595.9坪(1坪28萬=1.6685億)合售。中山高國道1新營交流道旁。已有委託售地授權書。",
  },
];

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

  let updated = 0;
  let missing = 0;

  try {
    for (const u of UPDATES) {
      const result = await LandPost.findOneAndUpdate(
        { idempotencyKey: u.ref },
        {
          $set: {
            landCondition: u.landCondition,
            priceBudget: u.priceBudget,
            description: u.description,
            lastEditedAt: new Date(),
          },
          $inc: { version: 1 },
        },
        { new: true },
      );

      if (!result) {
        console.warn(`[miss] 找不到 ${u.ref}`);
        missing++;
        continue;
      }
      console.log(`[update] ${u.ref} -> _id=${result._id}`);
      updated++;
    }
    console.log(
      `\n完成：更新 ${updated} 筆、缺漏 ${missing} 筆，共處理 ${UPDATES.length} 筆`,
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
