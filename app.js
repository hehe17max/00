
let DB=[], FILTERS={}, selected=new Set(), selectedKeywords=new Set(), UPDATED_AT='', CURRENT_DETAIL=null;
const $=s=>document.querySelector(s);
const grid=$('#grid'), detail=$('#detail'), compareDialog=$('#compareDialog');
let LANG=localStorage.getItem('peripheraldb-language')||'zh-CN';
const I18N={
 'zh-CN':{title:'全球外设产品参数库',subtitle:'中国官方中文数据优先 · 逐字段溯源 · 每日发现新品 · 最多20款对比',brandToolTitle:'品牌搜索 / 联网补全',brandToolDesc:'先搜索数据库中的品牌；需要补充时，可启动品牌定向联网扫描。',brandPlaceholder:'输入中文或英文品牌名',searchBrand:'搜索品牌',supplementBrand:'联网补全品牌 ↗',searchPlaceholder:'搜索品牌、型号或参数…',allBrands:'全部品牌',allCategories:'全部品类',allOrigins:'全部来源地区',chinaBrands:'中国品牌',overseasBrands:'海外品牌',allVerification:'全部核验状态',officialVerified:'官方已核实',officialDiscovered:'官方已发现/待补',legacyReview:'历史数据待复核',conflict:'存在冲突',keywordSingle:'关键词：单选',keywordAnd:'关键词：多选且全部匹配 AND',keywordOr:'关键词：多选任一匹配 OR',sortBrand:'品牌 / 型号',sortName:'型号名称',sortVerified:'核验度优先',quickFilters:'快捷筛选关键词',clearKeywords:'清空关键词',results:'当前结果',products:'收录产品',brands:'品牌',categories:'品类',loadingDiscovery:'正在读取品牌发现状态…',viewCandidates:'查看候选品牌',noResults:'没有找到匹配产品。',selected:'已选',clear:'清空',compare:'参数对比',footer:'中国大陆官方中文产品页优先。自动提取的每个参数均保留来源；证据不足、配件、分类页及重复镜像页不会进入正式库。',updated:'数据更新：',details:'查看详情 →',compareLabel:'对比',verified:'官方已核实',discovered:'官方产品页已确认/参数待补',legacy:'历史数据待逐字段复核',conflictReview:'参数冲突待审',corroborated:'多来源已核验',confidence:'可信度',recentCheck:'最近检查',sources:'数据来源',noSources:'暂无来源记录',atLeastTwo:'至少选择两款产品',maxTwenty:'最多同时对比 20 款产品',compareTitle:'产品参数对比',parameter:'参数',enterBrand:'请输入品牌名称。',databaseHas:'数据库已收录：',missingHint:'如怀疑存在遗漏产品，可在维护者入口验证后执行定向扫描。',databaseMissing:'当前数据库未找到',candidateTitle:'自动发现的品牌候选',candidateDesc:'只有达到严格官网证据门槛的品牌才会自动进入 brands.json；其余候选保留等待人工审核。',noCandidates:'暂无候选品牌。',visitOfficial:'访问疑似官网 ↗',discoveryNew:'新候选',autoAdded:'自动加入',sitesChecked:'检查候选站点',searchSource:'搜索来源',searchResults:'搜索结果',maintainerEntry:'维护者入口',maintainerTitle:'维护者验证',maintainerDesc:'访客仅可查看数据。通过验证后可显示 GitHub 维护入口，最终写入仍需仓库权限。',passwordPlaceholder:'输入维护密码',unlock:'验证',passwordError:'密码不正确。',noImage:'暂无可靠官方产品图',officialImage:'官方产品图',productStatus:'产品状态',origin:'品牌地区',market:'数据市场',sourceType:'来源类型',sourceWeight:'来源权重',officialCnProduct:'中国大陆官网产品页',officialProduct:'品牌官网产品页',autoCategory:'自动分类',productPages:'产品页',structuredPages:'含结构化数据页面',unclassified:'待分类',china:'中国',overseas:'海外'},
 en:{title:'Global Peripheral Product Database',subtitle:'Mainland China official data first · Field-level provenance · Daily discovery · Compare up to 20',brandToolTitle:'Brand search / online supplement',brandToolDesc:'Search the database first, then run a targeted verified scan when products are missing.',brandPlaceholder:'Enter a Chinese or English brand name',searchBrand:'Search brand',supplementBrand:'Supplement brand online ↗',searchPlaceholder:'Search brand, model, or specification…',allBrands:'All brands',allCategories:'All categories',allOrigins:'All origins',chinaBrands:'Chinese brands',overseasBrands:'Overseas brands',allVerification:'All verification states',officialVerified:'Officially verified',officialDiscovered:'Official product page / specs pending',legacyReview:'Legacy data pending review',conflict:'Conflicting data',keywordSingle:'Keywords: single',keywordAnd:'Keywords: match all (AND)',keywordOr:'Keywords: match any (OR)',sortBrand:'Brand / model',sortName:'Model name',sortVerified:'Verification first',quickFilters:'Quick filters',clearKeywords:'Clear keywords',results:'Results',products:'Products',brands:'Brands',categories:'Categories',loadingDiscovery:'Loading discovery status…',viewCandidates:'View candidates',noResults:'No matching products.',selected:'Selected',clear:'Clear',compare:'Compare specs',footer:'Mainland China official Chinese product pages take priority. Every automatically extracted specification keeps its source; insufficient evidence, accessories, category pages, and translated duplicates are quarantined.',updated:'Updated: ',details:'View details →',compareLabel:'Compare',verified:'Officially verified',discovered:'Official product page / specs pending',legacy:'Legacy data pending field review',conflictReview:'Conflict pending review',corroborated:'Multi-source verified',confidence:'Confidence',recentCheck:'Last checked',sources:'Sources',noSources:'No source record',atLeastTwo:'Select at least two products',maxTwenty:'You can compare up to 20 products',compareTitle:'Product specification comparison',parameter:'Parameter',enterBrand:'Enter a brand name.',databaseHas:'In database: ',missingHint:'If products may be missing, verify through the maintainer entry and run a targeted scan.',databaseMissing:'Not found in the database:',candidateTitle:'Automatically discovered brand candidates',candidateDesc:'Only brands meeting the strict official-evidence threshold are auto-added; all others wait for human review.',noCandidates:'No candidates.',visitOfficial:'Visit candidate official site ↗',discoveryNew:'new candidates',autoAdded:'auto-added',sitesChecked:'sites checked',searchSource:'Search source',searchResults:'results',maintainerEntry:'Maintainer entry',maintainerTitle:'Maintainer verification',maintainerDesc:'Visitors have read-only access. Verification reveals the GitHub maintenance entry; repository permission is still required to write data.',passwordPlaceholder:'Enter maintenance password',unlock:'Verify',passwordError:'Incorrect password.',noImage:'No reliable official product image',officialImage:'Official product image',productStatus:'Product status',origin:'Brand origin',market:'Data market',sourceType:'Source type',sourceWeight:'Source priority',officialCnProduct:'Mainland China official product page',officialProduct:'Official product page',autoCategory:'Auto-classified',productPages:'product pages',structuredPages:'structured-data pages',unclassified:'Unclassified',china:'China',overseas:'Overseas'}
};
const t=k=>(I18N[LANG]||I18N['zh-CN'])[k]||k;
I18N['zh-CN'].missingHint='如怀疑存在遗漏产品，可直接打开联网补全入口执行定向扫描。';
I18N.en.missingHint='If products may be missing, open the online supplement entry and run a targeted scan.';
Object.assign(I18N['zh-CN'],{subtitle:'中国官方中文数据优先 · 每30分钟自动更新 · 低可信度数据明确标注 · 最多20款对比',brandToolTitle:'品牌 / 产品快速补全',brandToolDesc:'输入品牌名先查数据库；缺少品牌或产品时，直接进入联网补全。',searchBrand:'查数据库',supplementBrand:'联网补全 ↗',unverified:'待核实',footer:'中国大陆官方中文产品页优先。证据完整的数据标记为已核实；低可信度参数继续展示并注明“待核实”。'});
Object.assign(I18N.en,{subtitle:'Mainland China official data first · Auto-update every 30 minutes · Low-confidence data labeled · Compare up to 20',brandToolTitle:'Quick brand / product supplement',brandToolDesc:'Check the database by brand, then open online supplement when a brand or product is missing.',searchBrand:'Check database',supplementBrand:'Online supplement ↗',unverified:'Unverified',footer:'Mainland China official Chinese product pages take priority. Fully evidenced data is verified; low-confidence specifications remain visible and are labeled “Unverified”.'});
Object.assign(I18N['zh-CN'],{specStatus:'参数状态',specPending:'官网产品页已确认，详细参数正在自动补充'});
Object.assign(I18N.en,{specStatus:'Specification status',specPending:'Official product page confirmed; detailed specifications are being added automatically'});
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// One canonical field id can absorb both Chinese and English source labels.
// The UI renders only meaningful peripheral specifications, which prevents
// navigation, checkout and support-table text from leaking into product specs.
const SPEC_DEFS=[
 ['sensor','传感器','Sensor',['sensor','sensors','mouse sensor']],['dpi','最高DPI','Maximum DPI',['dpi','maximum dpi','max sensitivity (dpi)','dpi (cpi) range','mouse dpi','resolution']],['polling','回报率','Polling rate',['polling rate','max polling rate','usb report rate','polling']],['weight','重量','Weight',['weight','product weight','mouse weight','keyboard weight','weight (excluding receiver)','重量：262 克']],['chip','主控/芯片','Controller / chipset',['chipset','mcu','main controller','芯片']],['connection','连接','Connectivity',['connection','connection method','connection modes','connection type','connectivity','connectivity technology','wireless connectivity','wired connectivity','transmission technology','wireless technology','wireless tech','connection type:']],['ips','追踪速度','IPS / tracking speed',['tracking speed','max tracking speed','movement speed']],['acceleration','加速度','Acceleration',['acceleration','max acceleration','max acceleration (g)']],['lod','静默高度','Lift-off distance',['lod']],['switch','微动','Main switches',['micro switch','main switch','main key micro switch','mouse switch','click switch','left / right button switches']],['switch_life','微动寿命','Switch lifespan',['switch lifespan','click switch lifespan','operation life']],['encoder','滚轮编码器','Scroll encoder',['scroll encoder','scroll wheel']],['battery','电池','Battery',['battery','battery capacity','battery type','mouse battery','keyboard battery']],['battery_life','续航','Battery life',['battery life','wireless working time','wireless working time (backlit off)','wireless working time (rgb)','电池续航时间']],['dimensions','尺寸','Dimensions',['size','dimensions','product dimensions','item dimension','mouse dimensions','mouse dimension(l*w*h)','keyboard dimensions','keyboard dimension(l*w*h)','dimensions (w x d x h)','dimensions (w × h × d)']],['feet','脚贴','Mouse feet',['mouse feet']],['charging','充电方式','Charging method',['charging base','charging port','charging']],['software','软件','Software',['software','software support','driver','driver support','web driver']],['memory','板载存储','Onboard memory',['on-board memory profiles','on-board memory','onboard memory','onboard profiles']],
 ['layout','配列','Layout',['layout','keyboard layout','form factor','form-factor','number of keys','number of keys','keys','keyboard']],['key_switch','轴体','Switches',['switch','switches','key switches','switch type','switches:']],['key_switch_type','轴体类型','Switch type',['keyboard type','key type']],['magnetic','磁轴方案','Hall-effect system',['hall effect (rapid trigger)']],['rapid_trigger','快速触发','Rapid Trigger',['rapid trigger','dynamic keystroke','rt smart']],['rt_precision','RT精度','RT precision',['step precision','accuracy','adjustable accuracy','rt range']],['actuation','触发行程','Actuation travel',['actuation point','actuation range','global actuation distance','pre-travel','pre travel/mm','opterating travel/mm']],['total_travel','总行程','Total travel',['total travel','total travel distance','total travel/mm','travel/mm']],['actuation_force','触发压力','Actuation force',['actuation force','operation force','operating force/gf','initial force/gf']],['scan_rate','扫描率','Scan rate',['scan rate']],['latency','延迟','Latency',['latency','click latency','最低延迟','标称延迟']],['hotswap','热插拔','Hot-swappable',['hot swappable','hot-swappable','hot swappable support','hot-swap mixed switches']],['keycaps','键帽','Keycaps',['keycap','keycaps','keycap material','keycap profile','keycap type','keycaps profile','keycaps engraving','keycap materials']],['plate','定位板','Plate',['plate','plate material','positioning plate']],['structure','结构','Structure',['structure','mount style','mounting style','internal structure']],['case','机身','Case / body',['case','case material','body material','material (body and grip)','chassis']],['nkro','全键无冲','N-key rollover',['n-key rollover (nkro)','nkro support','rollover','anti-ghosting']],['lighting','灯光','Lighting',['rgb','rgb lighting','rgb led lights','lighting','lighting effects','backlight','backlighting','backlit','led support','led color']],
 ['driver','驱动单元','Driver unit',['driver size','drivers','razer™ triforce50 毫米镀钛驱动单元']],['driver_type','驱动类型','Driver type',['driver type & size','driver type']],['frequency','频响','Frequency response',['frequency response']],['wireless','蓝牙/无线','Bluetooth / wireless',['bluetooth version','bluetooth device name','wireless technology']],['codec','编码','Audio codecs',['codec','codecs']],['sample_rate','采样率','Sample rate',['sample rate','采样']],['bit_depth','位深','Bit depth',['bit-depth']],['anc','降噪','Noise cancellation',['anc','noise cancellation']],['microphone','麦克风','Microphone',['microphone','polar pattern','先进的麦克风控制功能','带usb声卡的可拆卸razerhyperclear灵晰降噪心形指向麦克风']],['microphone_count','麦克风数量','Microphone count',['microphone count']],['charge_time','充电时间','Charging time',['charge time','charging time','battery recharge time']],['wireless_range','无线距离','Wireless range',['range','wireless range','bluetooth transmission range','transmission distance']],['wired','有线连接','Wired connection',['wired connectivity','有线连接']],['surround','虚拟环绕','Virtual surround',['surround sound','thx spatial audio 空间音效']],['app','APP/软件','App / software',['app','app/软件']],['multi_device','多设备','Multi-device',['multi-device']],['compatibility','兼容平台','Compatibility',['compatibility','compatible devices','compatible platforms','platform compatibility','os compatibility','os support','system requirements','supported devices','compatible system']],['material','材质','Material',['material']],['protection','防护','Protection rating',['protection rating','ip rating']],['buttons','可编程按键','Programmable buttons',['programmable buttons','programmable mouse buttons','buttons']],['cable','线材','Cable',['cable','cable type','cable length']],['color','颜色','Color',['color','colors','color options']]
];
const SPEC_BY_ID=new Map(SPEC_DEFS.map(x=>[x[0],x]));
const normalizeSpecKey=value=>String(value||'').toLowerCase().replace(/[™®©]/g,'').replace(/[_:\-–—/（）()×*&\s]+/g,' ').trim();
const SPEC_ALIAS=new Map();
SPEC_DEFS.forEach(def=>[def[1],def[2],...def[3]].forEach(alias=>SPEC_ALIAS.set(normalizeSpecKey(alias),def[0])));
function specId(key){return SPEC_ALIAS.get(normalizeSpecKey(key))||''}
// Extra aliases for English field names seen on official pages (v1.3.2)
const EXTRA_SPEC_ALIASES=[
 ['cable',['cable length (imperial) and type','cable length (imperial)']],
 ['ips',['ips','max speed (ips)','max speed(ips)','tracking speed (ips)']],
 ['switch_life',['switch lifecycle','key lifespan','key lifecycle']],
 ['battery',['case battery capacity']],
 ['weight',['earbud weight (single)','earbud weight(single)','earbud weight','case weight','gross weight']],
 ['dimensions',['front height','back height','earbud size']],
 ['structure',['frame type']],
 ['dpi',['dpi presets','dpi preset']],
 ['keycaps',['keycaps (fully assembled version)']],
 ['codec',['supported bluetooth codecs','bluetooth codecs']],
 ['wireless_range',['bluetooth range']],
 ['rt_precision',['rapid trigger adjustment range']],
 ['software',['qmk support','a hub game driver(windows)','a hub game driver(mac)','a hub web driver']],
 ['surround',['surround system']],
 ['buttons',['programmable button']],
 ['anc',['noise cancelling']],
 ['acceleration',['accelerate speed']],
 ['dimensions',['dimension','earbud dimension','case size']],
 ['battery',['earbud playtime fully charged','total playtime fully charged','playtime anc off','playtime anc on','earbuds fully charged music playback','case and earbuds fully charged music playback','earbuds fully charged','case and earbuds fully charged','usage duration']],
 ['dpi',['dpi cpi','max dpi']],
 ['switch_life',['left right button durability']],
 ['codec',['audio codec']],
 ['compatibility',['system']],
 ['cable',['wire','wire material','cable material']],
 ['anc',['active noise cancellation anc']],
 ['weight',['earbud weigh']],
 ['protection',['waterproof']],
 ['ips',['tracking speed','movement speed','max tracking speed']],
 ['hotswap',['hot swap']],
 ['rt_precision',['adjustable actuation points']]
];
EXTRA_SPEC_ALIASES.forEach(([id,aliases])=>aliases.forEach(a=>SPEC_ALIAS.set(normalizeSpecKey(a),id)));
// English spec keys without a canonical field -> Chinese label (v1.3.2)
const SPEC_KEY_ZH={
 'warranty':'保修','shape':'外形','operating environment':'工作环境','ear cushions':'耳罩','ear cushion':'耳罩',
 'light effects':'灯光效果','t.h.d':'总谐波失真','element':'单元','usb specification':'USB 规格',
 'audio controls':'音频控制','receiver':'接收器','grip style':'握持方式','operation style':'操作方式',
 'customization':'自定义','surface coating':'表面涂层','input':'输入','working temperature':'工作温度',
 'knob support':'旋钮支持','plug':'插头','sound dampening':'隔音','screen':'屏幕',
 'multimedia knob':'多媒体旋钮','dedicated media key':'独立媒体键','media keys':'媒体键',
 'special features':'特色功能','game mode':'游戏模式','bluetooth protocols':'蓝牙协议',
 'stabilizer':'卫星轴','stabilizers':'卫星轴','stabs':'卫星轴','lighting effects':'灯光效果',
'app support':'App 支持','bluetooth':'蓝牙','mems mic control':'MEMS 麦克风控制','nvidia reflex':'NVIDIA Reflex 技术',
'motion sync':'运动同步','tracks on glass':'玻璃表面追踪','tracks on glass min. 4 mm thickness':'玻璃表面追踪（最小 4 mm）',
'pixart 3950':'传感器（PixArt 3950）','pixart 3395':'传感器（PixArt 3395）',
'impedance':'阻抗','nominal impedance':'额定阻抗','speaker impedance':'扬声器阻抗','speaker impendance':'扬声器阻抗',
'sensitivity':'灵敏度','headphones sensitivity':'耳机灵敏度','boom mic sensitivity':'吊杆麦克风灵敏度','built in mic sensitivity':'内置麦克风灵敏度',
'boom mic polar pattern':'吊杆麦克风指向性','built in mic polar pattern':'内置麦克风指向性',
'instant pair':'快速配对','audio':'音频','rated power':'额定功率','total harmonic distortion':'总谐波失真',
'nominal spl':'额定声压级','ear tips':'耳塞套','playback':'播放时长','dynamic keystroke':'动态键程','dynamic keystrokes':'动态键程',
'internal foam':'内部泡棉','internal foam layering':'内部泡棉分层','internal architecture':'内部结构','housing process':'外壳工艺',
'shell':'外壳','backplate':'背板','pcb':'电路板','pcb option':'PCB 选项','mounting':'安装方式','hub':'HUB 拓展',
'system architecture':'系统架构','system functions':'系统功能','precision':'精度','build finishing':'做工与表面处理',
'design':'设计','modes':'模式','numeric pad':'数字小键盘','multimedia keys':'多媒体键','advanced functions':'进阶功能',
'hand size fit':'手型适配','feet':'脚贴','port':'接口','surface finish':'表面处理','surface finishing texture':'表面纹理',
'finish':'表面处理','scroll wheel encoder':'滚轮与编码器','microcontroller unit mcu':'主控芯片（MCU）',
'usb 2.0 pass through':'USB 2.0 直通','rt smart':'RT 智能模式','adjustable actuation points':'可调触发行程',
'general':'常规','suitable hand size':'适用手型','recommended hand size':'推荐手型','earmuffs replaceable':'耳罩可更换',
'pairing 2 devices':'双设备配对','wearing method':'佩戴方式','control method':'控制方式','aux in port':'AUX 输入口',
'foldable':'可折叠','ikf app':'iKF App 支持','active noise cancellation anc':'主动降噪',
'performance mode':'性能模式','competitive mode':'竞技模式','hyper competitive mode':'超级竞技模式',
'maximum battery life':'最长续航','mouse movement detection':'移动检测方式','frame rate fps':'帧率（FPS）',
'adc direct connection':'ADC 直连','hunting shark competitive mode':'猎鲨竞技模式','case material':'外壳材质',
'speaker driver':'扬声器驱动单元','play time':'播放时间','transparent mode':'通透模式',
'polling rate highest level':'最高回报率','language type':'语言类型','switches type':'轴体类型',
'full nkro support':'全键无冲','2c fast charge':'2C 快充','earbuds input':'耳机输入',
'in line remote controls and microphone':'线控与麦克风','mouse hand orientation':'左右手适用',
'angle snapping':'角度吸附','optical sensor configuration':'光学传感器配置',
'weight fully assembled version':'重量（成品版）','switch face':'微动触点',
'dynamic key functions':'动态按键功能','advanced key features':'进阶按键功能',
'dynamic keystroke features':'动态键程功能','audio driver':'音频驱动','power supply mode':'供电方式',
'operating system':'操作系统','bt working time backlit off':'蓝牙续航（关背光）',
'frequency band':'频段','bluetooth operating distance':'蓝牙工作距离',
'built in mic frequency response':'内置麦克风频响','built in mic element':'内置麦克风单元','boom mic frequency response':'吊杆麦克风频响',
'headphones frequency response':'耳机频响','earbud battery capacity single':'单耳电池容量',
'earbud charging time':'单耳充电时间','earbuds charging time':'单耳充电时间',
'case charging time':'充电仓充电时间','case charging time wired':'充电仓充电时间（有线）',
'case dimensions':'充电仓尺寸','bottom case material':'底部外壳材质','aluminum case finishing':'铝合金外壳表面处理',
'height without keycap front':'不含键帽高度（前）','height without keycap rear':'不含键帽高度（后）',
'height incl keycap front':'含键帽高度（前）','height incl keycap rear':'含键帽高度（后）',
'on ear controls left':'左侧耳罩控制','on ear controls right':'右侧耳罩控制','switch lifecyle':'轴体寿命'
};
const LOOSE_SPEC_ZH={accuracy:'精度',height:'高度',width:'宽度',depth:'深度',length:'长度',angle:'角度',application:'应用',battery:'电池',buttons:'按键',cable:'线材',calibration:'校准',charge:'充电',charging:'充电',color:'颜色',compatibility:'兼容性',compatible:'兼容',connection:'连接',connectivity:'连接',controls:'控制',device:'设备',dimensions:'尺寸',distance:'距离',driver:'驱动单元',features:'功能',force:'压力',frequency:'频率',height:'高度',interface:'接口',key:'按键',keyboard:'键盘',latency:'延迟',lighting:'灯光',material:'材质',memory:'存储',microphone:'麦克风',mode:'模式',mouse:'鼠标',operating:'触发',operation:'触发',platform:'平台',polling:'回报',profile:'配置',range:'范围',rate:'率',response:'响应',sensor:'传感器',software:'软件',speed:'速度',support:'支持',switch:'轴体/微动',technology:'技术',time:'时间',type:'类型',version:'版本',weight:'重量',wireless:'无线',wired:'有线',working:'工作',front:'前',back:'后',game:'游戏',media:'媒体',environment:'环境',coating:'涂层',input:'输入',plug:'插头',screen:'屏幕',warranty:'保修',shape:'外形',element:'单元',receiver:'接收器',custom:'自定义',customization:'自定义',grip:'握持',operation:'操作',stabilizer:'卫星轴',stabs:'卫星轴',dampening:'隔音',knob:'旋钮',dedicated:'独立',special:'特色',features:'功能',protocol:'协议',profiles:'配置文件',temperature:'温度',supported:'支持',lifecycle:'寿命',gross:'毛',single:'单只',cushion:'耳垫',cushions:'耳垫',holder:'支架',feet:'脚贴',bluetooth:'蓝牙',earbud:'单耳',earbuds:'单耳',dock:'底座',boom:'吊杆',mic:'麦克风',element:'单元',method:'方式',headphones:'耳机',chassis:'外壳',frame:'框架',structural:'结构',firmware:'固件',system:'系统',primary:'主',durability:'寿命',actuation:'触发',keycap:'键帽',without:'不含',incl:'含',sensitivity:'灵敏度',rear:'后',capacity:'容量'};
function looseSpecLabel(key){
 if(LANG!=='zh-CN'||!/^[\x00-\x7F]+$/.test(key))return key;
 let changed=false;
 const words=String(key).replace(/[_-]+/g,' ').split(/\s+/).map(word=>{const translated=LOOSE_SPEC_ZH[word.toLowerCase().replace(/[^a-z]/g,'')];if(translated){changed=true;return translated}return word});
 return changed?words.join(''):key;
}
function specLabel(key){const def=SPEC_BY_ID.get(specId(key));if(def)return LANG==='zh-CN'?def[1]:def[2];const zh=SPEC_KEY_ZH[normalizeSpecKey(key)];if(zh&&LANG==='zh-CN')return zh;return looseSpecLabel(key)}
function valueLabel(value){
 let out=String(value??'—');
 const exact={
  '支持':['支持','Supported'],'不支持':['不支持','Not supported'],'无':['无','None'],'有':['有','Yes'],'是':['是','Yes'],'否':['否','No'],'待核实':['待核实','Pending verification'],'待补参数':['待补参数','Specifications pending'],'批次不同':['批次不同','Varies by revision'],'低延迟模式':['低延迟模式','Low-latency mode'],'自动发现':['自动分类','Auto-classified'],'在售':['在售','Available'],'海外':['海外','Overseas'],'中国':['中国','China'],'官网':['官网','Official site'],'全球/官网':['全球/官网','Global / official site'],'中国/全球':['中国/全球','Mainland China / global']
 };
 if(exact[out])return exact[out][LANG==='zh-CN'?0:1];
 if(LANG==='zh-CN'){
  const sentenceRules=[
   [/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\s+of charging\s*=\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+of use/gi,'$1 分钟充电 = $2 小时使用'],
   [/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+per charge/gi,'单次充电 $1 小时'],
   [/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+total with (?:charging case|充电仓)/gi,'配合充电仓共 $1 小时'],
   [/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+with (?:charging case|充电仓)/gi,'配合充电仓 $1 小时'],
   [/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+(?:of (?:use|usage)|use)/gi,'使用 $1 小时'],
   [/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s+carrying case/gi,'含充电仓 $1 小时'],
   [/(\d+(?:\.\d+)?)m\s*\(open space\)/gi,'$1 米（开阔空间）'],
   [/approx\.?\s*/gi,'约'],
   [/(\d+(?:\.\d+)?)\s*g\s+per earbud(?:;|,)?\s*approx\.?\s*(\d+(?:\.\d+)?)\s*g\s*\((?:earbuds and )?charging case\)/gi,'单只 $1 克；含充电仓共 $2 克'],
   [/(\d+(?:\.\d+)?)\s*g\s+per earbud/gi,'单只 $1 克'],
   [/weight\s+(\d+(?:\.\d+)?)\s*g/gi,'$1 克'],
   [/(\d+(?:\.\d+)?)\s*mm\s*\((?:incl|inclu)\.?\s*keycaps\)/gi,'$1 毫米（含键帽）'],
   [/(\d+(?:\.\d+)?)\s*mm\s*\(without keycaps\)/gi,'$1 毫米（不含键帽）'],
   [/non[- ]backlit/gi,'无背光'],
   [/south-facing rgb led/gi,'南向 RGB 灯'],
   [/north-facing rgb led/gi,'北向 RGB 灯'],
   [/south-facing rgb/gi,'南向 RGB'],
   [/north-facing rgb/gi,'北向 RGB'],
   [/adjustable \d+-level rgb backlit/gi,'多级 RGB 背光可调'],
   [/with volume at (\d+)%/gi,'音量 $1% 时'],
   [/with anc off/gi,'关闭降噪时'],
   [/anc off/gi,'关闭降噪'],
   [/bass boost off/gi,'关闭低音增强'],
   [/spatial audio off/gi,'关闭空间音频'],
   [/(?:what'?s included in the box|in the box)/gi,'包装内含'],
   [/software compatibility:/gi,'软件兼容：'],
   [/compatible with all platforms/gi,'兼容所有平台'],
   [/rechargeable battery/gi,'可充电电池'],
   [/milliampere hours/gi,'毫安时'],
   [/carrying case/gi,'充电仓'],
   [/crystal-clear calls: four microphones with ai noise reduction ensure clarity in noisy environments/gi,'清晰通话：四麦克风 AI 降噪，嘈杂环境依然清晰'],
   [/crystal-clear calls/gi,'清晰通话'],
   [/game mode reduces lag to \d+(?:\.\d+)? seconds for perfect audio-visual sync/gi,'游戏模式延迟低至 0.08 秒，音画同步'],
   [/supports? (?:the )?(?:low )?latency mode for gaming/gi,'支持游戏低延迟模式'],
   [/low latency mode for gaming/gi,'游戏低延迟模式'],
   [/(?:\(\s*)?latency under 80ms(?:\))?/gi,'（延迟低于 80 毫秒）'],
   [/supports? app connection and customization/gi,'支持 App 连接与自定义'],
   [/app connection and customization/gi,'App 连接与自定义'],
   [/ipx5 waterproof and sweatproof/gi,'IPX5 防水防汗'],
   [/water and sweat[- ]resistant/gi,'防水防汗'],
   [/waterproof and sweatproof/gi,'防水防汗'],
   [/memory titanium alloy/gi,'记忆钛合金'],
   [/titanium alloy/gi,'钛合金'],
   [/touch controls/gi,'触控操作'],
   [/in-line remote controls? and microphone/gi,'线控麦克风'],
   [/oxygen-free copper wire/gi,'无氧铜线'],
   [/gold plated/gi,'镀金'],
   [/push button/gi,'按键'],
   [/press the button/gi,'按键操作'],
   [/open ear/gi,'开放式'],
   [/semi-in-ear/gi,'半入耳式'],
   [/clip on/gi,'耳夹式'],
   [/over ear/gi,'包耳式'],
   [/on ear/gi,'贴耳式'],
   [/in ear/gi,'入耳式'],
   [/per earbud/gi,'单只耳机'],
   [/noise-reducing mic ensures clearer voice chats in team games/gi,'降噪麦克风，团队游戏通话更清晰'],
   [/ai noise-canceling microphone with 360° voice pickup/gi,'AI 降噪麦克风，360° 拾音'],
   [/built[- ]?in (\d+) microphones/gi,'内置 $1 麦克风'],
   [/external microphone/gi,'外置麦克风'],
   [/built-in/gi,'内置'],
   [/transmit more audio details wirelessly for near lossless sound quality/gi,'无线传输更多音频细节，接近无损音质'],
   [/open space/gi,'开阔空间'],
   [/playback time/gi,'播放时间'],
   [/playtime/gi,'播放时间'],
   [/earbud battery capacity/gi,'单耳电池容量'],
   [/case battery capacity/gi,'充电仓电池容量'],
   [/case charging time/gi,'充电仓充电时间'],
   [/battery capacity/gi,'电池容量'],
   [/charging time/gi,'充电时间'],
   [/bluetooth range/gi,'蓝牙范围'],
   [/bluetooth version/gi,'蓝牙版本'],
   [/bluetooth protocols?/gi,'蓝牙协议'],
   [/frequency range/gi,'频率范围'],
   [/frequency band/gi,'频段'],
   [/audio codec/gi,'音频编码'],
   [/waterproof/gi,'防水'],
   [/sweatproof/gi,'防汗'],
   [/fully charged/gi,'满电'],
   [/\b(\d+)\s*mins?\b/gi,'$1 分钟'],
   [/\b(\d+)\s*hrs?\b/gi,'$1 小时'],
   ['single earbud','单只耳机'],
   [/input:/gi,'输入：'],
   [/earbud weight:/gi,'单耳重量：'],
   [/case weight:/gi,'充电仓重量：'],
   [/gross weight:/gi,'总重：'],
   [/wireless range:/gi,'无线范围：'],
   [/bluetooth range:/gi,'蓝牙范围：'],
   [/sensitivity:/gi,'灵敏度：'],
   [/frequency response:/gi,'频响：'],
   [/impedance:/gi,'阻抗：'],
   [/earbud battery capacity \(single\):/gi,'单耳电池容量：'],
   [/case battery capacity:/gi,'充电仓电池容量：'],
   [/earbud battery capacity:/gi,'单耳电池容量：'],
   [/battery life:/gi,'续航：'],
   [/battery:/gi,'电池：'],
   [/charging time:/gi,'充电时间：'],
   [/cable length:/gi,'线长：'],
   [/material:/gi,'材质：'],
   [/connection:/gi,'连接：'],
   [/connectivity:/gi,'连接：'],
   [/microphone:/gi,'麦克风：'],
   [/playback:/gi,'播放：'],
   [/weight:/gi,'重量：'],
   [/type:/gi,'类型：'],
   [/2c fast charge:/gi,'2C 快充：'],
   [/fast charge:/gi,'快充：'],
   [/controls/gi,'操作'],
   [/control/gi,'操作'],
   [/earbud weig?ht/gi,'单耳重量'],
   [/bluetooth protocols?/gi,'蓝牙协议'],
   [/frequency band/gi,'频段'],
   [/audio codec/gi,'音频编码'],
   [/gross weight/gi,'总重'],
   [/case weight/gi,'充电仓重量'],
   [/wireless range/gi,'无线范围'],
   [/sensitivity/gi,'灵敏度'],
   [/frequency response/gi,'频响'],
   [/impedance/gi,'阻抗'],
   [/connection method/gi,'连接方式'],
   [/wearing method/gi,'佩戴方式'],
   [/charging port/gi,'充电接口'],
   [/in the box/gi,'包装内含'],
   [/warranty/gi,'质保'],
   [/dimensions/gi,'尺寸'],
   [/form factor/gi,'形态'],
   [/polling rate/gi,'回报率'],
   [/response time/gi,'响应时间'],
   [/with hunting shark mode enabled, the static scan rate soars to 20,000 fps, while 8000hz polling ensures every movement is captured instantly/gi,'开启猎鲨模式时静态扫描率高达 20,000 FPS，8000Hz 回报率确保每个动作即时捕捉'],
   [/featuring pixart'?s latest ([a-z0-9]+), this cutting-edge sensor delivers/gi,'搭载 PixArt 最新 $1 先进传感器，支持'],
   [/this cutting-edge sensor delivers/gi,'先进传感器支持'],
   [/web-based configurator & pc software/gi,'网页配置器与 PC 软件'],
   [/web-based configurator/gi,'网页配置器'],
   [/dual-layer ptfe skates/gi,'双层特氟龙脚贴'],
   [/(\d+) million clicks/gi,'$1 千万次点击'],
   [/(\d+)m clicks/gi,'$1 千万次点击'],
   [/million scrolls/gi,'百万次滚动'],
   [/(\d+)k scrolls/gi,'$1 万次滚动'],
   [/ultra-lightweight optimization/gi,'超轻量化设计'],
   [/near-instantaneous execution/gi,'近瞬时响应'],
   [/high-precision hall effect sensor/gi,'高精度霍尔传感器'],
   [/high-precision magnetic switches/gi,'高精度磁轴'],
   [/demagnetized steel wire fine-tuning satellite switches/gi,'去磁钢丝精调卫星轴'],
   [/cnc machined aluminum wheel/gi,'CNC 铝制滚轮'],
   [/glass-feel ice coating \(anti-sweat barrier\)/gi,'冰感涂层（防汗屏障）'],
   [/full-key anti-ghosting/gi,'全键无冲'],
   [/silver plated ofc wire/gi,'镀银无氧铜线'],
   [/huano blue shell pink dot switch/gi,'华诺蓝壳粉点微动'],
   [/micro switch:/gi,'微动：'],
   [/scroll wheel & encoder:/gi,'滚轮与编码器：'],
   [/scroll wheel:/gi,'滚轮：'],
   [/mouse feet:/gi,'鼠标脚贴：'],
   [/software support:/gi,'软件支持：'],
   [/software:/gi,'软件：'],
   [/structural weight/gi,'结构重量'],
   [/stabilizers:/gi,'卫星轴：'],
   [/switch:/gi,'按键：'],
   [/sensor:/gi,'传感器：'],
   [/microcontroller unit \(mcu\)/gi,'主控（MCU）'],
   [/optical sensor configuration/gi,'光学传感器配置'],
   [/wireless actuation latency/gi,'无线触发延迟'],
   [/surface finishing texture/gi,'表面处理工艺'],
   [/wire material/gi,'线材'],
   [/structural/gi,'结构'],
   [/hunting shark mode/gi,'猎鲨模式'],
   [/static scan rate/gi,'静态扫描率'],
   [/high-efficiency processor/gi,'高效处理器'],
   [/near-lossless sound quality/gi,'接近无损音质'],
   [/ultra-low/gi,'超低'],
   [/anti-sweat barrier/gi,'防汗屏障'],
   [/ice coating/gi,'冰感涂层'],
   [/quick and reliable connection with a modern usb type-c port, ensuring compatibility with the latest devices/gi,'USB-C 接口，连接快速可靠，兼容最新设备'],
   [/delivers precise tracking and responsive movement, optimized for high-stakes gaming/gi,'精准追踪、灵敏移动，为高强度游戏优化'],
   [/seamlessly connect with three different modes/gi,'三模无缝连接'],
   [/complete 104-key layout, perfect for both work and gaming/gi,'完整 104 键配列，兼顾办公与游戏'],
   [/compact design with all the keys you need for productivity and gaming/gi,'紧凑设计，办公游戏所需按键一应俱全'],
   [/offers flexible connectivity options with both/gi,'提供灵活连接选项，支持'],
   [/not included? cable/gi,'不含线材'],
   [/transparency mode:/gi,'通透模式：'],
   [/\(earphones\); (\d+) mAh\/[\d.]+ wh \(charging bin\)/gi,'（耳机）$1 mAh；充电盒'],
   [/\(charging bin\)/gi,'（充电盒）'],
   [/\(earphones\)/gi,'（耳机）'],
   [/volume, play\/pause/gi,'音量、播放/暂停'],
   [/(\d+)-zone rgb with sidelights/gi,'$1 区 RGB 与侧灯'],
   [/per-key backlighting, side lights, badge/gi,'每键背光、侧灯、徽标'],
   [/per-key backlighting/gi,'每键背光'],
   [/side lights/gi,'侧灯'],
   [/default: (\d+)°, small feet: ([\d.]+)°, large feet: ([\d.]+)°/gi,'默认 $1°，小脚贴 $2°，大脚贴 $3°'],
   [/clip-in mx/gi,'卡扣式 MX 轴'],
   [/usb-a to usb-c/gi,'USB-A 转 USB-C'],
   [/case material polymer/gi,'聚合物'],
   [/mounting style gasket/gi,'垫片式安装'],
   [/knob support yes/gi,'支持旋钮'],
   [/knob support/gi,'旋钮支持'],
   [/mx-compatible membrane/gi,'兼容 MX 的薄膜'],
   [/uv-coated abs/gi,'UV 涂层 ABS'],
   [/ansi and iso available/gi,'支持 ANSI 与 ISO 配列'],
   [/hot swappable: yes; (\d+) & (\d+)-pin mechanical/gi,'支持热插拔；$1/$2 针机械'],
   [/hot swappable: yes; (\d+)-pin mechanical/gi,'支持热插拔；$1 针机械'],
   [/hot swappable/gi,'支持热插拔'],
   [/custom meg shark linear switches/gi,'定制 Meg Shark 线性轴'],
   [/custom meg shark/gi,'定制 Meg Shark'],
   [/keycap material/gi,'键帽材质'],
   [/switch type/gi,'按键类型'],
   [/headphones sensitivity/gi,'耳机灵敏度'],
   [/on-ear controls \(right\)/gi,'耳罩右侧控制'],
   [/on-ear controls \(left\)/gi,'耳罩左侧控制'],
   [/on-ear controls/gi,'耳罩控制'],
   [/lighting:/gi,'灯光：'],
   [/os support/gi,'系统支持'],
   [/stabilizers:/gi,'卫星轴：'],
   [/mounting style/gi,'安装方式'],
   [/case material/gi,'外壳材质'],
   [/knob support/gi,'旋钮支持'],
   [/angle:/gi,'角度：'],
   [/cable:/gi,'线材：'],
   [/layout:/gi,'配列：'],
   [/switches:/gi,'轴体：'],
   [/hot swappable:/gi,'热插拔：'],
   [/full-size others keycap: pbt keycpas light: rgb display: tft display/gi,'全尺寸配列 · PBT 键帽 · RGB 灯效 · TFT 屏'],
   [/keycap: pbt/gi,'PBT 键帽'],
   [/light: rgb/gi,'RGB 灯效'],
   [/display: tft/gi,'TFT 屏'],
   [/driver: yes/gi,'带驱动'],
   [/three-mode/gi,'三模'],
   [/kbs/gi,'KBS'],
   [/per key rgb lighting and (\d+) brightness levels/gi,'每键 RGB 灯，$1 级亮度'],
   [/per-key rgb lighting/gi,'每键 RGB 灯'],
   [/per key rgb lighting/gi,'每键 RGB 灯'],
   [/weight \(with cable\):/gi,'含线重量：'],
   [/(\d+(?:\.\d+)?)ft \| usb-c to usb-a,? braided/gi,'$1 英尺 | USB-C 转 USB-A，编织线'],
   [/(\d+(?:\.\d+)?)ft \| usb-c to usb-a;? braided/gi,'$1 英尺 | USB-C 转 USB-A，编织线'],
   [/(\d+(?:\.\d+)?)ft/gi,'$1 英尺'],
   [/braided cable/gi,'编织线'],
   [/braided/gi,'编织'],
   [/electret condenser microphone/gi,'驻极体电容麦克风'],
   [/memory foam \(padding material\); premium leatherette \(surface material\)/gi,'记忆棉（填充材质）；高级皮革（表面材质）'],
   [/memory foam and premium leatherette/gi,'记忆棉与高级皮革'],
   [/memory foam/gi,'记忆棉'],
   [/premium leatherette/gi,'高级皮革'],
   [/bi-directional, noise-cancelling/gi,'双向降噪'],
   [/bi-directional/gi,'双向'],
   [/noise-cancelling/gi,'降噪'],
   [/full-speed/gi,'全速'],
   [/(\d+) led modes and (\d+) brightness levels/gi,'$1 种灯效、$2 级亮度'],
   [/cherry-style, pre-lubed/gi,'Cherry 风格，出厂润滑'],
   [/pre-lubed/gi,'出厂润滑'],
   [/(\d+)°; (\d+)° with feet extended/gi,'$1°；展开脚贴 $2°'],
   [/(\d+)\.\d+ million color rgb\((\d+) effects\)/gi,'1680 万色 RGB（$2 种灯效）'],
   [/(\d+(?:\.\d+)?) million color rgb \(?(\d+) effects\)?/gi,'$1 百万色 RGB（$2 种灯效）'],
   [/rgb lighting/gi,'RGB 灯'],
   [/windows 10\+ ; macOS 10.11 or later/gi,'Windows 10+；macOS 10.11 或更高'],
   [/or later/gi,'或更高'],
   [/full speed/gi,'全速'],
   [/with feet extended/gi,'展开脚贴'],
   [/effects/gi,'种灯效'],
   [/stainless steel; aluminum forks/gi,'不锈钢；铝叉'],
   [/microfiber ear pads/gi,'超细纤维耳垫'],
   [/ear pads/gi,'耳垫'],
   [/headset: ([\d.]+) lb; base station: ([\d.]+) lb; boom mic: ([\d.]+) lb/gi,'耳机 $1 磅；底座 $2 磅；麦克风 $3 磅'],
   [/([\d.]+) yd detachable headset cable; ([\d.]+) yd pc splitter cable; ([\d.]+) yd usb-c dongle cable with usb-a adapter/gi,'可拆卸耳机线 $1 码；PC 分线器线 $2 码；USB-C 转接器线 $3 码（含 USB-A 适配器）'],
   [/([\d.]+) yd/gi,'$1 码'],
   [/detachable headset cable/gi,'可拆卸耳机线'],
   [/pc splitter cable/gi,'PC 分线器线'],
   [/usb-c dongle cable/gi,'USB-C 转接器线'],
   [/with usb-a adapter/gi,'含 USB-A 适配器'],
   [/(\d+(?:\.\d+)?) surround sound/gi,'$1 环绕声'],
   [/24\/16-bit playback; 16-bit microphone/gi,'24/16 位播放；16 位麦克风'],
   [/plastic; elastic band/gi,'塑料；弹力带'],
   [/soft foam & fabric ear cushions/gi,'软泡沫与织物耳罩'],
   [/ear cushions/gi,'耳罩'],
   [/li-ion polymer battery/gi,'锂聚合物电池'],
   [/li-polymer battery/gi,'锂聚合物电池'],
   [/rechargeable li-polymer/gi,'可充电锂聚合物'],
   [/rechargeable/gi,'可充电'],
   [/weight \(mouse only\):/gi,'仅鼠标重量：'],
   [/weight \(without cable\)/gi,'不含线重量'],
   [/weight \(with cable\)/gi,'含线重量'],
   [/mouse only:/gi,'仅鼠标：'],
   [/nominal charge current/gi,'标称充电电流'],
   [/type-c cable \+ type-a to type-c adapter/gi,'Type-C 线 + Type-A 转 Type-C 适配器'],
   [/osa profile double-shot pbt keycaps, not shine-through/gi,'OSA 高度双色注塑 PBT 键帽，非透光'],
   [/cherry profile double-shot pbt keycaps/gi,'Cherry 高度双色注塑 PBT 键帽'],
   [/double-shot pbt keycaps/gi,'双色注塑 PBT 键帽'],
   [/pbt keycaps/gi,'PBT 键帽'],
   [/not shine-through/gi,'非透光'],
   [/plate-mounted stabs/gi,'钢板卫星轴'],
   [/gateron low-profile mechanical/gi,'佳达隆矮轴机械'],
   [/low-profile mechanical/gi,'矮轴机械'],
   [/stable, fast connection with low power consumption/gi,'连接稳定快速、功耗低'],
   [/customize sound modes and settings with ease/gi,'轻松自定义音效模式与设置'],
   [/comfortable fit： ergonomic design for all-day wear without fatigue/gi,'舒适佩戴：人体工学设计，全天佩戴不疲劳'],
   [/connect two devices simultaneously and switch seamlessly between them/gi,'可同时连接两台设备并无缝切换'],
   [/effortlessly switch between devices, ensuring you never miss a call, game, or song without needing to reconnect/gi,'设备间轻松切换，无需重新连接也不会错过通话、游戏或音乐'],
   [/connect two devices simultaneously, ideal for multitaskers who switch between work calls and gaming effortlessly/gi,'可同时连接两台设备，适合在工作通话与游戏间轻松切换的多任务用户'],
   [/stay connected to two devices simultaneously with smooth switching/gi,'同时连接两台设备，切换流畅'],
   [/connect two devices simultaneously/gi,'可同时连接两台设备'],
   [/switch seamlessly between them/gi,'无缝切换'],
   [/user guide via: https:\/\/www.caniusevia.com\/ game 67 json file/gi,'VIA 使用指南：https://www.caniusevia.com/ · Game 67 JSON 文件'],
   [/quite good when the lights are off/gi,'关灯时效果良好'],
   [/low power consumption/gi,'低功耗'],
   [/without fatigue/gi,'不疲劳'],
   [/all-day wear/gi,'全天佩戴'],
   [/ergonomic design/gi,'人体工学设计'],
   [/double-shot pbt \(ansi\) dye-sub pbt \(iso\)/gi,'双色注塑 PBT（ANSI）热升华 PBT（ISO）'],
   [/dye-sub pbt/gi,'热升华 PBT'],
   [/(\d+) types of rgb backlight options plus endless possibilities/gi,'$1 种 RGB 背光方案，创意无限'],
   [/4-in-1 action keys/gi,'4 合 1 多功能键'],
   [/gateron double-rail magnetic switch/gi,'佳达隆双轨磁轴'],
   [/double-rail magnetic switch/gi,'双轨磁轴'],
   [/yes, compatible with ([a-z0-9 \-]+) only/gi,'支持，仅兼容 $1'],
   [/yes \(max 1k hz report rate\)/gi,'支持（最高 1K Hz 回报率）'],
   [/full cnc machined aluminum/gi,'全 CNC 铝合金'],
   [/backlight shine-through abs keycaps, osa profile \(oem height, sa shape\)/gi,'OSA 高度（OEM 高度、SA 造型）透光 ABS 键帽'],
   [/osa backlight shine-through abs keycaps/gi,'OSA 透光 ABS 键帽'],
   [/osa profile abs backlight shine-through keycaps/gi,'OSA 高度透光 ABS 键帽'],
   [/backlight shine-through abs keycaps/gi,'透光 ABS 键帽'],
   [/shine-through abs keycaps/gi,'透光 ABS 键帽'],
   [/type-c cable \(1.8 m\) \+ type-a to type-c adapter/gi,'Type-C 线（1.8 米）+ Type-A 转 Type-C 适配器'],
   [/seamlessly switch between/gi,'无缝切换'],
   [/gateron sylva switches/gi,'佳达隆 Sylva 轴'],
   [/name phone number email/gi,''],
   [/8k usb-c cable with independent shielding ensures stable, interference-free performance/gi,'8K USB-C 线材独立屏蔽，稳定无干扰'],
   [/measures how frequently movement data is transmitted to the computer/gi,'测量移动数据传送到计算机的频率'],
   [/report rate/gi,'回报率'],
   [/endless possibilities/gi,'创意无限'],
   [/interference-free/gi,'无干扰'],
   [/independent shielding/gi,'独立屏蔽'],
   [/([\d.]+)\.? surround sound/gi,'$1 环绕声'],
   [/([\d.]+) lb \(with cable\)/gi,'$1 磅（含线）'],
   [/custom high-frequency esports-grade chip/gi,'定制高频电竞级芯片'],
   [/non-shine-through/gi,'非透光'],
   [/high-performance glass-like coating/gi,'高性能类玻璃涂层'],
   [/mchose® softlight soft light technology \(about 16 million colors argb\)/gi,'MCHOSE® SOFTLIGHT 柔光技术（约 1600 万色 ARGB）'],
   [/soft light technology/gi,'柔光技术'],
   [/about (\d+)g \(excluding microphone and receiver\)/gi,'约 $1 克（不含麦克风与接收器）'],
   [/\(excluding microphone and receiver\)/gi,'（不含麦克风与接收器）'],
   [/no more than (\d+)h/gi,'不超过 $1 小时'],
   [/(\d+) x aaa batteries \(included\)/gi,'$1 节 AAA 电池（含）'],
   [/(\d+) x aa battery \(included\)/gi,'$1 节 AA 电池（含）'],
   [/99-key design with an integrated numpad in a slim/gi,'99 键配列，含一体式数字区，机身纤薄'],
   [/(\d+) including a side scroll-wheel/gi,'$1 键含侧边滚轮'],
   [/go to web driver/gi,'网页驱动'],
   [/500mah lithium-polymer/gi,'500mAh 锂聚合物'],
   [/palm or claw grip/gi,'趴握或抓握'],
   [/palm,claw or fingertip grip/gi,'趴握、抓握或指握'],
   [/lithium-polymer/gi,'锂聚合物'],
   [/included\)/gi,'含）'],
   [/crystal clear highs, pinpoint mids, and deep bass/gi,'清晰高音、精准中音、深沉低音'],
   [/neodymium magnetic drivers/gi,'钕磁驱动单元'],
   [/hear everything with pro-grade hi-res capable/gi,'专业级高解析度，听见一切细节'],
   [/neodymium/gi,'钕磁'],
   [/hi-res/gi,'高解析度'],
   [/earbuds? charging time/gi,'单只耳机充电时间'],
   [/\.\s*low$/i,'。'],
   [/, earbuds? charging time$/i,'（单只耳机充电时间）'],
   [/earbuds? 充电时间/gi,'单只耳机充电时间'],
   [/, earbuds?$/i,''],
   [/switch two devices for greater convenience and efficiency/gi,'在两台设备间切换，更便捷高效'],
   [/for greater convenience and efficiency/gi,'更便捷高效'],
   [/greater convenience/gi,'更便捷'],
   [/aluminum top plate/gi,'铝制上盖'],
   [/top plate/gi,'上盖'],
   [/abs double-shot/gi,'双色注塑 ABS'],
   [/double-shot pbt/gi,'双色注塑 PBT'],
   [/(\d+) key numpad \+ clickable rotary encoder/gi,'$1 键数字区 + 可点击旋钮'],
   [/(\d+) mechanical keys, including clickable rotary encoder/gi,'$1 个机械键，含可点击旋钮'],
   [/clickable rotary encoder/gi,'可点击旋钮'],
   [/rotary encoder/gi,'旋钮编码器'],
   [/numpad/gi,'数字区'],
   [/premium screw-in stabilizers/gi,'高端螺丝固定卫星轴'],
   [/screw-in pcb stabilizers?/gi,'螺丝固定 PCB 卫星轴'],
   [/screw-in stabilizers?/gi,'螺丝固定卫星轴'],
   [/pcb stabilizers?/gi,'PCB 卫星轴'],
   [/plate-mounted stabilizer/gi,'钢板卫星轴'],
   [/premium mouse feet/gi,'高端鼠标脚贴'],
   [/virtual surround sound/gi,'虚拟环绕声'],
   [/key travel distance:/gi,'键程：'],
   [/tray mount design/gi,'托盘式安装设计'],
   [/detachable type-c to c cable/gi,'可拆卸 Type-C 转 Type-C 线'],
   [/huano silent micro switch/gi,'华诺静音微动'],
   [/silent micro switch/gi,'静音微动'],
   [/micro switch/gi,'微动'],
   [/fully assembled version/gi,'组装完成版'],
   [/fully assembled/gi,'组装完成'],
   [/glorious fox switches/gi,'Glorious Fox 轴'],
   [/glorious bamf 2.0 optical/gi,'Glorious BAMF 2.0 光学'],
   [/performance sensor/gi,'高性能传感器'],
   [/low profile gateron mechanical \/ keychron optical switch/gi,'矮轴佳达隆机械 / Keychron 光轴'],
   [/keychron optical switch/gi,'Keychron 光轴'],
   [/keychron super switch \/ apex switch/gi,'Keychron Super 轴 / Apex 轴'],
   [/keychron ultra-fast lime magnetic switch/gi,'Keychron Ultra-fast Lime 磁轴'],
   [/keychron super mechanical/gi,'Keychron Super 机械'],
   [/keychron k pro mechanical/gi,'Keychron K Pro 机械'],
   [/gateron g pro/gi,'佳达隆 G Pro'],
   [/gateron mechanical/gi,'佳达隆机械'],
   [/(\d+) zones multi-color customization/gi,'$1 区多彩自定义'],
   [/multi-color customization/gi,'多彩自定义'],
   [/zones/gi,'区'],
   [/screw-in pcb stabs/gi,'螺丝固定 PCB 卫星轴'],
   [/full cnc aluminum/gi,'全 CNC 铝合金'],
   [/gasket mount design/gi,'垫片式安装设计'],
   [/keychron ultra-fast lime/gi,'Keychron Ultra-fast Lime'],
   [/hot-swap pcb-pp plate/gi,'热插拔 PCB-PP 定位板'],
   [/ano-jade green\(copper limited edition\)/gi,'阳极氧化玉石绿（铜限量版）'],
   [/ano-champagne gold/gi,'阳极氧化香槟金'],
   [/limited edition/gi,'限量版'],
   [/hot-swap/gi,'热插拔'],
   [/small to medium/gi,'小到中'],
   [/self-developed m hub \(web driver \/ app driver\)/gi,'自研 M HUB（网页驱动 / App 驱动）'],
   [/ttc gold wheel encoder/gi,'TTC 金轮编码器'],
   [/all-new architecture upgrade/gi,'全新架构升级'],
   [/web driver/gi,'网页驱动'],
   [/app driver/gi,'App 驱动'],
   [/medium to large hand/gi,'中到大手'],
   [/medium to large/gi,'中大'],
   [/super glide coating/gi,'超级顺滑涂层'],
   [/glide coating/gi,'顺滑涂层'],
   [/iceflow glacier coating/gi,'ICEFLOW 冰河涂层'],
   [/glacier coating/gi,'冰河涂层'],
   [/ice blue magnetic switch/gi,'冰蓝磁轴'],
   [/custom hall effect sensor/gi,'定制霍尔传感器'],
   [/new-gen hall effect sensor \(selected variant\)/gi,'新一代霍尔传感器（特定版本）'],
   [/hall effect sensor/gi,'霍尔传感器'],
   [/selected variant/gi,'特定版本'],
   [/fully in-house m hub software \(web version \/ desktop client\)/gi,'全自研 M HUB 软件（网页版 / 桌面客户端）'],
   [/desktop client/gi,'桌面客户端'],
   [/gateron magnetic jade pro switch/gi,'佳达隆磁玉 Pro 轴'],
   [/magnetic jade pro/gi,'磁玉 Pro'],
   [/single-core mcu/gi,'单核 MCU'],
   [/two-layer pcbs/gi,'双层 PCB'],
   [/kailh magnetic god switch/gi,'凯华磁神轴'],
   [/high-performance chipset/gi,'高性能芯片组'],
   [/ttc silver wheel/gi,'TTC 银轮'],
   [/ttc gold encoder/gi,'TTC 金编码器'],
   [/starburst magnetic switch/gi,'星爆磁轴'],
   [/pbt backlit keycaps/gi,'PBT 透光键帽'],
   [/backlit keycaps/gi,'透光键帽'],
   [/fully self-developed (\d+) major music rhythms/gi,'全自研 $1 大音乐律动'],
   [/music rhythms/gi,'音乐律动'],
   [/mchose shadow hunter performance platform/gi,'MCHOSE 暗影猎手性能平台'],
   [/shadow hunter/gi,'暗影猎手'],
   [/([\d,]+)\+ fps full-range tracking/gi,'$1+ FPS 全范围追踪'],
   [/full-range tracking/gi,'全范围追踪'],
   [/super glide glass-like coating/gi,'超级顺滑类玻璃涂层'],
   [/linear operating force: (\d+)±(\d+)gf pre travel:/gi,'线性触发力度：$1±$2gf · 预行程：'],
   [/operating force/gi,'触发力度'],
   [/pre travel:/gi,'预行程：'],
   [/glass-like coating/gi,'类玻璃涂层'],
   [/pc flex-cut/gi,'PC 柔性切割定位板'],
   [/pure ptfe glides/gi,'纯特氟龙脚贴'],
   [/ptfe glides/gi,'特氟龙脚贴'],
   [/lightning magnetic switch/gi,'闪电磁轴'],
   [/cotton sandwich pad \+ fiber switch pad \+ pet film \+ bottom cotton \+ silicone gasket/gi,'消音棉夹层 + 纤维轴垫 + PET 膜 + 底部棉 + 硅胶垫片'],
   [/sandwich pad/gi,'夹层垫'],
   [/switch pad/gi,'轴垫'],
   [/bottom cotton/gi,'底部棉'],
   [/silicone gasket/gi,'硅胶垫片'],
   [/right-handed ergonomic/gi,'右手人体工学'],
   [/ttc silver encoder/gi,'TTC 银编码器'],
   [/rgb magnetic charging base station/gi,'RGB 磁吸充电底座'],
   [/charging base station/gi,'充电底座'],
   [/multi-position 90° swivel ear cups/gi,'多角度 90° 旋转耳罩'],
   [/swivel ear cups/gi,'旋转耳罩'],
   [/ice-cooling protein leather/gi,'冰感蛋白皮'],
   [/protein leather/gi,'蛋白皮'],
   [/m hub driver \(desktop app\)/gi,'M HUB 驱动（桌面 App）'],
   [/desktop app/gi,'桌面 App'],
   [/click to download/gi,'点击下载'],
   [/full-key rollover \(nkro\)/gi,'全键无冲（NKRO）'],
   [/full-key rollover/gi,'全键无冲'],
   [/pbt double-shot keycaps/gi,'双色注塑 PBT 键帽'],
   [/16m per-key rgb/gi,'1600 万色每键 RGB'],
   [/16.8m per-key rgb/gi,'1680 万色每键 RGB'],
   [/per-key rgb/gi,'每键 RGB'],
   [/kailh custom mint low-profile linear switch/gi,'凯华定制薄荷矮线性轴'],
   [/low-profile linear switch/gi,'矮线性轴'],
   [/linear switch/gi,'线性轴'],
   [/gasket structure with creamy sound/gi,'垫片结构，声音绵密'],
   [/creamy sound/gi,'声音绵密'],
   [/gasket structure/gi,'垫片结构'],
   [/per-key/gi,'每键'],
   [/100-million mechanical switch/gi,'1 亿次机械微动'],
   [/120-million optical switch/gi,'1.2 亿次光微动'],
   [/(\d+)-million mechanical switch/gi,'$1 亿次机械微动'],
   [/(\d+)-million optical switch/gi,'$1 亿次光微动'],
   [/omron mechanical switch/gi,'欧姆龙机械微动'],
   [/retractable razer™ hyperclear super wideband mic/gi,'可伸缩 Razer™ HyperClear 超宽带麦克风'],
   [/hyperclear super wideband mic/gi,'HyperClear 超宽带麦克风'],
   [/super wideband/gi,'超宽带'],
   [/thx spatial audio/gi,'THX 空间音频'],
   [/spatial audio/gi,'空间音频'],
   [/razer focus pro (\d+)k optical sensor gen-(\d+)/gi,'Razer Focus Pro $1K 光学传感器 Gen-$2'],
   [/optical sensor/gi,'光学传感器'],
   [/mechanical switch/gi,'机械轴'],
   [/user guide via guide ansi: magi75 json file magi75 software magi96 json file magi96 software/gi,'VIA 使用指南（ANSI）：Magi75 JSON 文件、Magi75 软件、Magi96 JSON 文件、Magi96 软件'],
   [/user guide via guide ansi: magi75\/75 pro json file magi75\/75 pro software magi96\/96 pro json file magi96\/96 pro software/gi,'VIA 使用指南（ANSI）：Magi75/75 Pro JSON 文件、Magi75/75 Pro 软件、Magi96/96 Pro JSON 文件、Magi96/96 Pro 软件'],
   [/user guide via guide ansi:/gi,'VIA 使用指南（ANSI）：'],
   [/json file/gi,'JSON 文件'],
   [/software/gi,'软件'],
   [/seamlessly switch between two devices for greater convenience and efficiency/gi,'两台设备间无缝切换，便捷高效'],
   [/two devices for greater convenience and efficiency/gi,'两台设备，便捷高效'],
   [/for greater convenience and efficiency/gi,'便捷高效'],
   [/seamlessly connect two devices/gi,'无缝连接两台设备'],
   [/greater convenience/gi,'更高便利'],
   [/\btwo devices\b/gi,'两台设备'],
   [/\bconvenience and efficiency\b/gi,'便捷高效']
  ];
  for(const [re,to] of sentenceRules){out=out.replace(re,to)}
  const replacements=[
   ['open case self-pairing','开盖自动配对'],['neckband earphones','颈挂式耳机'],['press the button','按键操作'],['semi-in-ear','半入耳式'],['open-ear','开放式'],['open ear','开放式'],['over-ear','包耳式'],['over ear','包耳式'],['on-ear','贴耳式'],['on ear','贴耳式'],['in-ear','入耳式'],['in ear','入耳式'],['clip on','耳夹式'],['built-in','内置'],['external microphone','外置麦克风'],['active noise cancellation','主动降噪'],['noise cancellation','降噪'],['low-latency mode','低延迟模式'],['battery life','续航'],['charging case','充电仓'],['charging dock','充电底座'],['mechanical switches','机械轴'],['optical switches','光微动'],['hall-effect switches','磁轴'],['hot-swappable','支持热插拔'],['aluminum alloy','铝合金'],['magnesium alloy','镁合金'],['carbon fiber','碳纤维'],['south-facing','南向'],['north-facing','北向'],['backlight off','关闭背光'],['minimum brightness','最低亮度'],['up to','最高'],['not supported','不支持'],['supported','支持'],['tri-mode','三模'],['dual-mode','双模'],['wireless','无线'],['wired','有线'],['bluetooth','蓝牙'],['adaptive','自适应'],['touch','触控'],['button','按键'],['hours','小时'],['black','黑色'],['white','白色'],['gray','灰色'],['red','红色'],['minutes','分钟'],['seconds','秒'],['grams','克'],['gram','克'],['mm','毫米'],['cm','厘米'],['inches','英寸'],['inch','英寸'],['meters','米'],['meter','米'],['no support','不支持'],['supports','支持'],['single earbud','单只耳机']
  ];
  replacements.forEach(([from,to])=>{out=out.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),to)});
 }
 if(LANG==='en'){
  const replacements=[
   ['官网产品页已确认/参数待复核','Official product page confirmed / specs pending review'],['在售/历史状态待核实','Available / legacy status pending review'],['在售/官方可确认','Available / confirmed on official site'],['在售/官方支持页有效','Available / official support page active'],['在售/官网可确认','Available / confirmed on official site'],['官网可确认/待复核','Official page confirmed / pending review'],['未核实/不支持','Unverified / not supported'],
   ['蓝牙最多3台','Bluetooth, up to 3 devices'],['背光关闭','backlight off'],['背光关','backlight off'],['RGB最低亮度','RGB at minimum brightness'],['最低亮度','minimum brightness'],['最高','Up to '],['左右键','left/right buttons'],['磁吸充电','magnetic charging'],['充电底座','charging dock'],['充电仓','charging case'],['自适应','adaptive'],['主动降噪','active noise cancellation'],['低延迟模式','low-latency mode'],['空间音效','spatial audio'],['虚拟环绕','virtual surround'],['降噪','noise cancellation'],['光微动','optical switches'],['机械微动','mechanical switches'],['磁轴','Hall-effect switches'],['机械轴','mechanical switches'],['热插拔','hot-swappable'],['铝合金','aluminum alloy'],['镁合金','magnesium alloy'],['碳纤维','carbon fiber'],['丝膜复合','composite silk diaphragm'],['丝膜','silk diaphragm'],['玻纤','fiberglass'],['南向','south-facing'],['北向','north-facing'],['无线','wireless'],['有线','wired'],['蓝牙','Bluetooth'],['三模','tri-mode'],['双模','dual-mode'],['最多','up to '],['约','approx. '],['支持','Supports'],['不支持','Not supported'],['无','None'],['有','Yes'],['台',' devices'],['小时',' hours'],['黑色','Black'],['白色','White'],['灰色','Gray'],['红色','Red'],['（',' ('],['）',')'],['，',', ']
  ];
  replacements.forEach(([from,to])=>{out=out.replaceAll(from,to)});
 }
 return out;
}
function originLabel(value){return value==='中国'?t('china'):value==='海外'?t('overseas'):valueLabel(value)}
function sourceTypeLabel(value){return value==='official_cn_product'?t('officialCnProduct'):value==='official_product'?t('officialProduct'):value||t('officialProduct')}
const JUNK_SPEC_KEY=/(add to cart|unit price|price|reviews?|contact|data sheet|spec sheet|product name|package|packing list|what.?s in the box|included accessories|energy efficiency|sustainable impact|network interface|memory slots?|processor|graphics|storage|expansion slots?|external i\/o|system fan|security management|model|product|shipped from|hongkong|^us$|user guide|faq|specification name|^included$|звычайная цана|адпускная цана|цана за адзінку|also included|^macro$|^disabled$|^setting$|^switching$|^scenario$|^enabled$|^feature$|^specification$|^total$|play once|repeat while pressed|toggle repeat|number of levels|x\/y axis|office work|general use|fps games|high-resolution displays|general gaming|competitive fps gaming|lower value|higher value|lod setting|^smoother\s|^\d+\.|^recommended for|^function type$|^mouse functions$|^keyboard mapping$|^system functions$|^slight increase in input latency|^mode$|^sensor fps$|^\d+(\.\d+)?(\s*(mm|hz|khz|g|db|ips))?$)/i;
function lowConfidenceField(p,key,value){
 const proof=p.spec_evidence?.[key],confidence=Number(p.verification?.confidence||0);
 return confidence<0.85||!proof||proof.value!==value||!proof.source_url;
}
function displaySpecEntries(p){
 const output=[],seen=new Set();
 Object.entries(p.specs||{}).forEach(([key,value])=>{
   if(value===null||value===''||value==='—'||key==='原分类')return;
   if(key==='参数状态'){
     const suffix=LANG==='zh-CN'?'（'+t('unverified')+'）':' ('+t('unverified')+')';
     output.push({key,label:t('specStatus'),value:(LANG==='zh-CN'?String(value):t('specPending'))+suffix,order:998});
     return;
   }
   const id=specId(key),canonical=id?SPEC_BY_ID.get(id)?.[1]:'';
   if(!id&&(key.length>55||String(value).length>220||JUNK_SPEC_KEY.test(key)))return;
   const identity=id||normalizeSpecKey(key);if(seen.has(identity))return;seen.add(identity);
   const suffix=lowConfidenceField(p,key,value)?(LANG==='zh-CN'?'（'+t('unverified')+'）':' ('+t('unverified')+')'):'';
   output.push({key,label:specLabel(key),value:valueLabel(value)+suffix,order:(FILTERS[p.category]?.priority_fields||[]).indexOf(canonical||key)});
 });
 if(!output.length){
   const suffix=LANG==='zh-CN'?'（'+t('unverified')+'）':' ('+t('unverified')+')';
   output.push({key:'参数状态',label:t('specStatus'),value:t('specPending')+suffix,order:998});
 }
 return output.sort((a,b)=>(a.order<0?999:a.order)-(b.order<0?999:b.order));
}
function applyLanguage(){
 document.documentElement.lang=LANG; $('#languageSwitch').value=LANG;
 document.querySelectorAll('[data-i18n]').forEach(e=>e.textContent=t(e.dataset.i18n));
 document.querySelectorAll('[data-i18n-placeholder]').forEach(e=>e.placeholder=t(e.dataset.i18nPlaceholder));
}
function brandLabel(p){const zh=p.brand_zh_cn||p.brand;return LANG==='zh-CN'?(zh===p.brand?zh:`${zh}（${p.brand}）`):(zh===p.brand?p.brand:`${p.brand} (${zh})`)}
function categoryLabel(value){const map={'鼠标':['鼠标','Mouse'],'键盘':['键盘','Keyboard'],'耳机/耳麦':['耳机/耳麦','Headphones / headsets'],'待分类':['待分类','Unclassified'],'手柄':['手柄','Gamepad / Controller'],'配件':['配件','Accessories'],'鼠标垫':['鼠标垫','Mouse pad'],'声卡':['声卡','Sound card / DAC'],'航插线':['航插线','Aviation connector cable'],'外设收纳包':['外设收纳包','Peripheral carry bag'],'音箱/音响':['音箱/音响','Speaker / Soundbar'],'TWS':['真无线耳机','True wireless earbuds'],'三模机械键盘':['三模机械键盘','Tri-mode mechanical keyboard'],'入耳式电竞耳机':['入耳式电竞耳机','In-ear gaming headphones'],'全铝磁轴键盘':['全铝磁轴键盘','Aluminum Hall-effect keyboard'],'复古头戴':['复古头戴式耳机','Retro over-ear headphones'],'头戴式蓝牙':['头戴式蓝牙','Over-ear Bluetooth'],'客制化机械键盘':['客制化机械键盘','Custom mechanical keyboard'],'开放式/耳夹':['开放式/耳夹耳机','Open-ear / ear-clip headphones'],'无线游戏耳麦':['无线游戏耳麦','Wireless gaming headset'],'无线游戏鼠标':['无线游戏鼠标','Wireless gaming mouse'],'无线电竞鼠标':['无线电竞鼠标','Wireless esports mouse'],'有线游戏/监听':['有线游戏/监听耳机','Wired gaming / monitor headphones'],'有线耳塞':['有线耳塞','Wired earbuds'],'机械键盘':['机械键盘','Mechanical keyboard'],'游戏机械键盘':['游戏机械键盘','Gaming mechanical keyboard'],'游戏耳机':['游戏耳机','Gaming headphones'],'游戏耳麦':['游戏耳麦','Gaming headset'],'电竞耳机':['电竞耳机','Esports headphones'],'电竞鼠标':['电竞鼠标','Esports mouse'],'睡眠':['睡眠耳机','Sleep headphones'],'碳纤维电竞鼠标':['碳纤维电竞鼠标','Carbon-fiber esports mouse'],'磁轴游戏键盘':['磁轴游戏键盘','Hall-effect gaming keyboard'],'磁轴键盘':['磁轴键盘','Hall-effect keyboard'],'自动发现':['自动分类','Auto-classified'],'镁合金无线电竞鼠标':['镁合金无线电竞鼠标','Magnesium wireless esports mouse']};return map[value]?.[LANG==='zh-CN'?0:1]||value}
applyLanguage();
$('#languageSwitch').addEventListener('change',e=>{LANG=e.target.value;localStorage.setItem('peripheraldb-language',LANG);applyLanguage();populateFilters();render();renderDiscovery();if(CURRENT_DETAIL&&detail.open)openDetail(CURRENT_DETAIL);if(compareDialog.open)openCompare()});

