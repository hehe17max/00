
let DB=[], SCHEMA={}, selected=new Set();
const $=s=>document.querySelector(s);
const grid=$('#grid'), detail=$('#detail'), compareDialog=$('#compareDialog');

Promise.all([
  fetch('data/products.json?ts='+Date.now()).then(r=>r.json()),
  fetch('data/category_schema.json?ts='+Date.now()).then(r=>r.json())
]).then(([d,s])=>{
  DB=d.products; SCHEMA=s;
  $('#updated').textContent='数据更新：'+d.updated_at; $('#total').textContent=DB.length;
  const brands=[...new Set(DB.map(x=>x.brand))].sort(), cats=[...new Set(DB.map(x=>x.category))].sort();
  brands.forEach(x=>$('#brandFilter').add(new Option(x,x))); cats.forEach(x=>$('#catFilter').add(new Option(x,x)));
  $('#brands').textContent=brands.length; $('#cats').textContent=cats.length;
  $('#cnbrands').textContent=[...new Set(DB.filter(x=>x.origin==='中国').map(x=>x.brand))].length;
  rebuildHints(); render();
});

['#search','#brandFilter','#originFilter','#verifyFilter','#sort'].forEach(s=>$(s).addEventListener(s==='#search'?'input':'change',render));
$('#catFilter').addEventListener('change',()=>{rebuildHints();render()});
$('#clearCompare').onclick=()=>{selected.clear();render();syncCompare()};
$('#doCompare').onclick=openCompare;

function rebuildHints(){
  const cat=$('#catFilter').value;
  const sch=SCHEMA[cat]||SCHEMA['待分类']||{};
  $('#search').placeholder=cat==='全部'?'搜索品牌、型号、DPI、传感器、RT、轴体、ANC、编码、回报率、重量…':(sch.search_placeholder||'搜索产品参数…');
  const q=$('#quick'); q.innerHTML='';
  const terms=cat==='全部'?['PAW3950','8000Hz','磁轴','热插拔','LDAC','ANC','三模','≤60g']:(sch.quick_terms||[]);
  terms.forEach(t=>{const b=document.createElement('button');b.dataset.q=t;b.textContent=t;b.onclick=()=>{$('#search').value=t;render()};q.appendChild(b)});
}

function searchable(p){return [p.brand,p.name,p.category,p.subcategory,p.status,p.origin,...Object.entries(p.specs||{}).flat()].join(' ').toLowerCase()}
function numericWeightMatch(p,q){
  if(q==='≤60g'||q==='<=60g'){
    const w=String(p.specs?.['重量']||'');
    const m=w.match(/(\d+(?:\.\d+)?)\s*g/i); return m && parseFloat(m[1])<=60;
  }
  return null;
}
function render(){
  const q=$('#search').value.trim().toLowerCase(), b=$('#brandFilter').value,c=$('#catFilter').value,o=$('#originFilter').value,v=$('#verifyFilter').value;
  let rows=DB.filter(p=>{
    const special=numericWeightMatch(p,q);
    return (b==='全部'||p.brand===b)&&(c==='全部'||p.category===c)&&(o==='全部'||p.origin===o)&&
    (v==='全部'||(v==='已核实' ? !String(p.specs?.['参数状态']||'').includes('待') && Object.keys(p.specs||{}).length>2 : (String(p.specs?.['参数状态']||'').includes('待')||Object.keys(p.specs||{}).length<=2)))&&
    (!q||(special===true)||searchable(p).includes(q));
  });
  rows.sort((a,z)=>$('#sort').value==='name'?a.name.localeCompare(z.name):(`${a.brand}${a.name}`).localeCompare(`${z.brand}${z.name}`));
  $('#count').textContent=rows.length; $('#empty').classList.toggle('hidden',!!rows.length); grid.innerHTML='';
  rows.forEach(p=>{
    const key=id(p), e=document.createElement('article'); e.className='card';
    const wanted=(SCHEMA[p.category]?.fields||[]);
    const entries=Object.entries(p.specs||{});
    entries.sort((a,b)=>{let ia=wanted.indexOf(a[0]),ib=wanted.indexOf(b[0]);ia=ia<0?999:ia;ib=ib<0?999:ib;return ia-ib});
    const chips=entries.filter(([k,v])=>v&&v!=='—'&&!['原分类','参数状态'].includes(k)).slice(0,6);
    e.innerHTML=`<div class="topline"><span class="brand">${p.brand}</span><span class="sub">${p.subcategory||p.category}</span></div>
      <h3>${p.name}</h3><div class="chips">${chips.map(([k,v])=>`<span class="chip">${k}: ${v}</span>`).join('')}</div>
      ${p.conflict?`<div class="warn">⚠ ${p.conflict}</div>`:''}
      <div class="actions"><button class="details">查看参数 →</button>
      <label class="comparecheck"><input type="checkbox" ${selected.has(key)?'checked':''}> 加入对比</label></div>`;
    e.querySelector('.details').onclick=()=>openDetail(p);
    e.querySelector('input').onchange=ev=>toggleCompare(p,ev.target.checked); grid.appendChild(e);
  }); syncCompare();
}
function id(p){return p.brand+'::'+p.name}
function toggleCompare(p,on){const key=id(p);if(on){if(selected.size>=4){alert('最多同时对比 4 款产品');render();return}selected.add(key)}else selected.delete(key);syncCompare()}
function syncCompare(){$('#compareBar').classList.toggle('hidden',!selected.size);$('#compareCount').textContent=selected.size;$('#compareNames').textContent=[...selected].map(k=>k.split('::')[1]).join(' · ')}
function orderedEntries(p){
 const wanted=SCHEMA[p.category]?.fields||[], arr=Object.entries(p.specs||{});
 return arr.sort((a,b)=>{let ia=wanted.indexOf(a[0]),ib=wanted.indexOf(b[0]);ia=ia<0?999:ia;ib=ib<0?999:ib;return ia-ib})
}
function openDetail(p){
 const rows=orderedEntries(p).map(([k,v])=>`<div class="row"><small>${k}</small><b>${v}</b></div>`).join('');
 $('#detailBody').innerHTML=`<span class="brand">${p.brand} · ${p.category} · ${p.origin||'—'}</span><h2>${p.name}</h2><p class="sub">${p.status} · ${p.verified}</p>
 <div class="detailgrid">${rows}</div>${p.conflict?`<p class="warn">⚠ ${p.conflict}</p>`:''}
 <a class="source" href="${p.source}" target="_blank" rel="noopener">打开官方来源 ↗</a>`;detail.showModal();
}
function openCompare(){
 const ps=DB.filter(p=>selected.has(id(p)));if(ps.length<2){alert('至少选择两款产品');return}
 let keys=[...new Set(ps.flatMap(p=>Object.keys(p.specs||{})))];
 const cat=ps.every(p=>p.category===ps[0].category)?ps[0].category:null,wanted=cat?(SCHEMA[cat]?.fields||[]):[];
 keys.sort((a,b)=>{let ia=wanted.indexOf(a),ib=wanted.indexOf(b);ia=ia<0?999:ia;ib=ib<0?999:ib;return ia-ib});
 $('#compareBody').innerHTML=`<h2>产品参数对比</h2><div style="overflow:auto"><table class="comparetable"><thead><tr><th>参数</th>${ps.map(p=>`<th>${p.brand}<br><b>${p.name}</b></th>`).join('')}</tr></thead>
 <tbody>${keys.map(k=>`<tr><td>${k}</td>${ps.map(p=>`<td>${p.specs?.[k]||'—'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;compareDialog.showModal();
}
