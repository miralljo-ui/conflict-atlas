import { CONFLICTS, TIMELINE, getFeatureIso } from '../data/conflicts.js';
import { createI18n } from './i18n.js';
import { initializeTheme, refreshThemeButton, toggleTheme } from './theme.js';

const i18n = createI18n('es');
let currentLang = i18n.getLang();
const SUPPORTED_LANGS = i18n.getSupportedLangs();
const T = i18n.t;
let currentTheme = 'dark';

const LEVELS = {
  war:  { label:'GUERRA ACTIVA',    color:'#ff1f1f', cls:'conflict-war'  },
  high: { label:'ALTA INTENSIDAD',  color:'#ff6b00', cls:'conflict-high' },
  med:  { label:'MEDIA INTENSIDAD', color:'#f5c400', cls:'conflict-med'  },
  low:  { label:'TENSIÓN LATENTE',  color:'#00aaff', cls:'conflict-low'  },
};

// Security: frontend must never call model providers directly with secret keys.
// Configure a backend route that performs the upstream news lookup.
const NEWS_API_ENDPOINT = '/api/news';
const NEWS_TIMEOUT_MS = 12000;

// ─── state ───
let activeFilter = 'all';
let selectedId = null;
let currentConflict = null;
let searchQuery = '';

// ─── header counts ───
function updateCounts() {
  const c = {war:0,high:0,med:0,low:0};
  CONFLICTS.forEach(f=>c[f.level]++);
  document.getElementById('cnt-war').textContent  = c.war;
  document.getElementById('cnt-high').textContent = c.high;
  document.getElementById('cnt-med').textContent  = c.med;
  document.getElementById('cnt-low').textContent  = c.low;
}
updateCounts();

// ─── filters ───
function renderFilters() {
  const fb = document.getElementById('filters');
  const items = [
    {key:'all', label:T('filterAll')}, {key:'war',label:T('filterWar')}, {key:'high',label:T('filterHigh')},
    {key:'med',label:T('filterMed')}, {key:'low',label:T('filterLow')}
  ];
  fb.innerHTML = items.map(i => {
    const color = i.key==='all' ? '#666' : LEVELS[i.key].color;
    const on = activeFilter===i.key;
    return `<button class="fbtn${on?' on':''}" style="${on?`border-color:${color};color:${color}`:''}" data-filter="${i.key}">${i.label}</button>`;
  }).join('');
  fb.querySelectorAll('.fbtn').forEach(btn=>btn.addEventListener('click',()=>{
    activeFilter=btn.dataset.filter; renderFilters(); renderList(); renderMarkers();
  }));
}

// ─── list ───
function renderList() {
  const cl = document.getElementById('clist');
  const order={war:0,high:1,med:2,low:3};
  let filtered = activeFilter==='all' ? CONFLICTS : CONFLICTS.filter(c=>c.level===activeFilter);
  if(searchQuery.trim()){
    const q=searchQuery.toLowerCase();
    filtered=filtered.filter(c=>
      c.name.toLowerCase().includes(q)||
      c.region.toLowerCase().includes(q)||
      c.iso.some(i=>i.toLowerCase().includes(q))||
      c.types.some(t=>t.toLowerCase().includes(q))||
      c.parties.toLowerCase().includes(q)
    );
  }
  const sorted = [...filtered].sort((a,b)=>order[a.level]-order[b.level]);
  document.getElementById('list-count').textContent = sorted.length+' '+T('conflicts');
  cl.innerHTML = sorted.map(c=>{
    const lv=LEVELS[c.level];
    return `<div class="citem${selectedId===c.id?' sel':''}" data-id="${c.id}" style="--item-c:${lv.color}">
      <div class="citem-name">${c.name}</div>
      <div class="citem-meta">
        <span class="citem-region">${c.region}</span>
        <span class="cbadge" style="background:${lv.color}22;color:${lv.color};border:1px solid ${lv.color}44">${c.since}</span>
      </div>
    </div>`;
  }).join('');
  cl.querySelectorAll('.citem').forEach(el=>el.addEventListener('click',()=>{
    selectConflict(CONFLICTS.find(x=>x.id===+el.dataset.id));
  }));
}