const APP_VERSION='1.3.2';
Promise.all([
 fetch('data/products_meta.json?v='+APP_VERSION).then(r=>r.json()).catch(()=>null),
 fetch('data/filter_schema.json?v='+APP_VERSION).then(r=>r.json()),
 fetch('data/brand_discovery_report.json?ts='+Date.now()).then(r=>r.json()).catch(()=>null),
 fetch('data/brand_candidates.json?ts='+Date.now()).then(r=>r.json()).catch(()=>[])
]).then(([meta,f,discoveryReport,brandCandidates])=>{
 const files=meta?.files?Object.values(meta.files):['products.json'];
 return Promise.all(files.map(fn=>fetch('data/'+fn+(fn==='products.json'?'?ts='+Date.now():'?v='+encodeURIComponent(meta.version||''))).then(r=>r.json()))).then(parts=>[parts.flatMap(x=>x.products||[]),f,discoveryReport,brandCandidates,meta]);
}).then(([products,f,discoveryReport,brandCandidates,meta])=>{
 window.DISCOVERY_REPORT=discoveryReport; window.BRAND_CANDIDATES=brandCandidates;
 DB=products; FILTERS=f; UPDATED_AT=(meta&&meta.updated_at)||'—'; $('#updated').textContent=t('updated')+UPDATED_AT; $('#total').textContent=DB.length;
 populateFilters(); const brands=[...new Set(DB.map(x=>x.brand))], cats=[...new Set(DB.map(x=>x.category))];
 $('#brands').textContent=brands.length; $('#cats').textContent=cats.length;
 $('#verifiedCount').textContent=DB.filter(x=>x.verification?.status==='official_verified').length;
 applyStateFromHash();
 renderDiscovery();
});
function stateFromHash(){
 const out={q:'',brand:'全部',cat:'全部',origin:'全部',verify:'全部',sort:'brand',mode:'single',kw:[],sel:[]};
 try{
  const h=decodeURIComponent((location.hash||'').replace(/^#/,''));
  if(!h)return out;
  new URLSearchParams(h).forEach((v,k)=>{
   if(k==='q')out.q=v;
   else if(k==='brand')out.brand=v;
   else if(k==='cat')out.cat=v;
   else if(k==='origin')out.origin=v;
   else if(k==='verify')out.verify=v;
   else if(k==='sort')out.sort=v;
   else if(k==='mode')out.mode=v;
   else if(k==='kw')out.kw=v.split(',').filter(Boolean);
   else if(k==='sel')out.sel=v.split(',').filter(Boolean);
  });
 }catch(e){}
 return out;
}
function applyStateFromHash(){
 const s=stateFromHash();
 $('#search').value=s.q;
 if([...$('#brandFilter').options].some(o=>o.value===s.brand))$('#brandFilter').value=s.brand;
 if([...$('#catFilter').options].some(o=>o.value===s.cat))$('#catFilter').value=s.cat;
 if([...$('#originFilter').options].some(o=>o.value===s.origin))$('#originFilter').value=s.origin;
 if([...$('#verifyFilter').options].some(o=>o.value===s.verify))$('#verifyFilter').value=s.verify;
 if([...$('#sort').options].some(o=>o.value===s.sort))$('#sort').value=s.sort;
 if([...$('#keywordMode').options].some(o=>o.value===s.mode))$('#keywordMode').value=s.mode;
 selectedKeywords=new Set(s.kw);
 selected=new Set(s.sel);
 rebuildKeywords();
 render();
}
function saveStateToHash(push){
 const s=new URLSearchParams();
 const q=$('#search').value.trim();
 if(q)s.set('q',q);
 if($('#brandFilter').value!=='全部')s.set('brand',$('#brandFilter').value);
 if($('#catFilter').value!=='全部')s.set('cat',$('#catFilter').value);
 if($('#originFilter').value!=='全部')s.set('origin',$('#originFilter').value);
 if($('#verifyFilter').value!=='全部')s.set('verify',$('#verifyFilter').value);
 if($('#sort').value!=='brand')s.set('sort',$('#sort').value);
 if($('#keywordMode').value!=='single')s.set('mode',$('#keywordMode').value);
 if(selectedKeywords.size)s.set('kw',[...selectedKeywords].join(','));
 if(selected.size)s.set('sel',[...selected].join(','));
 const hash='#'+s.toString();
 try{ history[(push?'push':'replace')+'State'](null,'',hash); }catch(e){ try{location.hash=hash}catch(_){} }
}
window.addEventListener('hashchange',applyStateFromHash);
function populateFilters(){
 const brandValue=$('#brandFilter').value||'全部',catValue=$('#catFilter').value||'全部';
 $('#brandFilter').innerHTML=`<option value="全部">${t('allBrands')}</option>`;
 [...new Set(DB.map(x=>x.brand))].sort().forEach(brand=>{const p=DB.find(x=>x.brand===brand);$('#brandFilter').add(new Option(brandLabel(p),brand))});
 $('#catFilter').innerHTML=`<option value="全部">${t('allCategories')}</option>`;
 [...new Set(DB.map(x=>x.category))].sort().forEach(cat=>$('#catFilter').add(new Option(categoryLabel(cat),cat)));
 $('#brandFilter').value=brandValue;$('#catFilter').value=catValue;
 $('#updated').textContent=DB.length?t('updated')+UPDATED_AT:t('loadingDiscovery');
}
function renderDiscovery(){
 const r=window.DISCOVERY_REPORT;
 if(r){const sep=LANG==='zh-CN'?'，':', ';$('#discoverySummary').textContent=`${r.date}: ${t('discoveryNew')} ${r.new_candidates||0}${sep}${t('autoAdded')} ${r.auto_promoted||0}${sep}${t('sitesChecked')} ${r.candidate_sites_checked||0}`;$('#discoveryProvider').textContent=`${t('searchSource')}: ${r.provider||'—'} · ${t('searchResults')} ${r.results_scanned||0}`}
}
['#search','#brandFilter','#originFilter','#verifyFilter','#sort'].forEach(s=>$(s).addEventListener(s==='#search'?'input':'change',()=>{render();saveStateToHash(s==='#search'?false:true)}));
$('#catFilter').addEventListener('change',()=>{selectedKeywords.clear();rebuildKeywords();render();saveStateToHash(true)});
$('#keywordMode').addEventListener('change',()=>{if($('#keywordMode').value==='single'&&selectedKeywords.size>1)selectedKeywords=new Set([[...selectedKeywords][0]]);rebuildKeywords();render();saveStateToHash(true)});
$('#clearKeywords').onclick=()=>{selectedKeywords.clear();rebuildKeywords();render();saveStateToHash(true)};
$('#clearCompare').onclick=()=>{selected.clear();render();syncCompare();saveStateToHash(true)};
$('#doCompare').onclick=openCompare;

function fallback(cat){return cat==='鼠标'?'assets/mouse.svg':cat==='键盘'?'assets/keyboard.svg':'assets/headset.svg'}
function img(p){
 const raw=String(p.image_url||'').trim();
 if(!/^https?:\/\//i.test(raw))return fallback(p.category);
 return raw.replace(/^http:\/\//i,'https://');
}
function imageMarkup(p,kind='productimg'){
 const missing=!p.image_url;
 return `<div class="imagewrap ${missing?'is-placeholder':''}"><img class="${kind}" src="${esc(img(p))}" alt="${esc(brandLabel(p)+' '+p.name)}" loading="lazy" referrerpolicy="no-referrer"><span class="imagebadge">${esc(t('noImage'))}</span></div>`;
}
function bindImageFallback(root,p){
 const wrap=root.querySelector('.imagewrap'),image=wrap?.querySelector('img');if(!wrap||!image)return;
 image.addEventListener('error',()=>{if(image.dataset.failed)return;image.dataset.failed='1';image.src=fallback(p.category);wrap.classList.add('is-placeholder')});
}
function searchable(p){return [p.brand,p.brand_zh_cn,p.name,p.category,p.subcategory,p.status,p.origin,...Object.entries(p.specs||{}).flat()].join(' ').toLowerCase()}
function verificationLabel(p){
 const s=p.verification?.status||'official_discovered';
 if(s==='official_verified')return [t('verified'),'good'];
 if(s==='conflict')return [t('conflictReview'),'conflict'];
 if(s==='corroborated')return [t('corroborated'),'good'];
 if(s==='legacy_review_required'||p.verification?.quality_gate_version==='legacy')return [t('legacy'),'conflict'];
 return [t('discovered'),''];
}
function rebuildKeywords(){
 const cat=$('#catFilter').value, spec=FILTERS[cat]||FILTERS['待分类'];
 $('#search').placeholder=cat==='全部'?t('searchPlaceholder'):(LANG==='zh-CN'?spec.placeholder:t('searchPlaceholder'));
 const terms=cat==='全部'?['PAW3950','8000Hz','≤60g','磁轴','Rapid Trigger','热插拔','LDAC','ANC','2.4GHz','三模']:(spec.keywords||[]);
 const box=$('#quick');box.innerHTML='';
 terms.forEach(t=>{let b=document.createElement('button');b.textContent=t;b.classList.toggle('active',selectedKeywords.has(t));b.onclick=()=>{
   const mode=$('#keywordMode').value;
   if(mode==='single'){selectedKeywords.clear();selectedKeywords.add(t)}
   else selectedKeywords.has(t)?selectedKeywords.delete(t):selectedKeywords.add(t);
   rebuildKeywords();render();saveStateToHash(true)
 };box.appendChild(b)})
}
function parseNum(s,unit){const m=String(s||'').replace(/,/g,'').match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*'+unit,'i'));return m?parseFloat(m[1]):null}
function keywordMatch(p,k){
 const blob=searchable(p);
 if(k.startsWith('≤')&&k.endsWith('g')){const limit=parseFloat(k.replace(/[^\d.]/g,'')),w=parseNum(p.specs?.['重量'],'g');return w!==null&&w<=limit}
 if(k.endsWith('h+')){const limit=parseFloat(k), text=String(p.specs?.['续航']||''); const vals=[...text.matchAll(/(\d+(?:\.\d+)?)\s*h/gi)].map(x=>parseFloat(x[1]));return vals.some(x=>x>=limit)}
 if(k.startsWith('≤')&&k.endsWith('ms')){const limit=parseFloat(k.replace(/[^\d.]/g,'')),v=parseNum(p.specs?.['延迟'],'ms');return v!==null&&v<=limit}
 return blob.includes(k.toLowerCase());
}
function keywordSetMatch(p){
 const ks=[...selectedKeywords];if(!ks.length)return true;
 const mode=$('#keywordMode').value;
 if(mode==='or')return ks.some(k=>keywordMatch(p,k));
 return ks.every(k=>keywordMatch(p,k));
}
function render(){
 const q=$('#search').value.trim().toLowerCase(),b=$('#brandFilter').value,c=$('#catFilter').value,o=$('#originFilter').value,v=$('#verifyFilter').value;
 let rows=DB.filter(p=>(b==='全部'||p.brand===b)&&(c==='全部'||p.category===c)&&(o==='全部'||p.origin===o)&&
   (v==='全部'||p.verification?.status===v)&&(!q||searchable(p).includes(q))&&keywordSetMatch(p));
 rows.sort((a,z)=>$('#sort').value==='name'?a.name.localeCompare(z.name):$('#sort').value==='verified'?
   ((z.verification?.confidence||0)-(a.verification?.confidence||0)):(`${a.brand}${a.name}`).localeCompare(`${z.brand}${z.name}`));
 $('#count').textContent=rows.length;$('#empty').classList.toggle('hidden',!!rows.length);grid.innerHTML='';
 rows.forEach(p=>{
  const key=id(p),e=document.createElement('article');e.className='card';
  const entries=displaySpecEntries(p);
  const [vl,vc]=verificationLabel(p);
  e.innerHTML=`${imageMarkup(p)}
  <div class="cardbody"><div class="topline"><span class="brand">${esc(brandLabel(p))}</span><span class="sub">${esc(categoryLabel(p.subcategory||p.category))}</span></div>
  <h3>${esc(p.name)}</h3><span class="verify ${vc}">● ${esc(vl)} · ${Math.round((p.verification?.confidence||0)*100)}%</span>
  <div class="chips">${entries.slice(0,6).map(x=>`<span class="chip">${esc(x.label)}: ${esc(x.value)}</span>`).join('')}</div>
  ${p.conflict?`<div class="warn">⚠ ${esc(valueLabel(p.conflict))}</div>`:''}
  <div class="actions"><button class="details">${t('details')}</button><label class="comparecheck"><input type="checkbox" ${selected.has(key)?'checked':''}> ${t('compareLabel')}</label></div></div>`;
  bindImageFallback(e,p);
  e.querySelector('.details').onclick=()=>openDetail(p);
  e.querySelector('input').onchange=ev=>toggleCompare(p,ev.target.checked);grid.appendChild(e)
 });syncCompare()
}
function id(p){return p.brand+'::'+p.name}
function toggleCompare(p,on){const key=id(p);if(on){if(selected.size>=20){alert(t('maxTwenty'));render();return}selected.add(key)}else selected.delete(key);syncCompare();saveStateToHash(true)}
function syncCompare(){$('#compareBar').classList.toggle('hidden',!selected.size);$('#compareCount').textContent=selected.size;$('#compareNames').textContent=[...selected].map(x=>x.split('::')[1]).join(' · ')}
function openDetail(p){
 CURRENT_DETAIL=p;
 const [vl,vc]=verificationLabel(p), rows=displaySpecEntries(p).map(x=>`<div class="row"><small>${esc(x.label)}</small><b>${esc(x.value)}</b></div>`).join('');
 const sources=(p.sources||[]).map(s=>`<a class="source" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(sourceTypeLabel(s.type))} · ${esc(t('sourceWeight'))} ${esc(s.tier||'—')} · ${esc(s.checked_at||t('legacy'))} ↗</a>`).join('');
 $('#detailBody').innerHTML=`<div class="detailhead">${imageMarkup(p,'detailimg')}
 <div><span class="brand">${esc(brandLabel(p))} · ${esc(categoryLabel(p.category))} · ${esc(originLabel(p.origin||'—'))}</span><h2>${esc(p.name)}</h2><span class="verify ${vc}">● ${esc(vl)} · ${t('confidence')} ${Math.round((p.verification?.confidence||0)*100)}%</span>
 <p class="sub">${esc(t('productStatus'))}: ${esc(valueLabel(p.status))} · ${t('recentCheck')} ${esc(p.last_checked||p.last_verified||'—')}</p></div></div>
 <div class="detailgrid">${rows}</div>${p.conflict?`<p class="warn">⚠ ${esc(valueLabel(p.conflict))}</p>`:''}
 <div class="sourcelist"><b>${t('sources')}</b>${sources||`<p class="sub">${t('noSources')}</p>`}</div>`;
 bindImageFallback($('#detailBody'),p);if(!detail.open)detail.showModal()
}
function openCompare(){
 const ps=DB.filter(p=>selected.has(id(p)));if(ps.length<2){alert(t('atLeastTwo'));return}
 const canonicalKeys=[...new Set(ps.flatMap(p=>displaySpecEntries(p).map(x=>specId(x.key)||normalizeSpecKey(x.key))))];
 const values=new Map(ps.map(p=>[id(p),new Map(displaySpecEntries(p).map(x=>[specId(x.key)||normalizeSpecKey(x.key),x]))]));
 $('#compareBody').innerHTML=`<h2>${t('compareTitle')} (${ps.length})</h2><div class="comparewrap"><table class="comparetable"><thead><tr><th>${t('parameter')}</th>${ps.map(p=>`<th>${esc(brandLabel(p))}<br><b>${esc(p.name)}</b></th>`).join('')}</tr></thead>
 <tbody>${canonicalKeys.map(k=>{const first=ps.map(p=>values.get(id(p)).get(k)).find(Boolean);return `<tr><td>${esc(first?.label||k)}</td>${ps.map(p=>`<td>${esc(values.get(id(p)).get(k)?.value||'—')}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;if(!compareDialog.open)compareDialog.showModal()
}

const candidateDialog=document.querySelector('#candidateDialog');
const openCandidates=document.querySelector('#openCandidates');
if(openCandidates) openCandidates.onclick=()=>{
 const rows=(window.BRAND_CANDIDATES||[]).slice().sort((a,b)=>(b.score||0)-(a.score||0));
 const active=rows.filter(x=>x.status!=='rejected');
 document.querySelector('#candidateBody').innerHTML=`<h2>${t('candidateTitle')}</h2>
 <p class="sub">${t('candidateDesc')}</p>
 ${active.length?active.map(c=>`<div class="candidate">
   <h3>${esc(c.brand||c.domain)} <span class="score">${c.score||0}/100</span></h3>
   <div class="candidate-meta">${esc(c.domain)} · ${esc(c.status||'candidate')} · ${t('productPages')} ${c.product_page_count||0} · ${t('structuredPages')} ${c.product_schema_page_count||0} · ${esc((c.categories||[]).map(categoryLabel).join(' / ')||t('unclassified'))}</div>
   <a href="${esc(c.official_url)}" target="_blank" rel="noopener">${t('visitOfficial')}</a>
 </div>`).join(''):`<p>${t('noCandidates')}</p>`}`;
 candidateDialog.showModal();
};

const brandSearchEl=document.querySelector('#brandSearch');
const brandLocalSearch=document.querySelector('#brandLocalSearch');
const brandResult=document.querySelector('#brandSearchResult');
if(brandLocalSearch) brandLocalSearch.onclick=()=>{
 const q=(brandSearchEl?.value||'').trim().toLowerCase();
 if(!q){brandResult.textContent=t('enterBrand');return}
 const brands=[...new Set(DB.map(p=>p.brand))];
 const searchName=b=>{const p=DB.find(x=>x.brand===b);return `${b} ${p?.brand_zh_cn||''}`.toLowerCase()};
 const exact=brands.filter(b=>searchName(b).split(' ').includes(q));
 const fuzzy=brands.filter(b=>searchName(b).includes(q)&&!exact.includes(b));
 const matches=[...exact,...fuzzy];
 if(matches.length){
   const counts=matches.map(b=>{const p=DB.find(x=>x.brand===b);return `${brandLabel(p)} (${DB.filter(x=>x.brand===b).length})`});
   brandResult.innerHTML=`${t('databaseHas')}<b>${counts.map(esc).join(' · ')}</b>${LANG==='zh-CN'?'。':'. '}${t('missingHint')}`;
 }else{
   brandResult.innerHTML=`${t('databaseMissing')} <b>${esc(brandSearchEl.value)}</b>${LANG==='zh-CN'?'。':'. '}${t('missingHint')}`;
 }
};
