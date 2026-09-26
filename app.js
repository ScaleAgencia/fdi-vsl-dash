/* FDI · VSL — dashboard de vendas (Video Sales Letter) · render puro (sem libs, SVG na mão) sobre window.VSL */
(function(){
'use strict';
var D = window.VSL || {};
var arr = function(x){ return Array.isArray(x) ? x : (x ? [x] : []); };
var clamp = function(x){ return Math.max(0, Math.min(1, x)); };
var nf0 = new Intl.NumberFormat('pt-BR');
var nf1 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
var nf2 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
var money = function(v){ return 'R$ ' + nf2.format(v||0); };
var money0 = function(v){ return 'R$ ' + nf0.format(Math.round(v||0)); };
var intf = function(v){ return nf0.format(Math.round(v||0)); };
var pct = function(v){ return nf1.format(v||0) + '%'; };
var roasf = function(v){ return nf2.format(v||0); };
var dv = function(a,b){ return b>0 ? a/b : 0; };
function fmtBR(iso){ if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso; var p=iso.split('-'); return p[2]+'/'+p[1]; }
function el(id){ return document.getElementById(id); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function isDate(x){ return /^\d{4}-\d{2}-\d{2}$/.test(x); }

var COL={vio:'#8b5cf6',vio2:'#b794ff',gold:'#f6c445',gold2:'#ffd84d',cy:'#34d7e6',cy2:'#6ef0fb',meta:'#a78bfa'};

/* ---------- prepara meta (resolve grain interned) ---------- */
function prepMeta(S){
  S = S || {}; S.daily = arr(S.daily);
  var names = arr(S.names);
  S._grain = arr(S.grain).map(function(g){
    return { date:g.d, campaign:names[g.c]||'', adset:names[g.s]||'', ad:names[g.a]||'',
      spend:+g.sp||0, spendRaw:+g.spr||0, impr:+g.im||0, reach:+g.rh||0, clicks:+g.ck||0, lpv:+g.lp||0,
      v3:+g.v3||0, v75:+g.v75||0, checkout:+g.chk||0, mpur:+g.mp||0, mrev:+g.mv||0, sales:+g.vn||0, rev:+g.rv||0 }; });
  return S;
}
var META = prepMeta(D.meta);
var VEN = D.vendas || {}; VEN.daily=arr(VEN.daily); VEN.byCamp=arr(VEN.byCamp); VEN.byAd=arr(VEN.byAd);
var PRODUTO = VEN.product || 'Fórmula dos Investimentos';
var UPPROD = VEN.upsellProduct || 'Prosperus';
function prepGoogle(S){ S=S||{}; S.daily=arr(S.daily); var names=arr(S.names);
  S._grain=arr(S.grain).map(function(g){ return { date:g.d, campaign:names[g.c]||'', adset:names[g.s]||'', ad:names[g.a]||'',
    spend:+g.sp||0, impr:+g.im||0, clicks:+g.ck||0, sales:+g.vn||0, rev:+g.rv||0 }; }); return S; }
var GOO = prepGoogle(D.google);
var HAS_GOOGLE = GOO.daily.length>0;
META._grain.forEach(function(r){ r.channel='meta'; });     // etiqueta p/ o filtro de canal da aba V2
GOO._grain.forEach(function(r){ r.channel='google'; });

/* ---------- período global ---------- */
function boundsOf(){
  var ds=[];
  META.daily.forEach(function(d){ if(isDate(d.date))ds.push(d.date); });
  GOO.daily.forEach(function(d){ if(isDate(d.date))ds.push(d.date); });
  VEN.daily.forEach(function(d){ if(isDate(d.date))ds.push(d.date); });
  ds.sort(); return [ds[0]||'', ds[ds.length-1]||''];
}
var B=boundsOf(), minDate=B[0], maxDate=B[1];
function addDays(iso,n){ var p=iso.split('-'); var dt=new Date(Date.UTC(+p[0],+p[1]-1,+p[2])); dt.setUTCDate(dt.getUTCDate()+n); return dt.toISOString().slice(0,10); }
function daysBetween(a,b){ var pa=a.split('-'),pb=b.split('-'); return Math.round((Date.UTC(+pb[0],+pb[1]-1,+pb[2])-Date.UTC(+pa[0],+pa[1]-1,+pa[2]))/86400000); }
function inRange(dt,r){ return dt>=r[0] && dt<=r[1]; }
var PRESETS=[{k:'hoje',label:'Hoje'},{k:'ontem',label:'Ontem'},{k:'7d',label:'7 dias'},{k:'30d',label:'30 dias'},{k:'tudo',label:'Tudo'}];
var period='tudo', customRange=null;
function rangeFor(k){
  if(k==='custom'&&customRange) return customRange;
  if(k==='tudo') return [minDate,maxDate];
  if(k==='hoje') return [maxDate,maxDate];
  if(k==='ontem'){ var y=addDays(maxDate,-1); return [y,y]; }
  if(k==='7d')  return [addDays(maxDate,-6),maxDate];
  if(k==='30d') return [addDays(maxDate,-29),maxDate];
  return [minDate,maxDate];
}
function prevRange(rng){ var len=daysBetween(rng[0],rng[1])+1; var pe=addDays(rng[0],-1); return [addDays(pe,-(len-1)),pe]; }

/* =================== META: agregação =================== */
var METS=['spend','spendRaw','impr','reach','clicks','lpv','v3','v75','checkout','mpur','mrev','sales','rev','upSales','upRev'];
function aggMeta(rng){ var o={}; METS.forEach(function(k){o[k]=0;});
  META.daily.forEach(function(d){ if(!inRange(d.date,rng))return; METS.forEach(function(k){o[k]+=(d[k]||0);}); }); return o; }
function metaDays(rng){ return META.daily.filter(function(d){return isDate(d.date)&&inRange(d.date,rng);}).sort(function(a,b){return a.date.localeCompare(b.date);}); }
function median(xs){ var a=xs.filter(function(x){return x!=null&&isFinite(x);}).sort(function(x,y){return x-y;}); if(!a.length)return 0; var m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
function cacClass(v,med){ if(v==null||!isFinite(v)||v<=0||med<=0)return 'cac-n'; var r=v/med; if(r<=0.85)return 'cac-g'; if(r<=1.3)return 'cac-a'; return 'cac-r'; }
function roasClass(v){ if(v==null||!isFinite(v)||v<=0)return 'roas-n'; if(v>=1)return 'roas-g'; if(v>=0.8)return 'roas-a'; return 'roas-r'; }
function trendHTML(cur,prev,higherBetter){ if(prev==null||!isFinite(prev)||prev===0||!isFinite(cur))return ''; var ch=(cur-prev)/Math.abs(prev)*100; if(Math.abs(ch)<0.1)return '';
  var up=ch>0, good=higherBetter?up:!up; return '<span class="trend '+(good?'up':'down')+'">'+(up?'▲':'▼')+' '+nf1.format(Math.abs(ch))+'%</span>'; }

/* =================== KPI COLUMN (meta) =================== */
function subRow(l,v,tr){ return '<div class="sub-row"><span class="s-l">'+l+'</span><span class="s-v">'+v+(tr||'')+'</span></div>'; }
function kpiCard(cls,label,val,subs){ return '<div class="kpi-card'+(cls?' '+cls:'')+'"><div class="kpi-main"><div class="m-lab">'+label+'</div><div class="m-val">'+val+'</div></div><div class="kpi-sub">'+subs+'</div></div>'; }
function renderKpi(a,p){
  var roas=dv(a.rev,a.spend), lucro=a.rev-a.spend, cac=dv(a.spend,a.sales), ticket=dv(a.rev,a.sales);
  var taxaCompra=dv(a.sales,a.checkout);
  var fatTot=a.rev+(a.upRev||0), roasUp=dv(fatTot,a.spend), lucroTot=fatTot-a.spend;
  var hero='<div class="kpi-hero"><div class="h-lab">Investimento com imposto</div>'
    +'<div class="h-val">'+money(a.spend)+'</div>'
    +'<div class="h-foot"><span>Gerenciador <b>'+money0(a.spendRaw)+'</b></span>'
    +'<span>imposto <b>+13,85%</b></span></div></div>';
  var cards='';
  cards+=kpiCard('hl','Faturamento',money0(a.rev),
    subRow('Lucro (fat. − invest.)', '<span class="'+(lucro>=0?'pos':'neg')+'">'+money0(lucro)+'</span>', '')
    + subRow('Ticket médio', a.sales?money(ticket):'—', trendHTML(ticket,dv(p.rev,p.sales),true)));
  cards+=kpiCard('hl','Vendas',intf(a.sales),
    subRow('CPA / CAC', a.sales?money(cac):'—', trendHTML(cac,dv(p.spend,p.sales),false))
    + subRow('Checkout → venda', a.checkout?pct(taxaCompra*100):'—', trendHTML(taxaCompra,dv(p.sales,p.checkout),true)));
  // ---- ROAS: front-end + FINAL (c/ upsell) lado a lado, o final DESTACADO ----
  var barw=clamp(roasUp/2)*100, barcol=roasUp>=1?COL.gold:(roasUp>=0.8?COL.gold:'#ff5c7a');
  var beTxt=(roasUp>=1?'✓ no lucro':pct(roasUp*100)+' do equilíbrio');
  if(a.upRev>0){
    cards+='<div class="kpi-card gold roas-duo">'
      +'<div class="rd fe"><div class="rd-lab">ROAS front-end</div><div class="rd-val">'+roasf(roas)+'</div>'
        +'<div class="rd-sub">só '+esc(PRODUTO)+' '+trendHTML(roas,dv(p.rev,p.spend),true)+'</div></div>'
      +'<div class="rd final"><div class="rd-lab">★ ROAS final · c/ upsell</div><div class="rd-val">'+roasf(roasUp)+'</div>'
        +'<div class="rd-sub">'+beTxt+' · fat. total '+money0(fatTot)+'</div>'
        +'<div class="mini-bar"><span style="width:'+barw.toFixed(0)+'%;background:'+barcol+'"></span></div></div>'
      +'</div>';
  } else {
    cards+=kpiCard('gold','ROAS c/ imposto',roasf(roas),
      subRow('Retorno por R$ 1', 'R$ '+roasf(roas), trendHTML(roas,dv(p.rev,p.spend),true))
      +'<div class="sub-row"><span class="s-l">break-even (1,00)</span><span class="s-v">'+beTxt+'</span></div>'
      +'<div class="mini-bar"><span style="width:'+barw.toFixed(0)+'%;background:'+barcol+'"></span></div>');
  }
  el('m-kpi').innerHTML=hero+cards;
}

/* =================== PIXEL META (referência) =================== */
function pxl(l,v,s){ return '<div class="pxl"><div class="p-l">'+l+'</div><div class="p-v">'+v+'</div><div class="p-s">'+s+'</div></div>'; }
function renderPixel(a){
  var freq=dv(a.impr,a.reach), roasPix=dv(a.mrev,a.spend), cpaPix=dv(a.spend,a.mpur);
  el('m-pixel').innerHTML=
    pxl('Alcance', intf(a.reach), 'frequência '+nf1.format(freq)+'× · '+intf(a.impr)+' impressões')
    +pxl('Compras (pixel Meta)', intf(a.mpur), '<b>'+intf(a.sales)+'</b> venda(s) confirmada(s) na planilha')
    +pxl('Valor de conversão', money0(a.mrev), 'receita que o Meta atribui ao pixel')
    +pxl('ROAS pixel c/ imposto', a.spend>0?roasf(roasPix):'—', a.mpur?('custo/compra '+money0(cpaPix)):'sem compras no pixel');
}

/* =================== UPSELL (Prosperus) =================== */
function pxlG(l,v,s){ return '<div class="pxl gold"><div class="p-l">'+l+'</div><div class="p-v">'+v+'</div><div class="p-s">'+s+'</div></div>'; }
function renderUpsell(a){
  var card=el('m-upsell-card'); if(!card) return;
  if(!(a.upSales>0) && !(a.upRev>0)){ card.style.display='none'; return; }
  card.style.display='';
  var take=dv(a.upSales,a.sales)*100, ticket=dv(a.upRev,a.upSales), fatTot=a.rev+a.upRev, roasUp=dv(fatTot,a.spend), roasFe=dv(a.rev,a.spend);
  el('m-upsell').innerHTML=
    pxlG('Upsells', intf(a.upSales), 'take-rate '+pct(take)+' das '+intf(a.sales)+' vendas front-end')
    +pxlG('Faturamento upsell', money0(a.upRev), 'ticket '+(a.upSales?money(ticket):'—'))
    +pxlG('Faturamento total', money0(fatTot), 'front-end '+money0(a.rev)+' + upsell '+money0(a.upRev))
    +pxlG('ROAS c/ upsell', a.spend>0?roasf(roasUp):'—', 'só front-end era '+roasf(roasFe));
}

/* =================== FUNNEL (VSL, 7 estágios) =================== */
var FN_W=[100,88,74,58,47,35,26];
var FN_COL=['#cbb6ff','#b18cff','#9a6cff','#8b5cf6','#7c5cff','#f6c445','#ffd257'];
var STAGES=[
  {k:'impr',l:'Impressões',cost:'CPM',costfn:function(a){return dv(a.spend,a.impr)*1000;},rate:'Hook 3s',ratefn:function(a){return dv(a.v3,a.impr);}},
  {k:'v3',l:'Vídeo 3s',cost:'Custo/3s',costfn:function(a){return dv(a.spend,a.v3);},rate:'Hold 75%',ratefn:function(a){return dv(a.v75,a.v3);}},
  {k:'v75',l:'Vídeo 75%',cost:'Custo/75%',costfn:function(a){return dv(a.spend,a.v75);},rate:'CTR',ratefn:function(a){return dv(a.clicks,a.impr);}},
  {k:'clicks',l:'Cliques',cost:'CPC',costfn:function(a){return dv(a.spend,a.clicks);},rate:'Connect',ratefn:function(a){return dv(a.lpv,a.clicks);}},
  {k:'lpv',l:'View LP',cost:'Custo/LPV',costfn:function(a){return dv(a.spend,a.lpv);},rate:'Checkout',ratefn:function(a){return dv(a.checkout,a.lpv);}},
  {k:'checkout',l:'Checkouts',cost:'Custo/Chk',costfn:function(a){return dv(a.spend,a.checkout);},rate:'Compra',ratefn:function(a){return dv(a.sales,a.checkout);}},
  {k:'sales',l:'Vendas',cost:'CPA',costfn:function(a){return dv(a.spend,a.sales);},rate:null}
];
function renderFunnel(a,p){
  var html='<div class="funnel">';
  for(var i=0;i<STAGES.length;i++){
    var s=STAGES[i], val=a[s.k]||0, cost=s.costfn(a), pcost=s.costfn(p);
    var costHtml='<div class="fs-v">'+money(cost)+'</div><div>'+s.cost+' '+trendHTML(cost,pcost,false)+'</div>';
    var rateHtml='';
    if(s.rate){ var rt=s.ratefn(a), prt=s.ratefn(p); rateHtml='<div class="fs-v">'+pct(rt*100)+'</div><div>'+s.rate+' '+trendHTML(rt,prt,true)+'</div>'; }
    html+='<div class="fn-stage">'
      +'<div class="fn-side right">'+costHtml+'</div>'
      +'<div class="fn-bar-wrap"><div class="fn-bar" style="width:'+FN_W[i]+'%;background:linear-gradient(180deg,'+FN_COL[i]+',rgba(0,0,0,.14))">'
      +'<span class="fn-n">'+intf(val)+'</span><span class="fn-l">'+s.l+'</span></div></div>'
      +'<div class="fn-side">'+rateHtml+'</div></div>';
    if(i<STAGES.length-1) html+='<div class="fn-rate"><span class="ar">↓</span></div>';
  }
  html+='</div>';
  el('m-funnel').innerHTML=html;
}

/* =================== CHARTS =================== */
function xticks(days){ var n=days.length; if(n<=1)return [0]; var step=Math.max(1,Math.round(n/7)); var t=[]; for(var i=0;i<n;i+=step)t.push(i); if(t[t.length-1]!==n-1)t.push(n-1); return t; }
var _tip=null;
function tipEl(){ if(!_tip){ _tip=document.createElement('div'); _tip.className='chart-tip'; _tip.style.display='none'; document.body.appendChild(_tip); } return _tip; }
function tipShow(html,x,y){ var t=tipEl(); t.innerHTML=html; t.style.display='block'; var w=t.offsetWidth,h=t.offsetHeight,nx=x+14,ny=y+14; if(nx+w>window.innerWidth-8)nx=x-w-14; if(ny+h>window.innerHeight-8)ny=y-h-14; t.style.left=Math.max(6,nx)+'px'; t.style.top=Math.max(6,ny)+'px'; }
function tipHide(){ if(_tip)_tip.style.display='none'; }
function hitRects(days,pl,gw,pt,ph){ var s=''; for(var i=0;i<days.length;i++){ s+='<rect class="hit" data-i="'+i+'" x="'+(pl+gw*i).toFixed(1)+'" y="'+pt+'" width="'+gw.toFixed(1)+'" height="'+ph+'" fill="transparent" pointer-events="all"/>'; } return s; }
function bindHits(cid,days,fmt){ var c=el(cid); if(!c)return; Array.prototype.forEach.call(c.querySelectorAll('.hit'),function(r){
  r.addEventListener('mousemove',function(e){ var i=+r.getAttribute('data-i'); if(days[i])tipShow(fmt(days[i]),e.clientX,e.clientY); });
  r.addEventListener('mouseleave',tipHide); }); }
function renderChartSales(days){
  var W=560,H=200,pl=32,pr=34,pt=12,pb=22,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxV=Math.max.apply(null,days.map(function(d){return d.sales||0;}).concat([1]));
  var maxR=Math.max.apply(null,days.map(function(d){return d.rev||0;}).concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(2,Math.min(16,gw*0.5));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#1a1a38" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#645e8f" font-size="9">'+Math.round(maxV*f)+'</text>'; });
  days.forEach(function(d,i){ var xc=pl+gw*i+gw/2, vh=ph*dv(d.sales,maxV); if(d.sales>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-vh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+vh.toFixed(1)+'" rx="1.5" fill="rgba(139,92,246,.62)"/>'; });
  var pts=[]; days.forEach(function(d,i){ var xc=pl+gw*i+gw/2, y=base-ph*dv(d.rev,maxR); pts.push([xc,y]); });
  if(pts.length>1){ s+='<path d="M'+pts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' L')+'" fill="none" stroke="'+COL.gold+'" stroke-width="2"/>'; }
  pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.4" fill="'+COL.gold+'"/>'; });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#645e8f" font-size="9">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  el('m-chartSales').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(139,92,246,.7)"></span>Vendas</span><span><span class="ln" style="background:'+COL.gold+'"></span>Faturamento</span></div>';
  bindHits('m-chartSales',days,function(d){ return '<div class="tt-d">'+fmtBR(d.date)+'</div><div class="tt-r"><span style="color:'+COL.vio2+'">Vendas</span><b>'+intf(d.sales)+'</b></div><div class="tt-r"><span style="color:'+COL.gold2+'">Faturamento</span><b>'+money0(d.rev)+'</b></div><div class="tt-sub">CPA '+(d.sales?money(dv(d.spend,d.sales)):'—')+' · ROAS '+roasf(dv(d.rev,d.spend))+'</div>'; });
}
function renderChartRoas(days){
  var W=560,H=200,pl=34,pr=30,pt=12,pb=22,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxS=Math.max.apply(null,days.map(function(d){return d.spend||0;}).concat([1]));
  var roas=days.map(function(d){return dv(d.rev,d.spend);});
  var maxR=Math.max.apply(null,roas.concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(2,Math.min(16,gw*0.55));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#1a1a38" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#645e8f" font-size="9">'+Math.round(maxS*f)+'</text>';
    s+='<text x="'+(W-pr+3)+'" y="'+(y+3)+'" text-anchor="start" fill="#b99a2e" font-size="9">'+nf1.format(maxR*f)+'</text>'; });
  if(maxR>0){ var y1=base-ph*clamp(1/maxR); s+='<line x1="'+pl+'" y1="'+y1.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y1.toFixed(1)+'" stroke="rgba(47,224,127,.5)" stroke-dasharray="4 3"/>'; }
  days.forEach(function(d,i){ var xc=pl+gw*i+gw/2, sh=ph*dv(d.spend,maxS); if(d.spend>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-sh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="1.5" fill="rgba(167,139,250,.34)"/>'; });
  var pts=[]; days.forEach(function(d,i){ if(d.spend>0){ var xc=pl+gw*i+gw/2, y=base-ph*clamp(roas[i]/maxR); pts.push([xc,y]); } });
  if(pts.length>1){ s+='<path d="M'+pts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' L')+'" fill="none" stroke="'+COL.gold+'" stroke-width="2"/>'; }
  pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" fill="'+COL.gold+'"/>'; });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#645e8f" font-size="9">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  el('m-chartRoas').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(167,139,250,.6)"></span>Investimento</span><span><span class="ln" style="background:'+COL.gold+'"></span>ROAS</span><span style="color:var(--muted2)">tracejado = break-even</span></div>';
  bindHits('m-chartRoas',days,function(d){ return '<div class="tt-d">'+fmtBR(d.date)+'</div><div class="tt-r"><span style="color:'+COL.meta+'">Investimento</span><b>'+money0(d.spend)+'</b></div><div class="tt-r"><span style="color:'+COL.gold2+'">ROAS</span><b>'+roasf(dv(d.rev,d.spend))+'</b></div><div class="tt-sub">Vendas '+intf(d.sales)+' · Fat. '+money0(d.rev)+'</div>'; });
}

/* =================== DAILY TABLE (meta) =================== */
function heatBg(rgb,frac){ return 'background:rgba('+rgb+','+(0.10+0.42*clamp(frac)).toFixed(3)+')'; }
function renderDaily(rng){
  var rows=metaDays(rng).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var maxS=Math.max.apply(null,rows.map(function(r){return r.spend||0;}).concat([1]));
  var medCac=median(rows.map(function(r){return r.sales>0?dv(r.spend,r.sales):null;}));
  var head='<thead><tr><th>Dia</th><th>Investimento</th><th>Impr.</th><th>Vídeo 3s</th><th>Cliques</th><th>LPV</th><th>Vendas</th><th>Upsell</th><th>CPA</th><th>Faturamento</th><th>Fat. Total</th><th>ROAS</th><th>Lucro</th></tr></thead>';
  var body=rows.map(function(r){ var fatT=r.rev+(r.upRev||0), roas=dv(r.rev,r.spend), cac=r.sales>0?dv(r.spend,r.sales):null, lucro=fatT-r.spend;
    return '<tr><td>'+fmtBR(r.date)+'</td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('167,139,250',r.spend/maxS)+'">'+money0(r.spend)+'</span></td>'
      +'<td class="num">'+intf(r.impr)+'</td>'
      +'<td class="num">'+intf(r.v3)+'</td>'
      +'<td class="num">'+intf(r.clicks)+'</td>'
      +'<td class="num">'+intf(r.lpv)+'</td>'
      +'<td class="num">'+intf(r.sales)+'</td>'
      +'<td class="num">'+((r.upSales||0)>0?'<span class="vid-pill" style="color:var(--gold2);background:var(--gold-dim)">'+intf(r.upSales)+'</span>':'—')+'</td>'
      +'<td class="num">'+(cac!=null?'<span class="cac-pill '+cacClass(cac,medCac)+'">'+money0(cac)+'</span>':'—')+'</td>'
      +'<td class="num">'+money0(r.rev)+'</td>'
      +'<td class="num">'+money0(fatT)+'</td>'
      +'<td class="num">'+(r.spend>0?'<span class="roas-pill '+roasClass(roas)+'">'+roasf(roas)+'</span>':'—')+'</td>'
      +'<td class="num '+(lucro>=0?'pos':'neg')+'">'+money0(lucro)+'</td></tr>'; }).join('');
  if(!rows.length) body='<tr><td colspan="13" class="empty">Sem dados no período.</td></tr>';
  var a=aggMeta(rng), fatTa=a.rev+(a.upRev||0), tr=dv(a.rev,a.spend), tl=fatTa-a.spend, tc=a.sales>0?dv(a.spend,a.sales):null;
  var foot='<tfoot><tr><td>Total</td><td class="num">'+money0(a.spend)+'</td><td class="num">'+intf(a.impr)+'</td><td class="num">'+intf(a.v3)+'</td><td class="num">'+intf(a.clicks)+'</td><td class="num">'+intf(a.lpv)+'</td><td class="num">'+intf(a.sales)+'</td><td class="num">'+((a.upSales||0)>0?intf(a.upSales):'—')+'</td><td class="num">'+(tc!=null?money0(tc):'—')+'</td><td class="num">'+money0(a.rev)+'</td><td class="num">'+money0(fatTa)+'</td><td class="num">'+(a.spend>0?roasf(tr):'—')+'</td><td class="num '+(tl>=0?'pos':'neg')+'">'+money0(tl)+'</td></tr></tfoot>';
  el('m-daily').innerHTML=head+'<tbody>'+body+'</tbody>'+foot;
}

/* =================== FILTRO por campanha/conjunto/anúncio (gráficos Meta) =================== */
var treeFilter=null; // {campaign, adset, ad} ou null
function nodeMatchesFilter(r){
  if(!treeFilter) return true;
  if(treeFilter.campaign!=null && r.campaign!==treeFilter.campaign) return false;
  if(treeFilter.adset!=null && r.adset!==treeFilter.adset) return false;
  if(treeFilter.ad!=null && r.ad!==treeFilter.ad) return false;
  return true;
}
function filteredMetaDays(rng){
  if(!treeFilter) return metaDays(rng);
  var map={};
  META._grain.forEach(function(r){ if(!inRange(r.date,rng))return; if(!nodeMatchesFilter(r))return;
    var o=map[r.date]||(map[r.date]={date:r.date,spend:0,spendRaw:0,impr:0,clicks:0,lpv:0,checkout:0,sales:0,rev:0,upSales:0,upRev:0});
    o.spend+=r.spend||0;o.spendRaw+=r.spendRaw||0;o.impr+=r.impr||0;o.clicks+=r.clicks||0;o.lpv+=r.lpv||0;o.checkout+=r.checkout||0;o.sales+=r.sales||0;o.rev+=r.rev||0; });
  return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return a.date.localeCompare(b.date);});
}
function filterLabel(){ if(!treeFilter) return '';
  var parts=[]; if(treeFilter.campaign!=null)parts.push(treeFilter.campaign); if(treeFilter.adset!=null)parts.push(treeFilter.adset); if(treeFilter.ad!=null)parts.push(treeFilter.ad);
  return parts.map(function(x){return x==='SEM_RASTREIO'?'— sem rastreio —':x;}).join(' › '); }
function renderChartFilter(){
  var e=el('m-chartFilter'); if(!e)return;
  if(!treeFilter){ e.innerHTML='<span class="cf-hint">💡 clique no nome de uma <b>campanha, conjunto ou anúncio</b> na tabela de otimização (abaixo) p/ filtrar estes 2 gráficos só por ela</span>'; return; }
  e.innerHTML='<span class="cf-chip">Filtrando por: <b>'+esc(filterLabel())+'</b> <button id="cf-clear" title="limpar filtro">✕ limpar</button></span>';
  var b=el('cf-clear'); if(b)b.addEventListener('click',function(){ treeFilter=null; applyChartFilter(); });
}
function applyChartFilter(){ var days=filteredMetaDays(rangeFor(period)); renderChartSales(days); renderChartRoas(days); renderChartFilter(); }

/* =================== OTIMIZAÇÃO (árvore) =================== */
function prettyName(x){ return x==='SEM_RASTREIO' ? '— sem rastreio —' : x; }
function newNode(name,full){ return {name:name,full:full,spend:0,impr:0,reach:0,clicks:0,lpv:0,v3:0,v75:0,checkout:0,mpur:0,mrev:0,sales:0,rev:0,kids:{}}; }
function accum(n,r){ n.spend+=r.spend||0;n.impr+=r.impr||0;n.reach+=r.reach||0;n.clicks+=r.clicks||0;n.lpv+=r.lpv||0;n.v3+=r.v3||0;n.v75+=r.v75||0;n.checkout+=r.checkout||0;n.mpur+=r.mpur||0;n.mrev+=r.mrev||0;n.sales+=r.sales||0;n.rev+=r.rev||0; }
var expanded={}, treeInit=false;
function buildTree(rows){ var c={}; rows.forEach(function(r){
  var cn=c[r.campaign]||(c[r.campaign]=newNode(prettyName(r.campaign),r.campaign)); accum(cn,r);
  var sn=cn.kids[r.adset]||(cn.kids[r.adset]=newNode(prettyName(r.adset),r.adset)); accum(sn,r);
  var an=sn.kids[r.ad]||(sn.kids[r.ad]=newNode(prettyName(r.ad),r.ad)); accum(an,r); }); return c; }
function actTag(n,medRoas){
  if(n.spend===0 && n.sales>0) return {t:'s/ gasto',c:'act-ins'};
  if(n.spend>0 && n.sales===0) return {t:'Pausar',c:'act-pause'};
  if(n.sales<2) return {t:'Dado insuf.',c:'act-ins'};
  if(medRoas<=0) return {t:'—',c:'act-ins'};
  var r=dv(n.rev,n.spend)/medRoas;
  if(r>=1.2) return {t:'Acelerar',c:'act-acel'};
  if(r<=0.6) return {t:'Revisar',c:'act-rev'};
  return {t:'Manter',c:'act-mant'};
}
function metricsCells(n,medRoas,medCac){ var roas=dv(n.rev,n.spend), cac=(n.sales>0&&n.spend>0)?dv(n.spend,n.sales):null, tag=actTag(n,medRoas);
  var cpm=n.impr>0?dv(n.spend,n.impr)*1000:null, ctr=n.impr>0?dv(n.clicks,n.impr)*100:null, cpc=n.clicks>0?dv(n.spend,n.clicks):null;
  var hook=n.impr>0?dv(n.v3,n.impr)*100:null, hold=n.v3>0?dv(n.v75,n.v3)*100:null;
  var lpchk=n.lpv>0?dv(n.checkout,n.lpv)*100:null, chkc=n.checkout>0?dv(n.sales,n.checkout)*100:null, convt=n.lpv>0?dv(n.sales,n.lpv)*100:null;
  return '<td class="num">'+money0(n.spend)+'</td>'
    +'<td class="num">'+(cpm!=null?money(cpm):'—')+'</td>'
    +'<td class="num">'+(ctr!=null?pct(ctr):'—')+'</td>'
    +'<td class="num">'+(cpc!=null?money(cpc):'—')+'</td>'
    +'<td class="num">'+(hook!=null?'<span class="vid-pill">'+pct(hook)+'</span>':'—')+'</td>'
    +'<td class="num">'+(hold!=null?'<span class="vid-pill">'+pct(hold)+'</span>':'—')+'</td>'
    +'<td class="num">'+intf(n.checkout)+'</td>'
    +'<td class="num">'+(lpchk!=null?pct(lpchk):'—')+'</td>'
    +'<td class="num">'+(chkc!=null?pct(chkc):'—')+'</td>'
    +'<td class="num">'+intf(n.sales)+'</td>'
    +'<td class="num">'+(convt!=null?'<span class="conv-pill">'+pct(convt)+'</span>':'—')+'</td>'
    +'<td class="num">'+(cac!=null?'<span class="cac-pill '+cacClass(cac,medCac)+'">'+money0(cac)+'</span>':'—')+'</td>'
    +'<td class="num">'+money0(n.rev)+'</td>'
    +'<td class="num">'+(n.spend>0?'<span class="roas-pill '+roasClass(roas)+'">'+roasf(roas)+'</span>':'—')+'</td>'
    +'<td class="num"><span class="act '+tag.c+'">'+tag.t+'</span></td>'; }
function treeRow(n,lvl,key,hasKids,medR,medC,fd){
  var caret=hasKids?'<span class="caret'+(expanded[key]?' open':'')+'">▶</span>':'<span class="caret" style="opacity:.2">•</span>';
  var da='data-fc="'+encodeURIComponent((fd&&fd.campaign!=null)?fd.campaign:'')+'"';
  if(fd&&fd.adset!=null) da+=' data-fs="'+encodeURIComponent(fd.adset)+'"';
  if(fd&&fd.ad!=null) da+=' data-fa="'+encodeURIComponent(fd.ad)+'"';
  var isF=treeFilter && (fd&&fd.campaign===treeFilter.campaign) && ((fd.adset==null?null:fd.adset)===(treeFilter.adset==null?null:treeFilter.adset)) && ((fd.ad==null?null:fd.ad)===(treeFilter.ad==null?null:treeFilter.ad));
  return '<tr class="lvl'+lvl+(hasKids?' parent':'')+(isF?' filt-on':'')+'" data-key="'+encodeURIComponent(key)+'"><td>'+caret+'<span class="name filt" '+da+' title="filtrar gráficos por: '+esc(n.full||n.name)+'">'+esc(n.name)+'</span></td>'+metricsCells(n,medR,medC)+'</tr>';
}
var treeSort={key:'rev',rev:false};
var ACT_RANK={'Acelerar':0,'Manter':1,'Revisar':2,'Pausar':3,'s/ gasto':4,'Dado insuf.':5};
var TREE_COLS=[{k:'name',l:'Campanha › Conjunto › Anúncio'},{k:'spend',l:'Gasto'},{k:'cpm',l:'CPM'},{k:'ctr',l:'CTR'},{k:'cpc',l:'CPC'},{k:'hook',l:'Hook'},{k:'hold',l:'Hold'},{k:'checkout',l:'Chk'},{k:'lpchk',l:'LP→Chk'},{k:'chkcompra',l:'Chk→Compra'},{k:'sales',l:'Vendas'},{k:'convtot',l:'Conv. total'},{k:'cac',l:'CPA'},{k:'rev',l:'Faturamento'},{k:'roas',l:'ROAS'},{k:'act',l:'Ação'}];
function sortValOf(key,n,medR){
  if(key==='spend') return -(n.spend||0);
  if(key==='checkout') return -(n.checkout||0);
  if(key==='sales') return -(n.sales||0);
  if(key==='rev')   return -(n.rev||0);
  if(key==='cpm')   return n.impr>0?dv(n.spend,n.impr)*1000:Infinity;
  if(key==='ctr')   return n.impr>0?-dv(n.clicks,n.impr):Infinity;
  if(key==='cpc')   return n.clicks>0?dv(n.spend,n.clicks):Infinity;
  if(key==='hook')  return n.impr>0?-dv(n.v3,n.impr):Infinity;
  if(key==='hold')  return n.v3>0?-dv(n.v75,n.v3):Infinity;
  if(key==='lpchk')     return n.lpv>0?-dv(n.checkout,n.lpv):Infinity;
  if(key==='chkcompra') return n.checkout>0?-dv(n.sales,n.checkout):Infinity;
  if(key==='convtot')   return n.lpv>0?-dv(n.sales,n.lpv):Infinity;
  if(key==='cac')   return (n.sales>0&&n.spend>0)?dv(n.spend,n.sales):Infinity;
  if(key==='roas')  return n.spend>0?-dv(n.rev,n.spend):Infinity;
  if(key==='act'){ var r=ACT_RANK[actTag(n,medR).t]; return r==null?9:r; }
  return 0;
}
function renderTree(rng){
  var ss=treeSort;
  var rows=META._grain.filter(function(r){return inRange(r.date,rng);});
  var camps=buildTree(rows);
  var leafR=[],leafC=[]; Object.keys(camps).forEach(function(cK){ if(cK==='SEM_RASTREIO')return; var c=camps[cK]; Object.keys(c.kids).forEach(function(sK){ var sN=c.kids[sK]; Object.keys(sN.kids).forEach(function(aK){ var an=sN.kids[aK]; if(an.spend>0&&an.sales>0){leafR.push(dv(an.rev,an.spend));leafC.push(dv(an.spend,an.sales));} }); }); });
  var medR=median(leafR), medC=median(leafC);
  function cmp(a,b){
    if(ss.key==='name'){ var rn=String(a.name).localeCompare(String(b.name),'pt',{numeric:true}); return ss.rev?-rn:rn; }
    var va=sortValOf(ss.key,a,medR), vb=sortValOf(ss.key,b,medR);
    var na=!isFinite(va), nb=!isFinite(vb);
    if(na&&nb) return (b.rev||0)-(a.rev||0);
    if(na) return 1; if(nb) return -1;
    var r=va-vb; if(r===0){ r=(b.rev||0)-(a.rev||0); }
    return ss.rev?-r:r;
  }
  function skeys(obj){ return Object.keys(obj).sort(function(x,y){ return cmp(obj[x],obj[y]); }); }
  var order=skeys(camps);
  if(!treeInit){ order.slice(0,4).forEach(function(cK){ expanded['c:'+cK]=true; }); treeInit=true; }
  var head='<thead><tr>'+TREE_COLS.map(function(c){ var on=ss.key===c.k;
    return '<th class="sortable'+(on?' sorton':'')+'" data-col="'+c.k+'">'+c.l+(on?' <span class="sarr">'+(ss.rev?'▲':'▼')+'</span>':'')+'</th>'; }).join('')+'</tr></thead>';
  var out=[];
  order.forEach(function(cK){ var c=camps[cK],cKey='c:'+cK,cHas=Object.keys(c.kids).length>0; out.push(treeRow(c,0,cKey,cHas,medR,medC,{campaign:cK}));
    if(expanded[cKey]){ skeys(c.kids).forEach(function(sK){ var sN=c.kids[sK],sKey=cKey+'|s:'+sK,sHas=Object.keys(sN.kids).length>0; out.push(treeRow(sN,1,sKey,sHas,medR,medC,{campaign:cK,adset:sK}));
      if(expanded[sKey]){ skeys(sN.kids).forEach(function(aK){ out.push(treeRow(sN.kids[aK],2,sKey+'|a:'+aK,false,medR,medC,{campaign:cK,adset:sK,ad:aK})); }); } }); } });
  if(!out.length) out.push('<tr><td colspan="16" class="empty">Sem dados no período.</td></tr>');
  var tEl=el('m-tree'); tEl.innerHTML=head+'<tbody>'+out.join('')+'</tbody>';
  el('m-treeLegend').innerHTML='<span><span class="act act-acel">Acelerar</span> ROAS ≥ 1,2× a mediana</span><span><span class="act act-rev">Revisar</span> ROAS ≤ 0,6×</span><span><span class="act act-pause">Pausar</span> gastou e não vendeu</span><span style="color:var(--muted2)">Hook=3s/impr · Hold=75%/3s · <b>LP→Chk</b>=checkout/view LP · <b>Chk→Compra</b>=venda/checkout · <b>Conv. total</b>=venda/view LP · clique num cabeçalho p/ ordenar</span>';
  Array.prototype.forEach.call(tEl.querySelectorAll('th.sortable'),function(th){
    th.addEventListener('click',function(){ var k=th.getAttribute('data-col'); var s=treeSort;
      if(s.key===k){ s.rev=!s.rev; } else { s.key=k; s.rev=false; } renderTree(rangeFor(period)); }); });
  Array.prototype.forEach.call(tEl.querySelectorAll('tr.parent'),function(tr){
    tr.addEventListener('click',function(){ var k=decodeURIComponent(tr.getAttribute('data-key')); expanded[k]=!expanded[k]; renderTree(rangeFor(period)); }); });
  // clique no NOME filtra os graficos por aquela campanha/conjunto/anuncio (nao mexe no expand da linha)
  Array.prototype.forEach.call(tEl.querySelectorAll('.name.filt'),function(sp){
    sp.addEventListener('click',function(ev){ ev.stopPropagation();
      var fc=sp.getAttribute('data-fc'), fs=sp.getAttribute('data-fs'), fa=sp.getAttribute('data-fa');
      var nf={campaign:(fc?decodeURIComponent(fc):''), adset:(fs!=null?decodeURIComponent(fs):null), ad:(fa!=null?decodeURIComponent(fa):null)};
      var same=treeFilter && treeFilter.campaign===nf.campaign && treeFilter.adset===nf.adset && treeFilter.ad===nf.ad;
      treeFilter = same ? null : nf;
      applyChartFilter(); renderTree(rangeFor(period));
      var cc=el('m-chartFilter'); if(cc&&cc.scrollIntoView){ cc.scrollIntoView({behavior:'smooth',block:'center'}); }
    }); });
}

/* =================== INSIGHTS =================== */
function aggBy(rows,keyf){ var m={}; rows.forEach(function(r){ var k=keyf(r); if(k==null)return; var n=m[k]||(m[k]={key:k,spend:0,sales:0,rev:0,clicks:0}); n.spend+=r.spend||0;n.sales+=r.sales||0;n.rev+=r.rev||0;n.clicks+=r.clicks||0; }); return Object.keys(m).map(function(k){return m[k];}); }
function insCard(kind,icon,tag,title,desc){ return '<div class="ins '+kind+'"><div class="ic">'+icon+'</div><div><div class="it">'+title+'</div><div class="id">'+desc+'</div><span class="tag">'+tag+'</span></div></div>'; }
function renderInsights(rng){
  var rows=META._grain.filter(function(r){return inRange(r.date,rng);});
  var a=aggMeta(rng), accRoas=dv(a.rev,a.spend), out=[];
  var camps=aggBy(rows,function(r){return r.campaign==='SEM_RASTREIO'?null:r.campaign;}).filter(function(n){return n.spend>0;});
  var ads=aggBy(rows,function(r){return (r.ad==='SEM_RASTREIO'||r.campaign==='SEM_RASTREIO')?null:r.ad+' ⟨'+r.campaign+'⟩';}).filter(function(n){return n.spend>0;});
  function rz(n){return dv(n.rev,n.spend);}
  function shortAd(k){ return k.split(' ⟨')[0]; }
  var accel=camps.filter(function(n){return n.sales>=2 && rz(n)>=Math.max(1, accRoas*1.1);}).sort(function(x,y){return rz(y)-rz(x);});
  accel.slice(0,2).forEach(function(n){ out.push(insCard('acel','🚀','Escalar',esc(n.key.length>52?n.key.slice(0,52)+'…':n.key),
    'ROAS <b>'+roasf(rz(n))+'</b> · <b>'+intf(n.sales)+'</b> vendas · CPA <b>'+money0(dv(n.spend,n.sales))+'</b> · gasto '+money0(n.spend)+'. Tem espaço p/ aumentar orçamento.')); });
  var goodAds=ads.filter(function(n){return n.sales>=2;}).sort(function(x,y){return rz(y)-rz(x);});
  if(goodAds.length){ var g=goodAds[0]; if(rz(g)>=accRoas*1.05) out.push(insCard('acel','🎯','Criativo campeão',esc(shortAd(g.key)),
    'Melhor ROAS entre os anúncios: <b>'+roasf(rz(g))+'</b> · '+intf(g.sales)+' vendas · CPA '+money0(dv(g.spend,g.sales))+'. Vale duplicar em novos conjuntos/públicos.')); }
  var noSale=camps.filter(function(n){return n.sales===0 && n.spend>=(a.spend*0.02);}).sort(function(x,y){return y.spend-x.spend;});
  noSale.slice(0,2).forEach(function(n){ out.push(insCard('pause','⛔','Pausar',esc(n.key.length>52?n.key.slice(0,52)+'…':n.key),
    'Gastou <b>'+money0(n.spend)+'</b> e <b>não gerou venda</b> no período. Candidata a pausa imediata.')); });
  var bleed=camps.filter(function(n){return n.sales>0 && rz(n)<=accRoas*0.6 && n.spend>=(a.spend*0.03);}).sort(function(x,y){return (x.rev-x.spend)-(y.rev-y.spend);});
  bleed.slice(0,2).forEach(function(n){ out.push(insCard('pause','⚠️','Revisar',esc(n.key.length>52?n.key.slice(0,52)+'…':n.key),
    'ROAS <b>'+roasf(rz(n))+'</b> (abaixo da média '+roasf(accRoas)+') · gasto '+money0(n.spend)+' p/ '+money0(n.rev)+'. Reveja criativo/público ou corte.')); });
  out.push(insCard('info','📊','Panorama do período',
    accRoas>=1?'No lucro (ROAS '+roasf(accRoas)+')':'Break-even em ROAS 1,00 — falta '+pct(Math.max(0,(1-accRoas))*100)+' p/ empatar',
    '<b>'+intf(a.sales)+'</b> vendas · faturamento <b>'+money0(a.rev)+'</b> · investimento '+money0(a.spend)+' · CPA médio '+(a.sales?money0(dv(a.spend,a.sales)):'—')+' · ticket '+(a.sales?money(dv(a.rev,a.sales)):'—')+'.'));
  if(!out.length) out.push('<div class="empty">Sem dados suficientes no período p/ gerar insights.</div>');
  el('m-insights').innerHTML=out.join('');
}

/* =================== VENDAS =================== */
function aggVen(rng){ var o={feS:0,feR:0,upS:0,upR:0};
  VEN.daily.forEach(function(d){ if(!inRange(d.date,rng))return; o.feS+=d.feS||0;o.feR+=d.feR||0;o.upS+=d.upS||0;o.upR+=d.upR||0; }); return o; }
function qcard(cls,lab,val,sub){ return '<div class="qcard'+(cls?' '+cls:'')+'"><div class="q-l">'+lab+'</div><div class="q-v">'+val+'</div>'+(sub?'<div class="q-s">'+sub+'</div>':'')+'</div>'; }
function renderVChart(rng){
  var days=VEN.daily.filter(function(d){return isDate(d.date)&&inRange(d.date,rng);}).sort(function(a,b){return a.date.localeCompare(b.date);});
  var W=1120,H=230,pl=34,pr=16,pt=12,pb=24,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxV=Math.max.apply(null,days.map(function(d){return (d.feS||0)+(d.upS||0);}).concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(2,Math.min(22,gw*0.6));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#1a1a38" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#645e8f" font-size="9">'+Math.round(maxV*f)+'</text>'; });
  days.forEach(function(d,i){ var xc=pl+gw*i+gw/2, tot=(d.feS||0)+(d.upS||0); if(tot<=0)return;
    var feh=ph*dv(d.feS,maxV), uph=ph*dv(d.upS,maxV);
    s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-feh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+feh.toFixed(1)+'" rx="1.5" fill="rgba(139,92,246,.78)"/>';
    s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-feh-uph).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+uph.toFixed(1)+'" rx="1.5" fill="rgba(246,196,69,.85)"/>'; });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-6)+'" text-anchor="middle" fill="#645e8f" font-size="9">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  el('v-chart').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(139,92,246,.8)"></span>Front-end</span><span><span class="dot" style="background:rgba(246,196,69,.85)"></span>Upsell</span></div>';
  bindHits('v-chart',days,function(d){ var tot=(d.feS||0)+(d.upS||0), rev=(d.feR||0)+(d.upR||0); return '<div class="tt-d">'+fmtBR(d.date)+'</div><div class="tt-r"><span>Total</span><b>'+intf(tot)+' vendas</b></div><div class="tt-r"><span style="color:'+COL.vio2+'">Front-end</span><b>'+intf(d.feS)+'</b></div><div class="tt-r"><span style="color:'+COL.gold2+'">Upsell</span><b>'+intf(d.upS)+'</b></div><div class="tt-sub">Faturamento '+money0(rev)+'</div>'; });
}
function renderVendas(rng){
  var a=aggVen(rng);
  var sales=a.feS+a.upS, rev=a.feR+a.upR, ticketFe=dv(a.feR,a.feS), take=dv(a.upS,a.feS)*100;
  el('v-quad').innerHTML=
    qcard('big','Vendas Front-end',intf(a.feS),esc(PRODUTO)+' · ticket <b>'+(a.feS?money(ticketFe):'—')+'</b>')
    +qcard('','Faturamento Front-end',money0(a.feR),'líquido')
    +qcard('gold','Upsell · '+esc(UPPROD),intf(a.upS),'take-rate <b>'+pct(take)+'</b> · <b>'+money0(a.upR)+'</b>')
    +qcard('gold','Faturamento Total',money0(rev),'front-end + upsell');
  function splitBar(title,vf,vo){ var t=vf+vo; if(t<=0)t=1; var wf=vf/t*100, wo=vo/t*100;
    return '<div style="font-size:11.5px;color:var(--muted);margin:2px 0 3px">'+title+'</div><div class="split">'
      +(wf>0?'<span style="width:'+wf.toFixed(1)+'%;background:'+COL.vio+'" title="Front-end">'+(wf>10?nf0.format(Math.round(wf))+'%':'')+'</span>':'')
      +(wo>0?'<span style="width:'+wo.toFixed(1)+'%;background:'+COL.gold+'" title="Upsell">'+(wo>10?nf0.format(Math.round(wo))+'%':'')+'</span>':'')+'</div>'; }
  el('v-split').innerHTML=splitBar('Vendas',a.feS,a.upS)+splitBar('Faturamento',a.feR,a.upR)
    +'<div class="split-leg"><span><span class="dot" style="background:'+COL.vio+'"></span>Front-end ('+esc(PRODUTO)+')</span><span><span class="dot" style="background:'+COL.gold+'"></span>Upsell ('+esc(UPPROD)+')</span></div>';
  function row(name,dot,vs,vr){ var tk=dv(vr,vs), sh=dv(vr,rev)*100;
    return '<tr><td><span class="srcname"><span class="sd" style="background:'+dot+'"></span>'+name+'</span></td>'
      +'<td class="num">'+intf(vs)+'</td><td class="num">'+money0(vr)+'</td><td class="num">'+(vs?money(tk):'—')+'</td><td class="num">'+pct(sh)+'</td></tr>'; }
  var totRow='<tr><td>Total</td><td class="num">'+intf(sales)+'</td><td class="num">'+money0(rev)+'</td><td class="num">'+(sales?money(dv(rev,sales)):'—')+'</td><td class="num">100%</td></tr>';
  el('v-cmp').innerHTML='<thead><tr><th>Produto</th><th>Vendas</th><th>Faturamento</th><th>Ticket</th><th>% fat.</th></tr></thead><tbody>'
    +row('Front-end · '+esc(PRODUTO),COL.vio,a.feS,a.feR)+row('Upsell · '+esc(UPPROD),COL.gold,a.upS,a.upR)+'</tbody><tfoot>'+totRow+'</tfoot>';
  renderVChart(rng);
  var rows=VEN.daily.filter(function(d){return isDate(d.date)&&inRange(d.date,rng);}).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var head='<thead><tr><th>Dia</th><th>Front-end</th><th>Fat. Front-end</th><th>Upsell</th><th>Fat. Upsell</th><th>Total</th><th>Fat. Total</th></tr></thead>';
  var body=rows.map(function(r){ var ts=(r.feS||0)+(r.upS||0), trv=(r.feR||0)+(r.upR||0);
    return '<tr><td>'+fmtBR(r.date)+'</td><td class="num">'+intf(r.feS)+'</td><td class="num">'+money0(r.feR)+'</td>'
      +'<td class="num">'+((r.upS||0)>0?'<span style="color:var(--gold2);font-weight:700">'+intf(r.upS)+'</span>':'—')+'</td><td class="num">'+money0(r.upR)+'</td>'
      +'<td class="num">'+intf(ts)+'</td><td class="num">'+money0(trv)+'</td></tr>'; }).join('');
  if(!rows.length)body='<tr><td colspan="7" class="empty">Sem dados no período.</td></tr>';
  var foot='<tfoot><tr><td>Total</td><td class="num">'+intf(a.feS)+'</td><td class="num">'+money0(a.feR)+'</td><td class="num">'+intf(a.upS)+'</td><td class="num">'+money0(a.upR)+'</td><td class="num">'+intf(sales)+'</td><td class="num">'+money0(rev)+'</td></tr></tfoot>';
  el('v-daily').innerHTML=head+'<tbody>'+body+'</tbody>'+foot;
  function ranking(list,total){ var totR=0; list.forEach(function(x){totR+=x.r;}); if(totR<=0)totR=1;
    var head='<thead><tr><th>'+(total?'Anúncio':'Campanha')+'</th><th>Vendas</th><th>Faturamento</th><th>Ticket</th><th>%</th></tr></thead>';
    var body=list.slice(0,15).map(function(x){ var nm=x.n==='SEM_RASTREIO'?'— sem rastreio —':x.n;
      return '<tr><td><span class="name" title="'+esc(nm)+'" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:bottom">'+esc(nm)+'</span></td>'
        +'<td class="num">'+intf(x.s)+'</td><td class="num">'+money0(x.r)+'</td><td class="num">'+(x.s?money(dv(x.r,x.s)):'—')+'</td>'
        +'<td class="num">'+pct(dv(x.r,totR)*100)+'</td></tr>'; }).join('');
    if(!list.length)body='<tr><td colspan="5" class="empty">Sem vendas atribuídas.</td></tr>';
    return head+'<tbody>'+body+'</tbody>'; }
  el('v-camp').innerHTML=ranking(VEN.byCamp,false);
  el('v-ad').innerHTML=ranking(VEN.byAd,true);
}

/* =================== GOOGLE (funil curto, sem imposto) =================== */
var GMETS=['spend','impr','clicks','sales','rev'];
function aggGoo(rng){ var o={}; GMETS.forEach(function(k){o[k]=0;});
  GOO.daily.forEach(function(d){ if(!inRange(d.date,rng))return; GMETS.forEach(function(k){o[k]+=(d[k]||0);}); }); return o; }
function gooDays(rng){ return GOO.daily.filter(function(d){return isDate(d.date)&&inRange(d.date,rng);}).sort(function(a,b){return a.date.localeCompare(b.date);}); }
function renderGKpi(a,p){
  var cpc=dv(a.spend,a.clicks), cpm=dv(a.spend,a.impr)*1000, ctr=dv(a.clicks,a.impr)*100, roas=dv(a.rev,a.spend), cac=dv(a.spend,a.sales);
  var hero='<div class="kpi-hero" style="border-color:rgba(52,215,230,.42)"><div class="h-lab" style="color:var(--cy2)">Investimento Google · sem imposto</div>'
    +'<div class="h-val">'+money(a.spend)+'</div>'
    +'<div class="h-foot"><span><b>'+intf(a.impr)+'</b> impressões</span><span><b>'+intf(a.clicks)+'</b> cliques</span></div></div>';
  var cards='';
  cards+=kpiCard('cyan','Cliques',intf(a.clicks),
    subRow('CPC', a.clicks?money(cpc):'—', trendHTML(cpc,dv(p.spend,p.clicks),false))
    + subRow('CTR', a.impr?pct(ctr):'—', trendHTML(dv(a.clicks,a.impr),dv(p.clicks,p.impr),true)));
  cards+=kpiCard('cyan','Impressões',intf(a.impr),
    subRow('CPM', a.impr?money(cpm):'—', trendHTML(cpm,dv(p.spend,p.impr)*1000,false)));
  cards+=kpiCard('gold','Vendas &amp; ROAS',intf(a.sales),
    subRow('Faturamento', money0(a.rev), '')
    + subRow('CPA', a.sales?money(cac):'—', '')
    + subRow('ROAS', (a.spend>0&&a.sales>0)?roasf(roas):'—', ''));
  el('g-kpi').innerHTML=hero+cards;
}
var GFN_W=[100,58,30], GFN_COL=['#6ef0fb','#34d7e6','#f6c445'];
var GSTAGES=[
  {k:'impr',l:'Impressões',cost:'CPM',costfn:function(a){return dv(a.spend,a.impr)*1000;},rate:'CTR',ratefn:function(a){return dv(a.clicks,a.impr);}},
  {k:'clicks',l:'Cliques',cost:'CPC',costfn:function(a){return dv(a.spend,a.clicks);},rate:'Conversão',ratefn:function(a){return dv(a.sales,a.clicks);}},
  {k:'sales',l:'Vendas',cost:'CPA',costfn:function(a){return dv(a.spend,a.sales);},rate:null}
];
function renderGFunnel(a,p){
  var html='<div class="funnel">';
  for(var i=0;i<GSTAGES.length;i++){
    var s=GSTAGES[i], val=a[s.k]||0, cost=s.costfn(a), pcost=s.costfn(p);
    var costHtml='<div class="fs-v">'+money(cost)+'</div><div>'+s.cost+' '+trendHTML(cost,pcost,false)+'</div>';
    var rateHtml=''; if(s.rate){ var rt=s.ratefn(a),prt=s.ratefn(p); rateHtml='<div class="fs-v">'+pct(rt*100)+'</div><div>'+s.rate+' '+trendHTML(rt,prt,true)+'</div>'; }
    html+='<div class="fn-stage"><div class="fn-side right">'+costHtml+'</div>'
      +'<div class="fn-bar-wrap"><div class="fn-bar" style="width:'+GFN_W[i]+'%;background:linear-gradient(180deg,'+GFN_COL[i]+',rgba(0,0,0,.14))">'
      +'<span class="fn-n">'+intf(val)+'</span><span class="fn-l">'+s.l+'</span></div></div>'
      +'<div class="fn-side">'+rateHtml+'</div></div>';
    if(i<GSTAGES.length-1) html+='<div class="fn-rate"><span class="ar">↓</span></div>';
  }
  html+='</div>'; el('g-funnel').innerHTML=html;
}
function renderGDaily(rng){
  var rows=gooDays(rng).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var maxS=Math.max.apply(null,rows.map(function(r){return r.spend||0;}).concat([0.01]));
  var head='<thead><tr><th>Dia</th><th>Investimento</th><th>Impr.</th><th>Cliques</th><th>CPC</th><th>CTR</th><th>Vendas</th><th>Faturamento</th><th>ROAS</th></tr></thead>';
  var body=rows.map(function(r){ var cpc=dv(r.spend,r.clicks), ctr=dv(r.clicks,r.impr)*100, roas=dv(r.rev,r.spend);
    return '<tr><td>'+fmtBR(r.date)+'</td>'
      +'<td class="num"><span class="heatcell" style="'+heatBg('52,215,230',r.spend/maxS)+'">'+money(r.spend)+'</span></td>'
      +'<td class="num">'+intf(r.impr)+'</td><td class="num">'+intf(r.clicks)+'</td>'
      +'<td class="num">'+(r.clicks?money(cpc):'—')+'</td><td class="num">'+(r.impr?pct(ctr):'—')+'</td>'
      +'<td class="num">'+intf(r.sales)+'</td><td class="num">'+money0(r.rev)+'</td>'
      +'<td class="num">'+((r.spend>0&&r.sales>0)?'<span class="roas-pill '+roasClass(roas)+'">'+roasf(roas)+'</span>':'—')+'</td></tr>'; }).join('');
  if(!rows.length) body='<tr><td colspan="9" class="empty">Sem dados no período.</td></tr>';
  var a=aggGoo(rng), tcpc=dv(a.spend,a.clicks), tctr=dv(a.clicks,a.impr)*100, troas=dv(a.rev,a.spend);
  var foot='<tfoot><tr><td>Total</td><td class="num">'+money(a.spend)+'</td><td class="num">'+intf(a.impr)+'</td><td class="num">'+intf(a.clicks)+'</td><td class="num">'+(a.clicks?money(tcpc):'—')+'</td><td class="num">'+(a.impr?pct(tctr):'—')+'</td><td class="num">'+intf(a.sales)+'</td><td class="num">'+money0(a.rev)+'</td><td class="num">'+((a.spend>0&&a.sales>0)?roasf(troas):'—')+'</td></tr></tfoot>';
  el('g-daily').innerHTML=head+'<tbody>'+body+'</tbody>'+foot;
}
/* árvore Google (sortable) */
function gNewNode(name,full){ return {name:name,full:full,spend:0,impr:0,clicks:0,sales:0,rev:0,kids:{}}; }
function gAccum(n,r){ n.spend+=r.spend||0;n.impr+=r.impr||0;n.clicks+=r.clicks||0;n.sales+=r.sales||0;n.rev+=r.rev||0; }
var gExpanded={}, gTreeInit=false, gTreeSort={key:'spend',rev:false};
function gBuildTree(rows){ var c={}; rows.forEach(function(r){
  var cn=c[r.campaign]||(c[r.campaign]=gNewNode(prettyName(r.campaign),r.campaign)); gAccum(cn,r);
  var sn=cn.kids[r.adset]||(cn.kids[r.adset]=gNewNode(prettyName(r.adset),r.adset)); gAccum(sn,r);
  var an=sn.kids[r.ad]||(sn.kids[r.ad]=gNewNode(prettyName(r.ad),r.ad)); gAccum(an,r); }); return c; }
function gActTag(n,medR){
  if(n.spend>0 && n.sales===0) return {t:(n.clicks>0?'Sem venda':'Aquecendo'),c:'act-ins'};
  if(n.sales<1) return {t:'—',c:'act-ins'};
  if(medR<=0) return {t:'Manter',c:'act-mant'};
  var r=dv(n.rev,n.spend)/medR;
  if(r>=1.2) return {t:'Acelerar',c:'act-acel'};
  if(r<=0.6) return {t:'Revisar',c:'act-rev'};
  return {t:'Manter',c:'act-mant'};
}
function gCells(n,medR,medC){ var roas=dv(n.rev,n.spend), cac=(n.sales>0&&n.spend>0)?dv(n.spend,n.sales):null, tag=gActTag(n,medR);
  var cpm=n.impr>0?dv(n.spend,n.impr)*1000:null, ctr=n.impr>0?dv(n.clicks,n.impr)*100:null, cpc=n.clicks>0?dv(n.spend,n.clicks):null;
  return '<td class="num">'+money(n.spend)+'</td>'
    +'<td class="num">'+(cpm!=null?money(cpm):'—')+'</td>'
    +'<td class="num">'+(ctr!=null?pct(ctr):'—')+'</td>'
    +'<td class="num">'+(cpc!=null?money(cpc):'—')+'</td>'
    +'<td class="num">'+intf(n.sales)+'</td>'
    +'<td class="num">'+(cac!=null?'<span class="cac-pill '+cacClass(cac,medC)+'">'+money0(cac)+'</span>':'—')+'</td>'
    +'<td class="num">'+money0(n.rev)+'</td>'
    +'<td class="num">'+((n.spend>0&&n.sales>0)?'<span class="roas-pill '+roasClass(roas)+'">'+roasf(roas)+'</span>':'—')+'</td>'
    +'<td class="num"><span class="act '+tag.c+'">'+tag.t+'</span></td>'; }
function gTreeRow(n,lvl,key,hasKids,medR,medC){
  var caret=hasKids?'<span class="caret'+(gExpanded[key]?' open':'')+'">▶</span>':'<span class="caret" style="opacity:.2">•</span>';
  return '<tr class="lvl'+lvl+(hasKids?' parent':'')+'" data-key="'+encodeURIComponent(key)+'"><td><span class="name" title="'+esc(n.full||n.name)+'">'+caret+' '+esc(n.name)+'</span></td>'+gCells(n,medR,medC)+'</tr>';
}
var G_COLS=[{k:'name',l:'Campanha › Grupo › Anúncio'},{k:'spend',l:'Gasto'},{k:'cpm',l:'CPM'},{k:'ctr',l:'CTR'},{k:'cpc',l:'CPC'},{k:'sales',l:'Vendas'},{k:'cac',l:'CPA'},{k:'rev',l:'Faturamento'},{k:'roas',l:'ROAS'},{k:'act',l:'Ação'}];
function gSortVal(key,n){
  if(key==='spend') return -(n.spend||0);
  if(key==='sales') return -(n.sales||0);
  if(key==='rev')   return -(n.rev||0);
  if(key==='cpm')   return n.impr>0?dv(n.spend,n.impr)*1000:Infinity;
  if(key==='ctr')   return n.impr>0?-dv(n.clicks,n.impr):Infinity;
  if(key==='cpc')   return n.clicks>0?dv(n.spend,n.clicks):Infinity;
  if(key==='cac')   return (n.sales>0&&n.spend>0)?dv(n.spend,n.sales):Infinity;
  if(key==='roas')  return (n.spend>0&&n.sales>0)?-dv(n.rev,n.spend):Infinity;
  return 0;
}
function renderGTree(rng){
  var ss=gTreeSort, rows=GOO._grain.filter(function(r){return inRange(r.date,rng);});
  var camps=gBuildTree(rows);
  var leafR=[],leafC=[]; Object.keys(camps).forEach(function(cK){ if(cK==='SEM_RASTREIO')return; var c=camps[cK]; Object.keys(c.kids).forEach(function(sK){ var sN=c.kids[sK]; Object.keys(sN.kids).forEach(function(aK){ var an=sN.kids[aK]; if(an.spend>0&&an.sales>0){leafR.push(dv(an.rev,an.spend));leafC.push(dv(an.spend,an.sales));} }); }); });
  var medR=median(leafR), medC=median(leafC);
  function cmp(a,b){ if(ss.key==='name'){ var rn=String(a.name).localeCompare(String(b.name),'pt',{numeric:true}); return ss.rev?-rn:rn; }
    var va=gSortVal(ss.key,a), vb=gSortVal(ss.key,b), na=!isFinite(va), nb=!isFinite(vb);
    if(na&&nb) return (b.spend||0)-(a.spend||0); if(na) return 1; if(nb) return -1;
    var r=va-vb; if(r===0){ r=(b.spend||0)-(a.spend||0); } return ss.rev?-r:r; }
  function skeys(obj){ return Object.keys(obj).sort(function(x,y){ return cmp(obj[x],obj[y]); }); }
  var order=skeys(camps);
  if(!gTreeInit){ order.slice(0,4).forEach(function(cK){ gExpanded['c:'+cK]=true; }); gTreeInit=true; }
  var head='<thead><tr>'+G_COLS.map(function(c){ var on=ss.key===c.k;
    return '<th class="sortable'+(on?' sorton':'')+'" data-col="'+c.k+'">'+c.l+(on?' <span class="sarr">'+(ss.rev?'▲':'▼')+'</span>':'')+'</th>'; }).join('')+'</tr></thead>';
  var out=[];
  order.forEach(function(cK){ var c=camps[cK],cKey='c:'+cK,cHas=Object.keys(c.kids).length>0; out.push(gTreeRow(c,0,cKey,cHas,medR,medC));
    if(gExpanded[cKey]){ skeys(c.kids).forEach(function(sK){ var sN=c.kids[sK],sKey=cKey+'|s:'+sK,sHas=Object.keys(sN.kids).length>0; out.push(gTreeRow(sN,1,sKey,sHas,medR,medC));
      if(gExpanded[sKey]){ skeys(sN.kids).forEach(function(aK){ out.push(gTreeRow(sN.kids[aK],2,sKey+'|a:'+aK,false,medR,medC)); }); } }); } });
  if(!out.length) out.push('<tr><td colspan="10" class="empty">Sem dados no período.</td></tr>');
  var tEl=el('g-tree'); tEl.innerHTML=head+'<tbody>'+out.join('')+'</tbody>';
  el('g-treeLegend').innerHTML='<span style="color:var(--muted2)">Google começou agora — enquanto não vende, as ações ficam neutras (Aquecendo/Sem venda). Clique num cabeçalho p/ ordenar.</span>';
  Array.prototype.forEach.call(tEl.querySelectorAll('th.sortable'),function(th){
    th.addEventListener('click',function(){ var k=th.getAttribute('data-col'), s=gTreeSort; if(s.key===k){ s.rev=!s.rev; } else { s.key=k; s.rev=false; } renderGTree(rangeFor(period)); }); });
  Array.prototype.forEach.call(tEl.querySelectorAll('tr.parent'),function(tr){
    tr.addEventListener('click',function(){ var k=decodeURIComponent(tr.getAttribute('data-key')); gExpanded[k]=!gExpanded[k]; renderGTree(rangeFor(period)); }); });
}
function renderGoogle(rng,prng){
  var a=aggGoo(rng), p=aggGoo(prng);
  renderGKpi(a,p); renderGFunnel(a,p); renderGDaily(rng); renderGTree(rng);
  var win=(GOO.dateMin&&GOO.dateMax)?(fmtBR(GOO.dateMin)+' → '+fmtBR(GOO.dateMax)):'—';
  el('g-cov').innerHTML='<b>Google Ads / YouTube</b> · funil curto, <b>sem imposto</b> (o ×13,85% é só do Meta). '
    +(a.sales>0 ? ('<b>'+intf(a.sales)+'</b> venda(s) · faturamento <b>'+money0(a.rev)+'</b> · ROAS <span class="cy">'+roasf(dv(a.rev,a.spend))+'</span>.')
                : 'Ainda <b>sem venda atribuída</b> — mostrando <b>investimento e tráfego</b>. Quando a 1ª venda Google cair (utm_source google-ads casando com estas campanhas), ROAS/CPA/atribuição por criativo aparecem sozinhos.')
    +' Queries: '+win+'.';
}

/* =================== GERAL (Meta + Google) =================== */
function geralDays(rng){
  var map={};
  META.daily.forEach(function(d){ if(!inRange(d.date,rng))return; var o=map[d.date]||(map[d.date]={date:d.date,mS:0,gS:0,rev:0,sales:0}); o.mS+=d.spend||0; o.rev+=(d.rev||0)+(d.upRev||0); o.sales+=(d.sales||0); });
  GOO.daily.forEach(function(d){ if(!inRange(d.date,rng))return; var o=map[d.date]||(map[d.date]={date:d.date,mS:0,gS:0,rev:0,sales:0}); o.gS+=d.spend||0; o.rev+=(d.rev||0); o.sales+=(d.sales||0); });
  return Object.keys(map).map(function(k){ var o=map[k]; o.invest=o.mS+o.gS; return o; }).sort(function(a,b){return a.date.localeCompare(b.date);});
}
function renderGeChart(rng){
  var days=geralDays(rng);
  var W=1120,H=250,pl=44,pr=48,pt=14,pb=26,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxS=Math.max.apply(null,days.map(function(d){return d.invest||0;}).concat([1]));
  var roas=days.map(function(d){return dv(d.rev,d.invest);});
  var maxR=Math.max.apply(null,roas.concat([1]));
  var n=days.length||1,gw=pw/n,bw=Math.max(2,Math.min(26,gw*0.55));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#1a1a38" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-6)+'" y="'+(y+3)+'" text-anchor="end" fill="#8f89b8" font-size="10">'+money0(maxS*f)+'</text>';
    s+='<text x="'+(W-pr+5)+'" y="'+(y+3)+'" text-anchor="start" fill="#b99a2e" font-size="10">'+nf1.format(maxR*f)+'</text>'; });
  if(maxR>0){ var y1=base-ph*clamp(1/maxR); s+='<line x1="'+pl+'" y1="'+y1.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y1.toFixed(1)+'" stroke="rgba(47,224,127,.5)" stroke-dasharray="4 3"/>'; }
  days.forEach(function(d,i){ var xc=pl+gw*i+gw/2, sh=ph*dv(d.invest,maxS); if(d.invest>0) s+='<rect x="'+(xc-bw/2).toFixed(1)+'" y="'+(base-sh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="2" fill="rgba(139,92,246,.42)"/>'; });
  var pts=[]; days.forEach(function(d,i){ if(d.invest>0){ var xc=pl+gw*i+gw/2, y=base-ph*clamp(roas[i]/maxR); pts.push([xc,y]); } });
  if(pts.length>1){ s+='<path d="M'+pts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' L')+'" fill="none" stroke="'+COL.gold+'" stroke-width="2.4"/>'; }
  pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="3" fill="'+COL.gold+'"/>'; });
  xticks(days).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" fill="#8f89b8" font-size="10">'+fmtBR(days[i].date)+'</text>'; });
  s+=hitRects(days,pl,gw,pt,ph)+'</svg>';
  el('ge-chart').innerHTML='<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(139,92,246,.6)"></span>Investimento (Meta+Google)</span><span><span class="ln" style="background:'+COL.gold+'"></span>ROAS</span><span style="color:var(--muted2)">tracejado = break-even (ROAS 1,00)</span></div>';
  bindHits('ge-chart',days,function(d){ var rz=dv(d.rev,d.invest), luc=d.rev-d.invest; return '<div class="tt-d">'+fmtBR(d.date)+'</div>'
    +'<div class="tt-r"><span style="color:'+COL.vio2+'">Investimento</span><b>'+money0(d.invest)+'</b></div>'
    +'<div class="tt-r"><span style="color:var(--ink)">Vendas</span><b>'+intf(d.sales)+'</b></div>'
    +'<div class="tt-r"><span style="color:'+COL.gold2+'">ROAS</span><b>'+roasf(rz)+'</b></div>'
    +'<div class="tt-sub">Faturamento '+money0(d.rev)+' · Lucro <span class="'+(luc>=0?'pos':'neg')+'">'+money0(luc)+'</span></div>'; });
}
function renderGeral(rng,prng){
  var m=aggMeta(rng), g=aggGoo(rng);
  var mInvest=m.spend, gInvest=g.spend, invest=mInvest+gInvest;
  var mRevAll=m.rev+(m.upRev||0), gRev=g.rev, fatTot=mRevAll+gRev, fatFe=m.rev+gRev, upRev=m.upRev||0;
  var mSales=m.sales, gSales=g.sales, salesFe=mSales+gSales, upSales=m.upSales||0;
  var roas=dv(fatTot,invest), lucro=fatTot-invest;
  el('ge-quad').innerHTML=
    qcard('big','Investimento Total',money0(invest),'Meta c/ imposto <b>'+money0(mInvest)+'</b> + Google <b>'+money0(gInvest)+'</b>')
    +qcard('gold','Faturamento Total',money0(fatTot),'front-end <b>'+money0(fatFe)+'</b> + upsell <b>'+money0(upRev)+'</b>')
    +qcard('','Vendas',intf(salesFe),'front-end'+((upSales>0)?(' · <b>'+intf(upSales)+'</b> upsell'):'')+((gSales>0)?(' · Google <b>'+intf(gSales)+'</b>'):''))
    +qcard('gold','ROAS Geral',roasf(roas),'lucro <b class="'+(lucro>=0?'pos':'neg')+'">'+money0(lucro)+'</b> · '+(roas>=1?'no lucro':pct(roas*100)+' do break-even'));
  function sBar(title,vm,vg){ var t=vm+vg; if(t<=0)t=1; var wm=vm/t*100,wg=vg/t*100;
    return '<div style="font-size:11.5px;color:var(--muted);margin:2px 0 3px">'+title+'</div><div class="split">'
      +(wm>0?'<span style="width:'+wm.toFixed(1)+'%;background:'+COL.vio+'" title="Meta">'+(wm>10?nf0.format(Math.round(wm))+'%':'')+'</span>':'')
      +(wg>0?'<span style="width:'+wg.toFixed(1)+'%;background:'+COL.cy+'" title="Google">'+(wg>10?nf0.format(Math.round(wg))+'%':'')+'</span>':'')+'</div>'; }
  el('ge-split').innerHTML=sBar('Investimento',mInvest,gInvest)+sBar('Faturamento',mRevAll,gRev)+sBar('Vendas',mSales,gSales)
    +'<div class="split-leg"><span><span class="dot" style="background:'+COL.vio+'"></span>Meta Ads</span><span><span class="dot" style="background:'+COL.cy+'"></span>Google/YouTube</span></div>';
  function row(name,dot,inv,sales,rev){ var rz=dv(rev,inv), sh=dv(inv,invest)*100;
    return '<tr><td><span class="srcname"><span class="sd" style="background:'+dot+'"></span>'+name+'</span></td>'
      +'<td class="num">'+money0(inv)+'</td><td class="num">'+intf(sales)+'</td><td class="num">'+money0(rev)+'</td>'
      +'<td class="num">'+((inv>0&&rev>0)?'<span class="roas-pill '+roasClass(rz)+'">'+roasf(rz)+'</span>':'—')+'</td><td class="num">'+pct(sh)+'</td></tr>'; }
  var totRow='<tr><td>Total</td><td class="num">'+money0(invest)+'</td><td class="num">'+intf(salesFe)+'</td><td class="num">'+money0(fatTot)+'</td><td class="num">'+(invest>0?roasf(roas):'—')+'</td><td class="num">100%</td></tr>';
  el('ge-cmp').innerHTML='<thead><tr><th>Origem</th><th>Investimento</th><th>Vendas</th><th>Faturamento</th><th>ROAS</th><th>% inv.</th></tr></thead><tbody>'
    +row('Meta Ads (c/ imposto)',COL.vio,mInvest,mSales,mRevAll)+row('Google / YouTube',COL.cy,gInvest,gSales,gRev)+'</tbody><tfoot>'+totRow+'</tfoot>';
  renderGeChart(rng);
  var rows=geralDays(rng).slice().sort(function(a,b){return b.date.localeCompare(a.date);});
  var head='<thead><tr><th>Dia</th><th>Inv. Meta</th><th>Inv. Google</th><th>Inv. Total</th><th>Vendas</th><th>Faturamento</th><th>ROAS</th><th>Lucro</th></tr></thead>';
  var body=rows.map(function(r){ var inv=r.mS+r.gS, rz=dv(r.rev,inv), luc=r.rev-inv;
    return '<tr><td>'+fmtBR(r.date)+'</td><td class="num">'+money0(r.mS)+'</td><td class="num">'+money0(r.gS)+'</td><td class="num">'+money0(inv)+'</td>'
      +'<td class="num">'+intf(r.sales)+'</td><td class="num">'+money0(r.rev)+'</td>'
      +'<td class="num">'+(inv>0?'<span class="roas-pill '+roasClass(rz)+'">'+roasf(rz)+'</span>':'—')+'</td>'
      +'<td class="num '+(luc>=0?'pos':'neg')+'">'+money0(luc)+'</td></tr>'; }).join('');
  if(!rows.length) body='<tr><td colspan="8" class="empty">Sem dados no período.</td></tr>';
  var foot='<tfoot><tr><td>Total</td><td class="num">'+money0(mInvest)+'</td><td class="num">'+money0(gInvest)+'</td><td class="num">'+money0(invest)+'</td><td class="num">'+intf(salesFe)+'</td><td class="num">'+money0(fatTot)+'</td><td class="num">'+(invest>0?roasf(roas):'—')+'</td><td class="num '+(lucro>=0?'pos':'neg')+'">'+money0(lucro)+'</td></tr></tfoot>';
  el('ge-daily').innerHTML=head+'<tbody>'+body+'</tbody>'+foot;
}

/* =================== OTIMIZAÇÃO V2 (100% filtrável) ===================
   Clicar em QUALQUER item (campanha/conjunto/anúncio) filtra a aba INTEIRA (KPIs + gráfico diário)
   só pra ele, mas as listas continuam TODAS visíveis (troca clicando em outro, sem drill destrutivo).
   Cada nível = TABELA + gráfico por dia logo abaixo (top 8 · legenda clicável · hover = dados do dia). */
function microChart(series){
  if(!series.length)return '<div class="empty">Sem dados no período pra este item.</div>';
  var W=780,H=250,pl=48,pr=44,pt=14,pb=28,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var maxRS=Math.max.apply(null,series.map(function(b){return Math.max(b.spend,b.rev);}).concat([1]));
  var roas=series.map(function(b){return dv(b.rev,b.spend);}), maxRo=Math.max.apply(null,roas.concat([1]));
  var n=series.length||1, gw=pw/n, bw=Math.max(2,Math.min(16,gw*0.34));
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#1a1a38" stroke-dasharray="2 3"/>';
    s+='<text x="'+(pl-5)+'" y="'+(y+3)+'" text-anchor="end" fill="#645e8f" font-size="9">'+money0(maxRS*f)+'</text>';
    s+='<text x="'+(W-pr+5)+'" y="'+(y+3)+'" text-anchor="start" fill="#b99a2e" font-size="9">'+nf1.format(maxRo*f)+'</text>'; });
  if(maxRo>0){ var y1=base-ph*clamp(1/maxRo); s+='<line x1="'+pl+'" y1="'+y1.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+y1.toFixed(1)+'" stroke="rgba(47,224,127,.4)" stroke-dasharray="4 3"/>'; }
  series.forEach(function(b,i){ var xc=pl+gw*i+gw/2, sh=ph*dv(b.spend,maxRS), rh=ph*dv(b.rev,maxRS);
    if(b.spend>0)s+='<rect x="'+(xc-bw-1).toFixed(1)+'" y="'+(base-sh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+sh.toFixed(1)+'" rx="1.5" fill="rgba(139,92,246,.5)"/>';
    if(b.rev>0)s+='<rect x="'+(xc+1).toFixed(1)+'" y="'+(base-rh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+rh.toFixed(1)+'" rx="1.5" fill="rgba(47,224,127,.55)"/>'; });
  var pts=[]; series.forEach(function(b,i){ if(b.spend>0){var xc=pl+gw*i+gw/2,y=base-ph*clamp(roas[i]/maxRo);pts.push([xc,y]);} });
  if(pts.length>1)s+='<path d="M'+pts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' L')+'" fill="none" stroke="'+COL.gold+'" stroke-width="2.2"/>';
  pts.forEach(function(p){s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.6" fill="'+COL.gold+'"/>';});
  xticks(series).forEach(function(i){ var xc=pl+gw*i+gw/2; s+='<text x="'+xc.toFixed(1)+'" y="'+(H-7)+'" text-anchor="middle" fill="#645e8f" font-size="9">'+series[i].label+'</text>'; });
  s+=hitRects(series,pl,gw,pt,ph)+'</svg>';
  return '<div class="chart">'+s+'</div><div class="chart-legend"><span><span class="dot" style="background:rgba(139,92,246,.6)"></span>Investimento</span><span><span class="dot" style="background:rgba(47,224,127,.6)"></span>Faturamento</span><span><span class="ln" style="background:'+COL.gold+'"></span>ROAS</span><span style="color:var(--muted2)">tracejado = break-even</span></div>'; }

var v2Sel={camp:null,adset:null,ad:null}, v2Period='tudo', v2Channel='geral', v2LineMetric='roas';
var V2PAL=['#b794ff','#f6c445','#34d7e6','#ff5c7a','#8b5cf6','#ffd257','#6ef0fb','#2fe07f','#fb923c','#c084fc'];
var V2LM=[{k:'roas',l:'ROAS'},{k:'sales',l:'Vendas'},{k:'rev',l:'Faturamento'}];
function v2LineVal(d){ if(!(d.spend>0))return null; if(v2LineMetric==='sales')return d.sales; if(v2LineMetric==='rev')return d.rev; return d.rev/d.spend; }
function v2LineFmt(v){ if(v==null)return '—'; if(v2LineMetric==='sales')return intf(v); if(v2LineMetric==='rev')return money0(v); return roasf(v); }
function v2AxisFmt(v){ if(v2LineMetric==='sales')return intf(Math.round(v)); if(v2LineMetric==='rev')return money0(v); return nf1.format(v); }
function v2MetricLabel(){ return v2LineMetric==='sales'?'Vendas':(v2LineMetric==='rev'?'Faturamento':'ROAS'); }
function v2Rows(){ return META._grain.concat(GOO._grain); }
function v2ChMatch(r){ return v2Channel==='geral' || r.channel===v2Channel; }
function v2RangeFor(k){ if(k==='7d')return [addDays(maxDate,-6),maxDate]; if(k==='14d')return [addDays(maxDate,-13),maxDate]; if(k==='30d')return [addDays(maxDate,-29),maxDate]; return [minDate,maxDate]; }
function v2Metrics(n){ return {
  spend:n.spend,impr:n.impr,clicks:n.clicks,lpv:n.lpv,checkout:n.checkout,v3:n.v3,v75:n.v75,sales:n.sales,rev:n.rev,
  cpm:n.impr>0?n.spend/n.impr*1000:null, ctr:n.impr>0?n.clicks/n.impr*100:null, cpc:n.clicks>0?n.spend/n.clicks:null,
  hook:n.impr>0?n.v3/n.impr*100:null, hold:n.v3>0?n.v75/n.v3*100:null,
  txchk:n.lpv>0?n.checkout/n.lpv*100:null, txcpr:n.checkout>0?n.sales/n.checkout*100:null,
  convPag:n.lpv>0?n.sales/n.lpv*100:null, convClk:n.clicks>0?n.sales/n.clicks*100:null,
  cac:n.sales>0?n.spend/n.sales:null, ticket:n.sales>0?n.rev/n.sales:null, roas:n.spend>0?n.rev/n.spend:null }; }
function v2groupBy(rows,level){ var g={};
  rows.forEach(function(r){
    var key = level===0? r.campaign : (level===1? r.campaign+'\u0001'+r.adset : r.campaign+'\u0001'+r.adset+'\u0001'+r.ad);
    var o=g[key]; if(!o){ o=g[key]=newNode(prettyName(level===0?r.campaign:(level===1?r.adset:r.ad)),key); o.key=key; o.camp=r.campaign; o.adset=r.adset; o.ad=r.ad; o.rows=[]; }
    accum(o,r); o.rows.push(r);
  });
  return Object.keys(g).map(function(k){return g[k];}).sort(function(a,b){return b.spend-a.spend;}); }
function v2SelOf(o,level){ return level===0? (v2Sel.camp===o.camp) : (level===1? (v2Sel.camp===o.camp&&v2Sel.adset===o.adset) : (v2Sel.camp===o.camp&&v2Sel.adset===o.adset&&v2Sel.ad===o.ad)); }
function v2Pick(level,o){
  if(level===0){ v2Sel = (v2Sel.camp===o.camp)?{camp:null,adset:null,ad:null}:{camp:o.camp,adset:null,ad:null}; }
  else if(level===1){ var s1=(v2Sel.camp===o.camp&&v2Sel.adset===o.adset); v2Sel = s1?{camp:o.camp,adset:null,ad:null}:{camp:o.camp,adset:o.adset,ad:null}; }
  else { var s2=(v2Sel.camp===o.camp&&v2Sel.adset===o.adset&&v2Sel.ad===o.ad); v2Sel = s2?{camp:o.camp,adset:o.adset,ad:null}:{camp:o.camp,adset:o.adset,ad:o.ad}; }
  mountV2();
}
function v2Kpis(m){
  var lucro=m.rev-m.spend;
  var hero='<div class="kpi-hero"><div class="h-lab">Investimento <small>(Meta c/ imposto + Google s/)</small></div>'
    +'<div class="h-val">'+money(m.spend)+'</div>'
    +'<div class="h-foot"><span>ROAS <b>'+(m.roas!=null?roasf(m.roas):'—')+'</b></span><span>Vendas <b>'+intf(m.sales)+'</b></span></div></div>';
  var cards='';
  cards+=kpiCard('','Impressões',intf(m.impr), subRow('CPM',(m.cpm!=null?money(m.cpm):'—'),'')+subRow('CTR',(m.ctr!=null?pct(m.ctr):'—'),''));
  cards+=kpiCard('cyan','Vídeo (VSL)',(m.hook!=null?pct(m.hook):'—'), subRow('Hook <small>(assistiu 3s)</small>',(m.hook!=null?pct(m.hook):'—'),'')+subRow('Hold <small>(reteve 75%)</small>',(m.hold!=null?pct(m.hold):'—'),''));
  cards+=kpiCard('','Cliques &amp; página',intf(m.clicks), subRow('CPC',(m.cpc!=null?money(m.cpc):'—'),'')+subRow('Conv. página <small>(venda/view LP)</small>',(m.convPag!=null?pct(m.convPag):'—'),''));
  cards+=kpiCard('hl','Faturamento',money0(m.rev), subRow('Ticket médio',(m.ticket!=null?money(m.ticket):'—'),'')+subRow('Lucro (fat.−invest.)','<span class="'+(lucro>=0?'pos':'neg')+'">'+money0(lucro)+'</span>',''));
  cards+=kpiCard('hl','Vendas',intf(m.sales), subRow('<b>CPA / CAC</b>',(m.cac!=null?money(m.cac):'—'),'')+subRow('Checkout→compra',(m.txcpr!=null?pct(m.txcpr):'—'),''));
  var barw=clamp((m.roas||0)/1.5)*100, barcol=(m.roas>=1)?COL.gold:((m.roas>=0.8)?COL.gold:'#ff5c7a');
  cards+=kpiCard('gold','ROAS c/ imposto',(m.roas!=null?roasf(m.roas):'—'),
    subRow('Retorno por R$ 1','R$ '+(m.roas!=null?roasf(m.roas):'—'),'')
    +'<div class="sub-row"><span class="s-l">até o break-even (1,00)</span><span class="s-v">'+(m.roas>=1?'✓ lucro':(m.roas!=null?pct(m.roas*100)+' do equilíbrio':'—'))+'</span></div>'
    +'<div class="mini-bar"><span style="width:'+barw.toFixed(0)+'%;background:'+barcol+'"></span></div>');
  return hero+cards;
}
function v2DaySeries(rows){ var bd={}; rows.forEach(function(r){ var o=bd[r.date]||(bd[r.date]={spend:0,rev:0,sales:0}); o.spend+=r.spend;o.rev+=r.rev;o.sales+=r.sales; });
  return Object.keys(bd).sort().map(function(d){ var o=bd[d]; return {date:d,label:fmtBR(d),spend:o.spend,rev:o.rev,sales:o.sales}; }); }
function v2SeriesByDate(rows){ var bd={}; rows.forEach(function(r){ if(r.date===maxDate)return; var o=bd[r.date]||(bd[r.date]={date:r.date,spend:0,rev:0,sales:0}); o.spend+=r.spend;o.rev+=r.rev;o.sales+=r.sales; });
  return Object.keys(bd).sort().map(function(d){return bd[d];}); }
function v2Lines(groups,elId,level,onPick){
  if(!el(elId)) return;
  var isRoas=v2LineMetric==='roas';
  var top=groups.slice(0,8);
  top.forEach(function(g){ g.series=v2SeriesByDate(g.rows); var mp={}; g.series.forEach(function(d){mp[d.date]=d;}); g.map=mp; });
  var dset={}; top.forEach(function(g){ g.series.forEach(function(d){ if(d.spend>0) dset[d.date]=1; }); });
  var dates=Object.keys(dset).sort();
  if(!dates.length){ el(elId).innerHTML='<div class="empty">Sem dados no período p/ traçar as linhas (exclui o dia de hoje, parcial).</div>'; return; }
  var maxV=isRoas?1:0; top.forEach(function(g){ g.series.forEach(function(d){ var v=v2LineVal(d); if(v!=null&&v>maxV)maxV=v; }); }); if(maxV<=0)maxV=1;
  var W=820,H=240,pl=(v2LineMetric==='rev'?56:44),pr=14,pt=14,pb=26,pw=W-pl-pr,ph=H-pt-pb,base=pt+ph;
  var n=dates.length; function xf(i){ return pl+(n>1?pw/(n-1)*i:pw/2); } function yf(v){ return base-ph*Math.max(0,Math.min(1,v/maxV)); }
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  [0,0.5,1].forEach(function(f){ var y=pt+ph*(1-f); s+='<line x1="'+pl+'" y1="'+y+'" x2="'+(W-pr)+'" y2="'+y+'" stroke="#1a1a38" stroke-dasharray="2 3"/>'; s+='<text x="'+(pl-4)+'" y="'+(y+3)+'" text-anchor="end" fill="#645e8f" font-size="9">'+v2AxisFmt(maxV*f)+'</text>'; });
  if(isRoas&&maxV>=1){ var yb=base-ph*(1/maxV); s+='<line x1="'+pl+'" y1="'+yb.toFixed(1)+'" x2="'+(W-pr)+'" y2="'+yb.toFixed(1)+'" stroke="rgba(47,224,127,.35)" stroke-dasharray="4 3"/>'; }
  top.forEach(function(g,gi){ var col=V2PAL[gi%V2PAL.length], pts=[];
    dates.forEach(function(dt,i){ var d=g.map[dt]; var v=d?v2LineVal(d):null; if(v!=null) pts.push([xf(i),yf(v)]); });
    if(pts.length>1) s+='<path d="M'+pts.map(function(p){return p[0].toFixed(1)+' '+p[1].toFixed(1);}).join(' L')+'" fill="none" stroke="'+col+'" stroke-width="2" opacity=".92"/>';
    pts.forEach(function(p){ s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.1" fill="'+col+'"/>'; });
  });
  xticks(dates.map(function(d){return {date:d};})).forEach(function(i){ s+='<text x="'+xf(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle" fill="#645e8f" font-size="9">'+fmtBR(dates[i])+'</text>'; });
  var bandW = n>1? pw/(n-1) : pw;
  dates.forEach(function(dt,i){ var x=xf(i)-bandW/2; if(x<pl)x=pl; s+='<rect class="v2hit" data-i="'+i+'" x="'+x.toFixed(1)+'" y="'+pt+'" width="'+bandW.toFixed(1)+'" height="'+ph+'" fill="transparent" pointer-events="all"/>'; });
  s+='</svg>';
  var legend=top.map(function(g,gi){ var col=V2PAL[gi%V2PAL.length]; var nm=g.name.length>36?g.name.slice(0,34)+'…':g.name;
    return '<span class="v2leg'+(v2SelOf(g,level)?' on':'')+'" data-key="'+encodeURIComponent(g.key)+'"><span class="dot" style="background:'+col+'"></span>'+esc(nm)+'</span>'; }).join('');
  var mlab='<span class="v2metnote">linha = <b>'+v2MetricLabel()+'/dia</b></span>';
  el(elId).innerHTML='<div class="chart">'+s+'</div><div class="chart-legend wrap v2legwrap">'+mlab+legend+'</div>';
  var byKey={}; top.forEach(function(g){ byKey[g.key]=g; });
  Array.prototype.forEach.call(el(elId).querySelectorAll('.v2leg'),function(sp){ sp.addEventListener('click',function(){ var g=byKey[decodeURIComponent(sp.getAttribute('data-key'))]; if(g) onPick(g); }); });
  Array.prototype.forEach.call(el(elId).querySelectorAll('.v2hit'),function(r){
    r.addEventListener('mousemove',function(e){ var i=+r.getAttribute('data-i'), dt=dates[i];
      var items=[]; top.forEach(function(g,gi){ var d=g.map[dt]; if(d&&d.spend>0) items.push({nm:g.name,val:v2LineVal(d),roas:d.rev/d.spend,sales:d.sales,rev:d.rev,col:V2PAL[gi%V2PAL.length]}); });
      items.sort(function(a,b){return (b.val==null?-1:b.val)-(a.val==null?-1:a.val);});
      var html='<div class="tt-d">'+fmtBR(dt)+' · '+v2MetricLabel()+'</div>';
      if(!items.length){ html+='<div class="tt-sub">sem gasto nesse dia</div>'; }
      else items.forEach(function(it){ var nm=it.nm.length>26?it.nm.slice(0,24)+'…':it.nm; html+='<div class="tt-r"><span style="color:'+it.col+'">'+esc(nm)+'</span><b>'+v2LineFmt(it.val)+'</b></div><div class="tt-mini">ROAS '+roasf(it.roas)+' · '+intf(it.sales)+' vd · '+money0(it.rev)+'</div>'; });
      tipShow(html,e.clientX,e.clientY); });
    r.addEventListener('mouseleave',tipHide); });
}
function v2Table(elId,title,hint,list,level){
  if(!el(elId)) return;
  if(!list.length){ el(elId).innerHTML='<div class="card"><div class="card-h">'+title+'</div><div class="empty">Sem dados no período.</div></div>'; return; }
  var shown=list.slice(0,80);
  var medC=median(shown.map(function(o){return o.sales>0?o.spend/o.sales:null;}).filter(function(x){return x!=null;}));
  var lvlLab=['Campanha','Conjunto / Grupo','Anúncio'][level];
  var head='<thead><tr><th>'+lvlLab+'</th><th class="num">Gasto</th><th class="num">Impr.</th><th class="num">CPM</th><th class="num">Cliques</th><th class="num">CTR</th><th class="num">CPC</th><th class="num">Hook</th><th class="num">Hold</th><th class="num">LP→Chk</th><th class="num">Chk→Cmp</th><th class="num">Conv. pág.</th><th class="num">Vendas</th><th class="num">CPA</th><th class="num">Faturamento</th><th class="num">ROAS</th></tr></thead>';
  var body=shown.map(function(o){ var m=v2Metrics(o), sel=v2SelOf(o,level);
    var cacCell=m.cac!=null?'<span class="cac-pill '+cacClass(m.cac,medC)+'">'+money0(m.cac)+'</span>':'—';
    var roasCell=m.roas!=null?'<span class="roas-pill '+roasClass(m.roas)+'">'+roasf(m.roas)+'</span>':'—';
    return '<tr class="v2row'+(sel?' sel':'')+'" data-key="'+encodeURIComponent(o.key)+'">'
      +'<td><span class="v2name" title="'+esc(o.name)+'">'+(sel?'● ':'')+esc(o.name)+'</span></td>'
      +'<td class="num">'+money0(o.spend)+'</td>'
      +'<td class="num">'+intf(o.impr)+'</td>'
      +'<td class="num">'+(m.cpm!=null?money0(m.cpm):'—')+'</td>'
      +'<td class="num">'+intf(o.clicks)+'</td>'
      +'<td class="num">'+(m.ctr!=null?pct(m.ctr):'—')+'</td>'
      +'<td class="num">'+(m.cpc!=null?money(m.cpc):'—')+'</td>'
      +'<td class="num">'+(m.hook!=null?'<span class="vid-pill">'+pct(m.hook)+'</span>':'—')+'</td>'
      +'<td class="num">'+(m.hold!=null?'<span class="vid-pill">'+pct(m.hold)+'</span>':'—')+'</td>'
      +'<td class="num">'+(m.txchk!=null?pct(m.txchk):'—')+'</td>'
      +'<td class="num">'+(m.txcpr!=null?pct(m.txcpr):'—')+'</td>'
      +'<td class="num">'+(m.convPag!=null?'<span class="conv-pill">'+pct(m.convPag)+'</span>':'—')+'</td>'
      +'<td class="num">'+intf(o.sales)+'</td>'
      +'<td class="num">'+cacCell+'</td>'
      +'<td class="num">'+money0(o.rev)+'</td>'
      +'<td class="num">'+roasCell+'</td></tr>'; }).join('');
  var more = list.length>shown.length ? ' <span class="hint">· top '+shown.length+' de '+list.length+' por gasto</span>' : '';
  el(elId).innerHTML='<div class="card"><div class="card-h">'+title+' <span class="hint">'+hint+'</span>'+more+'</div><div class="table-scroll"><table class="tbl v2tbl">'+head+'<tbody>'+body+'</tbody></table></div></div>';
  var byKey={}; shown.forEach(function(o){ byKey[o.key]=o; });
  Array.prototype.forEach.call(el(elId).querySelectorAll('.v2row'),function(tr){ tr.addEventListener('click',function(){ var o=byKey[decodeURIComponent(tr.getAttribute('data-key'))]; if(o) v2Pick(level,o); }); });
}
function v2CrumbHTML(){
  var p=['<a class="v2crumb'+(v2Sel.camp==null?' cur':'')+'" data-lvl="0">📊 Todas as campanhas</a>'];
  if(v2Sel.camp!=null) p.push('<a class="v2crumb'+(v2Sel.adset==null?' cur':'')+'" data-lvl="1">'+esc(prettyName(v2Sel.camp))+'</a>');
  if(v2Sel.adset!=null) p.push('<a class="v2crumb'+(v2Sel.ad==null?' cur':'')+'" data-lvl="2">'+esc(prettyName(v2Sel.adset))+'</a>');
  if(v2Sel.ad!=null) p.push('<span class="v2crumb cur">'+esc(prettyName(v2Sel.ad))+'</span>');
  return p.join(' <span class="v2sep">›</span> ');
}
function mountV2(){
  if(!el('v2Wrap')) return;
  var rng=v2RangeFor(v2Period);
  var base=v2Rows().filter(function(r){ return isDate(r.date)&&inRange(r.date,rng)&&v2ChMatch(r); });
  var PW=[{k:'7d',l:'7 dias'},{k:'14d',l:'14 dias'},{k:'30d',l:'30 dias'},{k:'tudo',l:'Tudo'}];
  var CH=[{k:'geral',l:'Geral'},{k:'meta',l:'Meta'}]; if(HAS_GOOGLE) CH.push({k:'google',l:'Google'});
  var clr=(v2Sel.camp!=null||v2Sel.adset!=null||v2Sel.ad!=null)?'<button class="v2clr" id="v2Clear">✕ limpar filtro</button>':'';
  el('v2Filters').innerHTML='<span class="pf-h">Período:</span>'+PW.map(function(w){return '<button data-k="'+w.k+'" class="v2btn'+(v2Period===w.k?' on':'')+'">'+w.l+'</button>';}).join('')
    +'<span class="pf-h pf-ch">Canal:</span>'+CH.map(function(c){return '<button data-ch="'+c.k+'" class="v2btn'+(v2Channel===c.k?' on':'')+'">'+c.l+'</button>';}).join('')
    +'<span class="pf-h pf-ch">Linhas:</span>'+V2LM.map(function(x){return '<button data-lm="'+x.k+'" class="v2btn'+(v2LineMetric===x.k?' on':'')+'">'+x.l+'</button>';}).join('')
    +clr;
  Array.prototype.forEach.call(el('v2Filters').querySelectorAll('.v2btn[data-k]'),function(b){ b.addEventListener('click',function(){ v2Period=b.getAttribute('data-k'); mountV2(); }); });
  Array.prototype.forEach.call(el('v2Filters').querySelectorAll('.v2btn[data-ch]'),function(b){ b.addEventListener('click',function(){ v2Channel=b.getAttribute('data-ch'); mountV2(); }); });
  Array.prototype.forEach.call(el('v2Filters').querySelectorAll('.v2btn[data-lm]'),function(b){ b.addEventListener('click',function(){ v2LineMetric=b.getAttribute('data-lm'); mountV2(); }); });
  if(el('v2Clear')) el('v2Clear').addEventListener('click',function(){ v2Sel={camp:null,adset:null,ad:null}; mountV2(); });
  el('v2Crumb').innerHTML=v2CrumbHTML();
  Array.prototype.forEach.call(el('v2Crumb').querySelectorAll('a.v2crumb'),function(a){ a.addEventListener('click',function(){ var lvl=+a.getAttribute('data-lvl');
    if(lvl===0) v2Sel={camp:null,adset:null,ad:null}; else if(lvl===1) v2Sel={camp:v2Sel.camp,adset:null,ad:null}; else v2Sel={camp:v2Sel.camp,adset:v2Sel.adset,ad:null}; mountV2(); }); });
  var scope=base.filter(function(r){ return (v2Sel.camp==null||r.campaign===v2Sel.camp)&&(v2Sel.adset==null||r.adset===v2Sel.adset)&&(v2Sel.ad==null||r.ad===v2Sel.ad); });
  var agg=newNode('',''); scope.forEach(function(r){ accum(agg,r); });
  el('v2Kpi').innerHTML=v2Kpis(v2Metrics(agg));
  var daysAll=v2DaySeries(scope);
  var days = daysAll.length>1 ? daysAll.filter(function(d){return d.date!==maxDate;}) : daysAll;
  if(!days.length) days=daysAll;
  if(days.length){ el('v2Daily').innerHTML=microChart(days);
    bindHits('v2Daily',days,function(b){ return '<div class="tt-d">'+b.label+'</div><div class="tt-r"><span style="color:'+COL.vio2+'">Investimento</span><b>'+money0(b.spend)+'</b></div><div class="tt-r"><span style="color:'+COL.gold2+'">Faturamento</span><b>'+money0(b.rev)+'</b></div><div class="tt-sub">Vendas '+intf(b.sales)+' · ROAS '+roasf(dv(b.rev,b.spend))+'</div>'; }); }
  else el('v2Daily').innerHTML='<div class="empty">Sem dados no período.</div>';
  var campG=v2groupBy(base,0);
  v2Table('v2TCamp','Campanhas','clique numa linha p/ filtrar tudo · clique de novo p/ limpar',campG,0);
  v2Lines(campG,'v2LinesCamp',0,function(g){ v2Pick(0,g); });
  var conjRows = v2Sel.camp!=null? base.filter(function(r){return r.campaign===v2Sel.camp;}) : base;
  var conjG=v2groupBy(conjRows,1);
  v2Table('v2TAdset','Conjuntos / Grupos', v2Sel.camp!=null?'da campanha selecionada':'todos · selecione uma campanha p/ focar', conjG, 1);
  v2Lines(conjG,'v2LinesAdset',1,function(g){ v2Pick(1,g); });
  var adRows = v2Sel.adset!=null? base.filter(function(r){return r.campaign===v2Sel.camp&&r.adset===v2Sel.adset;}) : (v2Sel.camp!=null? base.filter(function(r){return r.campaign===v2Sel.camp;}) : base);
  var adG=v2groupBy(adRows,2);
  v2Table('v2TAd','Anúncios', v2Sel.adset!=null?'do conjunto selecionado':(v2Sel.camp!=null?'da campanha selecionada':'todos'), adG, 2);
  v2Lines(adG,'v2LinesAd',2,function(g){ v2Pick(2,g); });
}

/* =================== ORQUESTRAÇÃO =================== */
function renderMeta(rng,prng){
  var a=aggMeta(rng), p=aggMeta(prng), days=filteredMetaDays(rng);
  renderKpi(a,p); renderUpsell(a); renderPixel(a); renderFunnel(a,p); renderChartSales(days); renderChartRoas(days); renderChartFilter();
  renderInsights(rng); renderDaily(rng); renderTree(rng);
}
function renderAll(){ var rng=rangeFor(period), prng=prevRange(rng);
  renderGeral(rng,prng); renderMeta(rng,prng); if(HAS_GOOGLE) renderGoogle(rng,prng); renderVendas(rng); mountV2(); }

/* período UI */
function periodsHTML(){ return PRESETS.map(function(p){return '<button data-k="'+p.k+'" class="pbtn">'+p.label+'</button>';}).join('')
  +'<span class="daterange" id="daterange"><span class="dr-l">De</span> <input type="date" id="dtDe" min="'+minDate+'" max="'+maxDate+'"> <span class="dr-l">até</span> <input type="date" id="dtAte" min="'+minDate+'" max="'+maxDate+'"></span>'; }
function syncPeriodUI(){ var rng=rangeFor(period);
  Array.prototype.forEach.call(el('periods').querySelectorAll('.pbtn'),function(b){ b.classList.toggle('on',period===b.getAttribute('data-k')); });
  var dr=el('daterange'); if(dr)dr.classList.toggle('on',period==='custom');
  var de=el('dtDe'),at=el('dtAte'); if(de&&at){ de.value=rng[0]; at.value=rng[1]; } }
function initPeriods(){ el('periods').innerHTML=periodsHTML();
  Array.prototype.forEach.call(el('periods').querySelectorAll('.pbtn'),function(b){ b.addEventListener('click',function(){ period=b.getAttribute('data-k'); customRange=null; syncPeriodUI(); renderAll(); }); });
  var de=el('dtDe'),at=el('dtAte');
  function onDate(){ var s=de.value,e=at.value; if(!s||!e)return; if(s>e){var t=s;s=e;e=t;} if(s<minDate)s=minDate; if(e>maxDate)e=maxDate; customRange=[s,e]; period='custom'; syncPeriodUI(); renderAll(); }
  de.addEventListener('change',onDate); at.addEventListener('change',onDate); syncPeriodUI(); }

var TABS=['geral','meta','google','vendas','v2'];
function activateTab(id){ Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(x){x.classList.toggle('active',x.getAttribute('data-tab')===id);});
  TABS.forEach(function(k){ var e=el('tab-'+k); if(e)e.classList.toggle('hidden',k!==id); }); }
function initTabs(){
  if(!HAS_GOOGLE){ var gt=document.querySelector('.tab[data-tab=google]'); if(gt)gt.style.display='none'; var gs=el('tab-google'); if(gs)gs.remove(); }
  Array.prototype.forEach.call(document.querySelectorAll('.tab'),function(t){ t.addEventListener('click',function(){ var id=t.getAttribute('data-tab'); activateTab(id); if(history.replaceState)history.replaceState(null,'','#'+id); }); });
  var h=(location.hash||'').replace('#',''); if(TABS.indexOf(h)>=0)activateTab(h);
  window.addEventListener('hashchange',function(){ var k=(location.hash||'').replace('#',''); if(TABS.indexOf(k)>=0)activateTab(k); }); }
function initCoverage(){ el('updated').textContent=D.generatedAtBR||'—'; el('taxf').textContent=(D.taxMultiplier||1.1385).toFixed(4).replace('.',',');
  var tm=META.totals||{}, vt=VEN.totals||{};
  var fatT=(tm.rev||0)+(tm.upRev||0), roasFe=dv(tm.rev,tm.spend), roasUp=dv(fatT,tm.spend);
  var win = (META.dateMin&&META.dateMax) ? (fmtBR(META.dateMin)+' → '+fmtBR(META.dateMax)) : '—';
  var upTxt=(tm.upSales>0)?(' + <b>'+intf(tm.upSales)+'</b> upsell ('+esc(UPPROD)+') <b>'+money0(tm.upRev||0)+'</b> → faturamento total <b>'+money0(fatT)+'</b>, ROAS c/ upsell <span class="cy">'+roasf(roasUp)+'</span>'):'';
  el('coverage').innerHTML='<b>Funil VSL '+esc(PRODUTO)+'</b> · Meta Ads. Cruzamento venda × gasto na janela das queries ('+win+'): '
    +'<b>'+intf(tm.sales||0)+'</b> venda(s) front-end · faturamento <b>'+money0(tm.rev||0)+'</b> · ROAS c/ imposto <span class="cy">'+roasf(roasFe)+'</span>'+upTxt+'. '
    +'Funil <b>novo</b> — cresce sozinho a cada 3h conforme entram gasto e vendas.'; }

if(!META.daily.length && !VEN.daily.length){ el('coverage').innerHTML='<b>Sem dados.</b> Rode o build.ps1 para gerar o data.js.'; }
else { initCoverage(); initPeriods(); initTabs(); renderAll(); }
})();