// ─── D3 MAP ───
const wrap = document.getElementById('map-wrap');
let svg, g, projection, path, zoom;

function initMap(world) {
  const W=wrap.clientWidth, H=wrap.clientHeight;
  svg = d3.select('#map-svg').attr('width',W).attr('height',H);
  projection = d3.geoNaturalEarth1().scale(W/6.3).translate([W/2,H/2]);
  path = d3.geoPath().projection(projection);

  zoom = d3.zoom().scaleExtent([1,14]).on('zoom',(ev)=>g.attr('transform',ev.transform));
  svg.call(zoom);
  g = svg.append('g');

  g.append('path').datum({type:'Sphere'}).attr('class','sphere').attr('d',path);
  g.append('path').datum(d3.geoGraticule()()).attr('class','graticule').attr('d',path);

  const countries = topojson.feature(world, world.objects.countries);

  // Build ISO → conflict level map (worst level wins)
  const levelOrder={war:0,high:1,med:2,low:3};
  const isoToLevel={};
  CONFLICTS.forEach(c=>c.iso.forEach(iso=>{
    if(!isoToLevel[iso]||levelOrder[c.level]<levelOrder[isoToLevel[iso]]) isoToLevel[iso]=c.level;
  }));

  // Note: world-atlas 110m uses numeric IDs; we need to match by properties
  g.selectAll('.country')
    .data(countries.features)
    .join('path')
    .attr('class', d=>{
      const iso = getFeatureIso(d);
      const lvl = isoToLevel[iso];
      return 'country '+(lvl?LEVELS[lvl].cls:'neutral');
    })
    .attr('d',path)
    .on('mouseover', function(ev,d){
      const iso=getFeatureIso(d);
      const c=CONFLICTS.find(cf=>cf.iso.includes(iso));
      if(c){d3.select(this).classed('hovered',true); showTT(ev,c);}
    })
    .on('mousemove',function(ev,d){
      const iso=getFeatureIso(d);
      const c=CONFLICTS.find(cf=>cf.iso.includes(iso));
      if(c) moveTT(ev);
    })
    .on('mouseout',function(){d3.select(this).classed('hovered',false); hideTT();})
    .on('click',function(ev,d){
      const iso=getFeatureIso(d);
      const c=CONFLICTS.find(cf=>cf.iso.includes(iso));
      if(c) selectConflict(c);
    });

  renderMarkers();
  document.getElementById('map-loading').style.display='none';
}

function renderMarkers(){
  if(!g) return;
  g.selectAll('.marker-g').remove();
  const filtered = activeFilter==='all' ? CONFLICTS : CONFLICTS.filter(c=>c.level===activeFilter);
  filtered.forEach(c=>{
    const lv=LEVELS[c.level];
    const pt=projection([c.lon,c.lat]);
    if(!pt) return;
    const [x,y]=pt;
    const r = c.level==='war'?5:c.level==='high'?4.5:4;
    const mg=g.append('g').attr('class','marker-g').attr('transform',`translate(${x},${y})`);
    mg.append('circle').attr('class','pulse-ring').attr('r',r).attr('stroke',lv.color)
      .style('animation-delay',(Math.random()*2.5)+'s');
    mg.append('circle').attr('class','marker-core').attr('r',r).attr('fill',lv.color)
      .style('filter',`drop-shadow(0 0 ${c.level==='war'?'6':'4'}px ${lv.color})`);
    if(selectedId===c.id){
      mg.append('circle').attr('r',r+6).attr('fill','none')
        .attr('stroke',lv.color).attr('stroke-width',1).attr('opacity',0.7);
    }
    mg.on('mouseover',ev=>showTT(ev,c))
      .on('mousemove',ev=>moveTT(ev))
      .on('mouseout',hideTT)
      .on('click',()=>selectConflict(c));
  });
}

