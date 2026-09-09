
let DB=[], FILTERS={}, selected=new Set(), selectedKeywords=new Set();
const $=s=>document.querySelector(s);
const grid=$('#grid'), detail=$('#detail'), compareDialog=$('#compareDialog');

Promise.all([
 fetch('data/products.json?ts='+Date.now()).then(r=>r.json()),
 fetch('data/filter_schema.json?ts='+Date.now()).then(r=>r.json()),
 fetch('data/brand_discovery_report.json?ts='+Date.now()).then(r=>r.json()).catch(()=>null),
 fetch('data/brand_candidates.json?ts='+Date.now()).then(r=>r.json()).catch(()=>[])
]).then(([d,f,discoveryReport,brandCandidates])=>{
 window.DISCOVERY_REPORT=discoveryReport; window.BRAND_CANDIDATES=brandCandidates;
 DB=d.products; FILTERS=f; $('#updated').textContent='数据更新：'+d.updated_at; $('#total').textContent=DB.length;
 const brands=[...new Set(DB.map(x=>x.brand))].sort(), cats=[...new Set(DB.map(x=>x.category))].sort();
 brands.forEach(x=>$('#brandFilter').add(new Option(x,x))); cats.forEach(x=>$('#catFilter').add(new Option(x,x)));
 $('#brands').textContent=brands.length; $('#cats').textContent=cats.length;
 $('#verifiedCount').textContent=DB.filter(x=>x.verification?.status==='official_verified').length;
 rebuildKeywords(); render();
 if(discoveryReport){
   $('#discoverySummary').textContent=`${discoveryReport.date}：新候选 ${discoveryReport.new_candidates||0}，自动加入 ${discoveryReport.auto_promoted||0}，检查候选站点 ${discoveryReport.candidate_sites_checked||0}`;
   $('#discoveryProvider').textContent=`搜索来源：${discoveryReport.provider||'尚未运行'} · 搜索结果 ${discoveryReport.results_scanned||0}`;
 }else{
   $('#discoverySummary').textContent='品牌自动发现尚未运行';
   $('#discoveryProvider').textContent='首次运行 Update peripheral product database 后生成报告';
 }
});
['#search','#brandFilter','#originFilter','#verifyFilter','#sort'].forEach(s=>$(s).addEventListener(s==='#search'?'input':'change',render));
$('#catFilter').addEventListener('change',()=>{selectedKeywords.clear();rebuildKeywords();render()});
$('#keywordMode').addEventListener('change',()=>{if($('#keywordMode').value==='single'&&selectedKeywords.size>1)selectedKeywords=new Set([[...selectedKeywords][0]]);rebuildKeywords();render()});
$('#clearKeywords').onclick=()=>{selectedKeywords.clear();rebuildKeywords();render()};
$('#clearCompare').onclick=()=>{selected.clear();render();syncCompare()};
$('#doCompare').onclick=openCompare;

