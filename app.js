
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
'case dimensions':'充电仓尺寸','bottom case material':'底部外壳材质',
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
function categoryLabel(value){const map={'鼠标':['鼠标','Mouse'],'键盘':['键盘','Keyboard'],'耳机/耳麦':['耳机/耳麦','Headphones / headsets'],'待分类':['待分类','Unclassified'],'TWS':['真无线耳机','True wireless earbuds'],'三模机械键盘':['三模机械键盘','Tri-mode mechanical keyboard'],'入耳式电竞耳机':['入耳式电竞耳机','In-ear gaming headphones'],'全铝磁轴键盘':['全铝磁轴键盘','Aluminum Hall-effect keyboard'],'复古头戴':['复古头戴式耳机','Retro over-ear headphones'],'头戴式蓝牙':['头戴式蓝牙','Over-ear Bluetooth'],'客制化机械键盘':['客制化机械键盘','Custom mechanical keyboard'],'开放式/耳夹':['开放式/耳夹耳机','Open-ear / ear-clip headphones'],'无线游戏耳麦':['无线游戏耳麦','Wireless gaming headset'],'无线游戏鼠标':['无线游戏鼠标','Wireless gaming mouse'],'无线电竞鼠标':['无线电竞鼠标','Wireless esports mouse'],'有线游戏/监听':['有线游戏/监听耳机','Wired gaming / monitor headphones'],'有线耳塞':['有线耳塞','Wired earbuds'],'机械键盘':['机械键盘','Mechanical keyboard'],'游戏机械键盘':['游戏机械键盘','Gaming mechanical keyboard'],'游戏耳机':['游戏耳机','Gaming headphones'],'游戏耳麦':['游戏耳麦','Gaming headset'],'电竞耳机':['电竞耳机','Esports headphones'],'电竞鼠标':['电竞鼠标','Esports mouse'],'睡眠':['睡眠耳机','Sleep headphones'],'碳纤维电竞鼠标':['碳纤维电竞鼠标','Carbon-fiber esports mouse'],'磁轴游戏键盘':['磁轴游戏键盘','Hall-effect gaming keyboard'],'磁轴键盘':['磁轴键盘','Hall-effect keyboard'],'自动发现':['自动分类','Auto-classified'],'镁合金无线电竞鼠标':['镁合金无线电竞鼠标','Magnesium wireless esports mouse']};return map[value]?.[LANG==='zh-CN'?0:1]||value}
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