// ─── tooltip ───
const ttEl=document.getElementById('tooltip');
function showTT(ev,c){
  const lv=LEVELS[c.level];
  ttEl.style.borderLeftColor=lv.color;
  ttEl.innerHTML=`<div class="tt-name">${c.name}</div>
    <div class="tt-row"><span>${T('region')}</span><b>${c.region}</b></div>
    <div class="tt-row"><span>${T('fromYear')}</span><b>${c.since}</b></div>
    <div class="tt-row"><span>${T('level')}</span><b style="color:${lv.color}">${lv.label}</b></div>
    <div class="tt-row"><span>${T('casShort')}</span><b>${c.casualties}</b></div>
    <div class="tt-hint">${T('clickDetail')}</div>`;
  moveTT(ev); ttEl.classList.add('show');
}
function moveTT(ev){
  const r=wrap.getBoundingClientRect();
  let x=ev.clientX-r.left+14, y=ev.clientY-r.top+14;
  if(x+240>r.width) x=ev.clientX-r.left-244;
  if(y+200>r.height) y=ev.clientY-r.top-204;
  ttEl.style.left=x+'px'; ttEl.style.top=y+'px';
}
function hideTT(){ ttEl.classList.remove('show'); }

// ─── select conflict ───
function selectConflict(c){
  selectedId=c.id; currentConflict=c;
  renderList(); renderMarkers();
  // Zoom to location
  const pt=projection([c.lon,c.lat]);
  if(pt){
    const W=wrap.clientWidth,H=wrap.clientHeight,sc=c.level==='war'?4:3;
    svg.transition().duration(700).call(zoom.transform,
      d3.zoomIdentity.translate(W/2,H/2).scale(sc).translate(-pt[0],-pt[1]));
  }
  openPanel(c);
}

function openPanel(c){
  const lv=LEVELS[c.level];
  document.getElementById('rp-ibar').style.background=lv.color;
  document.getElementById('rp-title').textContent=c.name;
  document.getElementById('rp-region').textContent=c.region;
  document.getElementById('rp-body').innerHTML=`
    <div class="rp-sec">
      <div class="rp-sec-label">${T('currentStatus')}</div>
      <div class="rp-sec-val" style="color:${lv.color};font-weight:600">${c.status}</div>
    </div>
    <div class="kv"><span class="kv-k">${T('intensity')}</span><span class="kv-v" style="color:${lv.color}">${lv.label}</span></div>
    <div class="kv"><span class="kv-k">${T('since')}</span><span class="kv-v">${c.since}</span></div>
    <div class="kv"><span class="kv-k">${T('casualties')}</span><span class="kv-v">${c.casualties}</span></div>
    <div class="kv"><span class="kv-k">${T('displaced')}</span><span class="kv-v">${c.displaced}</span></div>
    <div class="rp-sec" style="margin-top:12px">
      <div class="rp-sec-label">${T('parties')}</div>
      <div class="rp-sec-val">${c.parties}</div>
    </div>
    <div class="rp-sec">
      <div class="rp-sec-label">${T('description')}</div>
      <div class="rp-sec-val">${c.desc}</div>
    </div>
    <div class="rp-sec">
      <div class="rp-sec-label">${T('type')}</div>
      <div>${c.types.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    </div>
    ${buildChart(c)}`;
  document.getElementById('news-list').innerHTML=`<div class="news-empty">${T('clickToFetch')}</div>`;
  document.getElementById('news-btn').disabled=false;
  document.getElementById('news-btn').textContent=T('fetchNews');
  document.getElementById('lbl-news-title').textContent=T('recentNews');
  document.getElementById('right-panel').classList.add('open');
}