function fallback(cat){return cat==='鼠标'?'assets/mouse.svg':cat==='键盘'?'assets/keyboard.svg':'assets/headset.svg'}
function img(p){return p.image_url||fallback(p.category)}
function searchable(p){return [p.brand,p.name,p.category,p.subcategory,p.status,p.origin,...Object.entries(p.specs||{}).flat()].join(' ').toLowerCase()}
function verificationLabel(p){
 const s=p.verification?.status||'official_discovered';
 if(s==='official_verified')return ['官方已核实','good'];
 if(s==='conflict')return ['参数冲突待审','conflict'];
 if(s==='corroborated')return ['多来源已核验','good'];
 return ['官方已发现/待补',''];
}
function rebuildKeywords(){
 const cat=$('#catFilter').value, spec=FILTERS[cat]||FILTERS['待分类'];
 $('#search').placeholder=cat==='全部'?'搜索品牌、型号、传感器、DPI、RT、轴体、ANC、编码、回报率、重量…':spec.placeholder;
 const terms=cat==='全部'?['PAW3950','8000Hz','≤60g','磁轴','Rapid Trigger','热插拔','LDAC','ANC','2.4GHz','三模']:(spec.keywords||[]);
 const box=$('#quick');box.innerHTML='';
 terms.forEach(t=>{let b=document.createElement('button');b.textContent=t;b.classList.toggle('active',selectedKeywords.has(t));b.onclick=()=>{
   const mode=$('#keywordMode').value;
   if(mode==='single'){selectedKeywords.clear();selectedKeywords.add(t)}
   else selectedKeywords.has(t)?selectedKeywords.delete(t):selectedKeywords.add(t);
   rebuildKeywords();render()
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
  const wanted=(FILTERS[p.category]?.priority_fields||[]), entries=Object.entries(p.specs||{}).filter(([k,v])=>v&&v!=='—'&&k!=='参数状态');
  entries.sort((a,b)=>{let ia=wanted.indexOf(a[0]),ib=wanted.indexOf(b[0]);return(ia<0?999:ia)-(ib<0?999:ib)});
  const [vl,vc]=verificationLabel(p);
  e.innerHTML=`<img class="productimg" src="${img(p)}" alt="${p.brand} ${p.name}" loading="lazy" onerror="this.src='${fallback(p.category)}'">
  <div class="cardbody"><div class="topline"><span class="brand">${p.brand}</span><span class="sub">${p.subcategory||p.category}</span></div>
  <h3>${p.name}</h3><span class="verify ${vc}">● ${vl} · ${Math.round((p.verification?.confidence||0)*100)}%</span>
  <div class="chips">${entries.slice(0,6).map(([k,v])=>`<span class="chip">${k}: ${v}</span>`).join('')}</div>
  ${p.conflict?`<div class="warn">⚠ ${p.conflict}</div>`:''}
  <div class="actions"><button class="details">查看详情 →</button><label class="comparecheck"><input type="checkbox" ${selected.has(key)?'checked':''}> 对比</label></div></div>`;
  e.querySelector('.details').onclick=()=>openDetail(p);
  e.querySelector('input').onchange=ev=>toggleCompare(p,ev.target.checked);grid.appendChild(e)
 });syncCompare()
}
function id(p){return p.brand+'::'+p.name}
function toggleCompare(p,on){const key=id(p);if(on){if(selected.size>=20){alert('最多同时对比 20 款产品');render();return}selected.add(key)}else selected.delete(key);syncCompare()}
function syncCompare(){$('#compareBar').classList.toggle('hidden',!selected.size);$('#compareCount').textContent=selected.size;$('#compareNames').textContent=[...selected].map(x=>x.split('::')[1]).join(' · ')}
function orderedEntries(p){const w=FILTERS[p.category]?.priority_fields||[],a=Object.entries(p.specs||{});return a.sort((x,y)=>{let i=w.indexOf(x[0]),j=w.indexOf(y[0]);return(i<0?999:i)-(j<0?999:j)})}
function openDetail(p){
 const [vl,vc]=verificationLabel(p), rows=orderedEntries(p).map(([k,v])=>`<div class="row"><small>${k}</small><b>${v}</b></div>`).join('');
 const sources=(p.sources||[]).map(s=>`<a class="source" href="${s.url}" target="_blank" rel="noopener">${s.type} · 权重 ${s.tier} · ${s.checked_at||'待复核'} ↗</a>`).join('');
 $('#detailBody').innerHTML=`<div class="detailhead"><img class="detailimg" src="${img(p)}" onerror="this.src='${fallback(p.category)}'">
 <div><span class="brand">${p.brand} · ${p.category} · ${p.origin||'—'}</span><h2>${p.name}</h2><span class="verify ${vc}">● ${vl} · 可信度 ${Math.round((p.verification?.confidence||0)*100)}%</span>
 <p class="sub">${p.status} · 最近检查 ${p.last_checked||p.last_verified||'—'}</p></div></div>
 <div class="detailgrid">${rows}</div>${p.conflict?`<p class="warn">⚠ ${p.conflict}</p>`:''}
 <div class="sourcelist"><b>数据来源</b>${sources||'<p class="sub">暂无来源记录</p>'}</div>`;detail.showModal()
}
function openCompare(){
 const ps=DB.filter(p=>selected.has(id(p)));if(ps.length<2){alert('至少选择两款产品');return}
 let keys=[...new Set(ps.flatMap(p=>Object.keys(p.specs||{})))];
 const same=ps.every(p=>p.category===ps[0].category),wanted=same?(FILTERS[ps[0].category]?.priority_fields||[]):[];
 keys.sort((a,b)=>{let i=wanted.indexOf(a),j=wanted.indexOf(b);return(i<0?999:i)-(j<0?999:j)});
 $('#compareBody').innerHTML=`<h2>产品参数对比（${ps.length} 款）</h2><div class="comparewrap"><table class="comparetable"><thead><tr><th>参数</th>${ps.map(p=>`<th>${p.brand}<br><b>${p.name}</b></th>`).join('')}</tr></thead>
 <tbody>${keys.map(k=>`<tr><td>${k}</td>${ps.map(p=>`<td>${p.specs?.[k]||'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;compareDialog.showModal()
}

const candidateDialog=document.querySelector('#candidateDialog');
const openCandidates=document.querySelector('#openCandidates');
if(openCandidates) openCandidates.onclick=()=>{
 const rows=(window.BRAND_CANDIDATES||[]).slice().sort((a,b)=>(b.score||0)-(a.score||0));
 const active=rows.filter(x=>x.status!=='rejected');
 document.querySelector('#candidateBody').innerHTML=`<h2>自动发现的品牌候选</h2>
 <p class="sub">高置信度品牌会自动进入 brands.json；其余候选保留等待审核。将候选 status 改为 approved 后，下次自动任务会正式加入。</p>
 ${active.length?active.map(c=>`<div class="candidate">
   <h3>${c.brand||c.domain} <span class="score">${c.score||0}/100</span></h3>
   <div class="candidate-meta">${c.domain} · ${c.status||'candidate'} · 产品页 ${c.product_page_count||0} · Product结构化页 ${c.product_schema_page_count||0} · ${(c.categories||[]).join(' / ')||'待分类'}</div>
   <a href="${c.official_url}" target="_blank" rel="noopener">访问疑似官网 ↗</a>
 </div>`).join(''):'<p>暂无候选品牌。</p>'}`;
 candidateDialog.showModal();
};