// ─── panel close ───
document.getElementById('rp-close').addEventListener('click',()=>{
  document.getElementById('right-panel').classList.remove('open');
  selectedId=null; currentConflict=null;
  renderList(); renderMarkers();
  svg.transition().duration(600).call(zoom.transform,d3.zoomIdentity);
});

// ─── zoom buttons ───
document.getElementById('zoom-in').addEventListener('click',()=>svg.transition().duration(300).call(zoom.scaleBy,1.5));
document.getElementById('zoom-out').addEventListener('click',()=>svg.transition().duration(300).call(zoom.scaleBy,0.67));
document.getElementById('zoom-reset').addEventListener('click',()=>svg.transition().duration(500).call(zoom.transform,d3.zoomIdentity));

// ─── fetch news ───
document.getElementById('news-btn').addEventListener('click', async()=>{
  if(!currentConflict) return;
  const btn=document.getElementById('news-btn');
  const spinner=document.getElementById('news-spinner');
  const nl=document.getElementById('news-list');
  btn.disabled=true; spinner.classList.add('on');
  nl.innerHTML=`<div class="news-empty">${T('searchingNews')}</div>`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NEWS_TIMEOUT_MS);
  try {
    const res = await fetch(NEWS_API_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      signal: controller.signal,
      body:JSON.stringify({
        conflictName: currentConflict.name,
        region: currentConflict.region,
        query: currentConflict.newsQuery,
        language: currentLang,
        maxItems: 5
      })
    });
    if(!res.ok){
      throw new Error(`NEWS_API_HTTP_${res.status}`);
    }
    const parsed=await res.json();
    if(parsed&&parsed.news&&parsed.news.length>0){
      const lv=LEVELS[currentConflict.level];
      nl.innerHTML=parsed.news.map(n=>`
        <div class="news-card">
          <div class="news-card-headline">${n.headline}</div>
          <div class="news-card-meta">
            <span style="color:${lv.color}">${n.source||T('source')}</span>
            <span>${n.date||'2025'}</span>
          </div>
          ${n.summary?`<div class="news-card-summary">${n.summary}</div>`:''}
        </div>`).join('');
    } else {
      nl.innerHTML=`<div class="news-empty">${T('noNews')}</div>`;
      btn.disabled=false;
    }
  }catch(err){
    console.error(err);
    const isAbort = err && err.name === 'AbortError';
    nl.innerHTML=`<div class="news-empty">${isAbort ? T('newsTimeout') : T('aiError')}<br><br>${T('backendConfigHint')} <code>${NEWS_API_ENDPOINT}</code> para obtener noticias reales.</div>`;
    btn.disabled=false;
  }finally{
    clearTimeout(timeoutId);
    spinner.classList.remove('on');
  }
});

// ─── build chart ───
function buildChart(c){
  const data=TIMELINE[c.id];
  if(!data||data.length<2) return '';
  const lv=LEVELS[c.level];
  const W=280,H=90,pl=38,pr=8,pt=4,pb=22;
  const iW=W-pl-pr, iH=H-pt-pb;
  const xs=d3.scaleBand().domain(data.map(d=>d.y)).range([0,iW]).padding(0.28);
  const maxV=d3.max(data,d=>d.v);
  const ys=d3.scaleLinear().domain([0,maxV*1.1]).range([iH,0]);
  const fmt=v=>v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?Math.round(v/1000)+'k':v;
  let rects='',xlbls='',ylbls='',lines='';
  [0,0.5,1].forEach(t=>{
    const yv=maxV*1.1*t, y=ys(yv);
    ylbls+=`<text x="${pl-4}" y="${pt+y+3}" text-anchor="end" font-size="6.5" fill="var(--text3)">${fmt(yv)}</text>`;
    lines+=`<line x1="${pl}" y1="${pt+y}" x2="${pl+iW}" y2="${pt+y}" stroke="var(--border)" stroke-width="0.5"/>`;
  });
  data.forEach(d=>{
    const x=pl+xs(d.y), bw=xs.bandwidth(), barH=iH-ys(d.v);
    rects+=`<rect x="${x}" y="${pt+ys(d.v)}" width="${bw}" height="${barH}" fill="${lv.color}" opacity="0.75" rx="1"/>`;
    xlbls+=`<text x="${x+bw/2}" y="${pt+iH+15}" text-anchor="middle" font-size="6.5" fill="var(--text3)">${d.y}</text>`;
  });
  return `<div class="chart-wrap">
    <div class="chart-label">${T('chartTitle')} — ${T('chartCas')}</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;overflow:visible">${lines}${rects}${ylbls}${xlbls}</svg>
  </div>`;
}

// ─── renderLang ───
function renderLang(){
  document.documentElement.lang=currentLang;
  document.querySelector('.logo span').textContent=T('title');
  const el=id=>document.getElementById(id);
  el('lbl-live').textContent=T('liveLabel');
  el('lbl-wars').textContent=T('activeWars');
  el('lbl-high').textContent=T('highIntensity');
  el('lbl-med').textContent=T('medIntensity');
  el('lbl-low').textContent=T('latentTension');
  el('lbl-panel-title').textContent=T('activeConflicts');
  el('lbl-news-title').textContent=T('recentNews');
  el('lbl-legend').textContent=T('legendTitle');
  const legW=el('lbl-leg-war'),legH=el('lbl-leg-high'),legM=el('lbl-leg-med'),legL=el('lbl-leg-low');
  if(legW) legW.querySelector('span').textContent=T('legWar');
  if(legH) legH.querySelector('span').textContent=T('legHigh');
  if(legM) legM.querySelector('span').textContent=T('legMed');
  if(legL) legL.querySelector('span').textContent=T('legLow');
  const si=el('search-input'); if(si) si.placeholder=T('searchPlaceholder');
  const nb=el('news-btn'); if(nb&&!nb.disabled) nb.textContent=T('fetchNews');
  el('lang-wrap').innerHTML=SUPPORTED_LANGS.map(l=>
    `<button class="lang-btn${currentLang===l?' on':''}" data-l="${l}">${l.toUpperCase()}</button>`
  ).join('');
  el('lang-wrap').querySelectorAll('.lang-btn').forEach(b=>b.addEventListener('click',()=>{
    currentLang=i18n.setLang(b.dataset.l); renderLang(); renderList();
    if(currentConflict) openPanel(currentConflict);
  }));
  refreshThemeButton({ currentTheme, currentLang });
  renderFilters();
}

// ─── exportPDF ───
function exportPDF(){
  if(!currentConflict) return;
  window.print();
}

// ─── init ───
currentTheme = initializeTheme(currentLang);

renderLang(); renderList();

document.getElementById('theme-btn').addEventListener('click', ()=>{
  currentTheme = toggleTheme(currentTheme, currentLang);
});

document.getElementById('search-input').addEventListener('input', e=>{
  searchQuery=e.target.value; renderList();
});

document.getElementById('pdf-btn').addEventListener('click', exportPDF);

fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
  .then(r=>r.json())
  .then(world=>initMap(world))
  .catch(()=>{
    document.getElementById('map-loading').innerHTML=`
      <span style="color:#ff4444">Error al cargar el mapa</span>
      <span style="font-size:9px;color:#3a4760">Verifica tu conexión a internet</span>`;
  });

window.addEventListener('resize',()=>{
  if(!svg) return;
  const W=wrap.clientWidth,H=wrap.clientHeight;
  svg.attr('width',W).attr('height',H);
  projection.scale(W/6.3).translate([W/2,H/2]);
  path=d3.geoPath().projection(projection);
  g.selectAll('.country').attr('d',path);
  g.selectAll('.sphere').attr('d',path);
  g.selectAll('.graticule').attr('d',path);
  renderMarkers();
});

