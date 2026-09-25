(function () {
  'use strict';
  const E = window.AdegaEngine, D = window.AdegaDemo, V = window.AdegaVisual;
  const APP_NAME = 'AdegaControl';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(Number(n) || 0);
  const num = (n, digits = 0) => new Intl.NumberFormat('pt-BR', {maximumFractionDigits:digits}).format(Number(n) || 0);
  const pct = n => n == null || !Number.isFinite(n) ? '—' : num(n, 1) + '%';
  const date = n => new Date(n).toLocaleDateString('pt-BR');
  const stamp = n => new Date(n).toLocaleString('pt-BR', {dateStyle:'short',timeStyle:'short'});
  const icon = n => V.icon(n);
  const kinds = {spirits:'Destilados',supplies:'Insumos e unidades',drinks:'Drinks',combos:'Combos',suppliers:'Fornecedores'};
  const typeNames = {dose:'Dose',garrafa:'Garrafa',drink:'Drink',combo:'Combo',unidade:'Unidade'};
  const paymentNames = {pix:'Pix',dinheiro:'Dinheiro',cartao:'Cartão'};
  const nav = [['panel','Painel','grid'],['counter','Balcão','glass'],['stock','Estoque','bottle'],['reports','Relatórios','chart'],['loss','Vazamento','drop'],['settings','Ajustes','settings']];
  const periods = [['month','Mês atual'],['quarter','Trimestre'],['semester','Semestre'],['year','Anual']];
  let state, profile = 'bairro', mode = localStorage.getItem('adegacontrol.mode') === 'counter' ? 'counter' : 'owner', tab = 'panel', period = 'month', counterFilter = 'all', sellingCounter = 1;
  let selected = null, rank = 'volume', cart = [], search = '', category = 'popular', brand = {}, reportCache = null, inventoryCache = null, chart = null, toastTimer, saveQueue = Promise.resolve(), modalCloseFocus;
  let countDraft = null, editorDraft = null, undoId = null, undoTimer = null;
  const storeKey = p => 'adegacontrol.v4.' + p;
  const defaultBrand = p => ({name:p === 'premium' ? 'Reserva da Casa' : 'Adega do Bairro',color:p === 'premium' ? '#d4b575' : '#c9e879',logo:'',custom:false});
  function find(id) { return state.spirits.find(x=>x.id===id) || state.supplies.find(x=>x.id===id); }
  function owner() { if (mode !== 'owner') throw new Error('Esta ação está disponível somente no modo Dono.'); }
  function invalidate() { reportCache = null; inventoryCache = null; }
  function getReport() { if (!reportCache) reportCache = E.report(state, {period,counter:counterFilter === 'all' ? null : +counterFilter,now:new Date()}); return reportCache; }
  function inventory() { if (!inventoryCache) inventoryCache = E.inventoryStats(state, new Date()); return inventoryCache; }
  function active(arr) { return arr.filter(x=>x.active !== false); }
  function setText(selector, text) { $(selector).textContent = text; }
  function button(label, action, cls = 'secondary', extra = '') { return '<button type="button" class="button '+cls+'" data-action="'+action+'" '+extra+'>'+label+'</button>'; }
  function badge(label, cls = '') { return '<span class="badge '+cls+'">'+label+'</span>'; }
  function metric(label, value, note, help) { return '<article class="metric"><div class="metric-label">'+label+(help ? '<button class="kpi-help" data-action="help" data-help="'+esc(help)+'" aria-label="Como calculamos '+esc(label)+'?">?</button>':'')+'</div><strong class="metric-value">'+value+'</strong><span class="metric-note">'+(note || '')+'</span></article>'; }
  function heading(eyebrow, title, desc, actions = '') { return '<div class="page-heading"><div><span class="eyebrow">'+eyebrow+'</span><h1>'+title+'</h1><p>'+desc+'</p></div><div class="heading-actions">'+actions+'</div></div>'; }
  function empty(title, body, action = '') { return '<div class="empty-state">'+icon('bottle')+'<h3>'+title+'</h3><p>'+body+'</p>'+action+'</div>'; }
  function table(headers, rows, caption = '') { return '<div class="table-wrap"><table>'+(caption?'<caption>'+caption+'</caption>':'')+'<thead><tr>'+headers.map(h=>'<th scope="col">'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'; }
  function toast(message, action) {
    clearTimeout(toastTimer); const el = $('#toast');
    el.innerHTML = '<span>'+esc(message)+'</span>'+(action || '');
    el.classList.add('visible'); toastTimer = setTimeout(()=>el.classList.remove('visible'), action ? 5000 : 4300);
  }
  function modal(title, content, footer = '') {
    const el = $('#modal'); modalCloseFocus = document.activeElement;
    if (el.open) el.close();
    el.innerHTML = '<div class="dialog-head"><div><span class="eyebrow">'+APP_NAME+'</span><h2 id="modal-title">'+title+'</h2></div><button type="button" class="button ghost icon-button" data-action="close-modal" aria-label="Fechar">'+icon('close')+'</button></div><div class="dialog-body">'+content+'</div>'+(footer?'<div class="dialog-foot">'+footer+'</div>':'');
    el.showModal(); const first = $('input:not([type=hidden]),select,textarea,[autofocus]', el); if (first) first.focus();
  }
  function closeModal() { $('#modal').close(); if (modalCloseFocus && modalCloseFocus.isConnected) modalCloseFocus.focus(); }
  async function encode(value) {
    const json = JSON.stringify(value);
    if (!window.CompressionStream) return json;
    const bytes = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    let binary = ''; for (let i=0;i<bytes.length;i+=32768) binary += String.fromCharCode(...bytes.subarray(i,i+32768));
    return 'gz:' + btoa(binary);
  }
  async function decode(raw) {
    if (!raw.startsWith('gz:')) return JSON.parse(raw);
    const binary = atob(raw.slice(3)), bytes = Uint8Array.from(binary,c=>c.charCodeAt(0));
    return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }
  function persist() {
    const data = JSON.stringify(state), target = profile, branding = JSON.stringify(brand);
    saveQueue = saveQueue.catch(()=>{}).then(async()=>{
      try {
        localStorage.setItem(storeKey(target), await encode(JSON.parse(data)));
        localStorage.setItem('adegacontrol.brand', branding);
        localStorage.setItem('adegacontrol.profile', target);
        $('#storage-warning').hidden = true;
      } catch (error) {
        $('#storage-warning').hidden = false;
        $('#storage-warning').textContent = 'Não foi possível salvar neste navegador. Exporte seus dados em Ajustes antes de fechar.';
        console.warn('Persistência indisponível:', error.name);
      }
    });
    return saveQueue;
  }
  function touch() { invalidate(); persist(); render(); }
  function luminance(hex) {
    return hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  }
  function applyBrand() {
    const color = /^#[0-9a-f]{6}$/i.test(brand.color) ? brand.color : '#c9e879';
    const lum = luminance(color), blackContrast = (lum+.05)/.05, whiteContrast = 1.05/(lum+.05);
    document.documentElement.style.setProperty('--accent', color);
    document.documentElement.style.setProperty('--accent-ink', blackContrast >= whiteContrast ? '#111310' : '#ffffff');
    let textColor = color, rgb = color.slice(1).match(/../g).map(x=>parseInt(x,16));
    while ((luminance(textColor)+.05)/(luminance('#171a16')+.05)<4.5 && rgb.some(x=>x<255)) {
      rgb = rgb.map(x=>Math.min(255,x+10)); textColor = '#'+rgb.map(x=>x.toString(16).padStart(2,'0')).join('');
    }
    document.documentElement.style.setProperty('--accent-text', textColor);
    setText('#store-name', brand.name); setText('#sidebar-store', brand.name);
    const initials = brand.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    $('#store-avatar').innerHTML = brand.logo && /^data:image\/(?:png|jpeg|webp);base64,/.test(brand.logo) ? '<img alt="" src="'+brand.logo+'">' : esc(initials || 'A');
    setText('#profile-badge', profile === 'premium' ? 'PREMIUM' : 'BAIRRO');
    document.title = brand.name + ' · ' + APP_NAME;
  }
  async function loadProfile(p) {
    await saveQueue; profile = p; const raw = localStorage.getItem(storeKey(p));
    state = raw ? await decode(raw) : D.generate(p, new Date());
    sellingCounter = +(localStorage.getItem('adegacontrol.counter.'+p) || 1);
    if (sellingCounter > state.settings.counters) sellingCounter = 1;
    cart=[]; selected=null; counterFilter='all'; invalidate();
    if (!brand.custom) brand=defaultBrand(p);
    applyBrand(); await persist();
  }
  function getRangeText() {
    const r = E.periodRange(period, new Date());
    return date(r.start || r.from) + ' — ' + date(r.end || r.to) + '<small>Dia operacional · 6h às 6h</small>';
  }
  function render() {
    if (mode === 'counter' && !['counter','stock'].includes(tab)) tab='counter';
    document.body.dataset.mode=mode;
    $('.nav').innerHTML = nav.filter(x=>mode==='owner'||['counter','stock'].includes(x[0])).map(([id,label,ico])=>'<button class="nav-item" data-action="nav" data-tab="'+id+'" '+(id===tab?'aria-current="page"':'')+'>'+icon(ico)+'<span>'+label+'</span>'+(id===tab?'<i></i>':'')+'</button>').join('');
    $('#mode-button').innerHTML=icon(mode==='owner'?'unlock':'lock')+'<span>'+(mode==='owner'?'Modo Dono':'Modo Balcão')+'</span>';
    $('.toolbar').hidden = mode !== 'owner' || !['panel','reports','loss'].includes(tab);
    $('.periods').innerHTML=periods.map(([id,label])=>'<button data-action="period" data-period="'+id+'" aria-pressed="'+(period===id)+'">'+label+'</button>').join('');
    $('.period-dates').innerHTML=getRangeText();
    $('.counter-filter').hidden=state.settings.counters<2||tab==='loss';
    $('#report-counter').value=counterFilter;
    $('#content').innerHTML = ({panel:renderPanel,counter:renderCounter,stock:renderStock,reports:renderReports,loss:renderLoss,settings:renderSettings})[tab]();
    drawChart();
  }
  function navigate(next) { tab=next; if(next!=='panel') selected=null; render(); $('#content').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
  function componentRows(report) { return report.components || []; }
  function beverageRows(report) {
    return active(state.spirits).map(s=>Object.assign({id:s.id,name:s.name,revenue:0,cost:0,grossMargin:0,fee:0,qty:0,ml:0}, componentRows(report).find(x=>x.id===s.id) || {}, {item:s}));
  }
  function byVolume(a,b) { return (b.ml ?? b.qty ?? 0)-(a.ml ?? a.qty ?? 0) || b.revenue-a.revenue || a.name.localeCompare(b.name,'pt-BR'); }
  function byMargin(a,b) { return b.grossMargin-a.grossMargin || b.revenue-a.revenue || a.name.localeCompare(b.name,'pt-BR'); }
  function stockInfo(id) { const inv=inventory(); return (Array.isArray(inv)?inv:(inv.items||[])).find(x=>x.id===id) || {}; }
  function supplierName(id) { return state.suppliers.find(x=>x.id===id)?.name || 'Fornecedor não informado'; }
  function levelText(s) { return num(Math.floor(s.open/state.settings.dose))+' doses <span class="muted">+ '+num(s.open%state.settings.dose,1)+' ml na aberta</span>'; }
  function chartMarkup(series) {
    const rows=(series||[]).map(x=>[esc(x.label||x.date||x.day),money(x.revenue||x.value||0)]);
    return '<div class="chart-wrap"><canvas id="revenue-chart" aria-label="Evolução do faturamento no período" role="img"></canvas><div id="chart-table">'+table(['Período','Faturamento'],rows,'Evolução do faturamento')+'</div></div>';
  }
  function drawChart() {
    if(chart){chart.destroy();chart=null;}
    const canvas=$('#revenue-chart'); if(!canvas)return;
    const series=getReport().series||[];
    if (!window.Chart) { canvas.hidden=true; $('#chart-table').hidden=false; return; }
    canvas.hidden=false; $('#chart-table').hidden=true;
    let values=series.map(x=>x.revenue||x.value||0), labels=series.map(x=>x.label||x.date||x.day);
    if(selected) { const chosen=componentRows(getReport()).find(x=>x.id===selected); if(chosen?.series){values=chosen.series.map(x=>x.revenue||0);labels=chosen.series.map(x=>x.label||x.date);} }
    const context=canvas.getContext('2d'), color=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#c9e879';
    const gradient=context.createLinearGradient(0,0,0,230);gradient.addColorStop(0,color+'40');gradient.addColorStop(1,color+'00');
    chart=new Chart(context,{
      type:'line',
      data:{labels,datasets:[{data:values,borderColor:color,backgroundColor:gradient,fill:true,tension:.35,borderWidth:2,pointRadius:0,pointHitRadius:15}]},
      options:{
        responsive:true,maintainAspectRatio:false,
        animation:window.matchMedia('(prefers-reduced-motion: reduce)').matches?false:{duration:350},
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>money(ctx.parsed.y)}}},
        scales:{
          x:{grid:{display:false},ticks:{color:'#92998b',maxTicksLimit:7,maxRotation:0,font:{size:10}},border:{display:false}},
          y:{grid:{color:'#ffffff09'},border:{display:false},ticks:{color:'#92998b',maxTicksLimit:4,callback:v=>v>=1000?'R$ '+num(v/1000,1)+' mil':money(v),font:{size:10}}}
        }
      }
    });
  }
  function selectBeverage(id) { selected=id||null; tab='panel'; history.replaceState(null,'',location.pathname+location.search+(selected?'#bebida='+encodeURIComponent(selected):''));render(); }
  function tourMarkup() {
    if(mode!=='owner'||state.tourDismissed)return '';
    return '<div class="tour"><div><span class="eyebrow">CONHEÇA SUA ADEGA EM 3 PASSOS</span><strong>Experimente. Os números acompanham você.</strong></div><div class="tour-steps">'+[['counter','1','Registre uma venda'],['panel','2','Confira a margem'],['stock','3','Veja o estoque']].map(([id,n,label])=>'<button data-action="nav" data-tab="'+id+'" class="step"><b>'+n+'</b>'+label+icon('arrow-right')+'</button>').join('')+'</div><button class="button ghost icon-button" data-action="dismiss-tour" aria-label="Dispensar roteiro">'+icon('close')+'</button></div>';
  }
  function renderPanel() {
    const report=getReport(), totals=report.totals, rows=beverageRows(report), ordered=rows.slice().sort(rank==='margin'?byMargin:byVolume);
    const winner=report.rankings.most, loser=report.rankings.least, profitable=report.rankings.bestMargin;
    const chosen=rows.find(x=>x.id===selected);
    let hero;
    if(chosen){
      const s=chosen.item, inv=stockInfo(s.id), rankIndex=rows.slice().sort(byVolume).findIndex(x=>x.id===s.id)+1;
      const usedBy=active(state.drinks).filter(d=>d.components.some(c=>c.id===s.id));
      hero='<section class="hero beverage-hero"><div class="hero-copy"><span class="eyebrow">'+esc(s.type)+' · '+num(s.volume)+' ML</span><h2>'+esc(s.name)+'</h2><p>O que cada garrafa traz para a sua adega.</p><div class="hero-stats">'+metric('Faturamento',money(chosen.revenue),'Inclui drinks e combos','rateio')+metric('Margem bruta',money(chosen.grossMargin),pct(chosen.revenue>0?chosen.grossMargin/chosen.revenue*100:null)+' sobre a receita','margem')+metric('Após taxas',money(chosen.grossMargin-chosen.fee),'Margem após taxas de pagamento','taxas')+'</div><div class="beverage-facts"><span>'+badge(rankIndex+'ª em volume')+'</span><span><strong>'+num((chosen.ml??chosen.qty)/state.settings.dose,1)+'</strong> doses equivalentes</span><span><strong>'+num(s.closed)+'</strong> garrafas fechadas</span></div><div class="notice subtle">'+levelText(s)+'<br><small>'+coverageText(inv)+'</small></div><p class="muted small-text">Na ficha de '+(usedBy.map(d=>esc(d.name)).join(', ')||'nenhum drink ativo')+'.</p>'+button(icon('arrow-left')+' Visão geral','select','ghost small','data-id=""')+'</div><div class="hero-art"><div class="bottle-stage">'+V.bottle(s,{large:true,level:true})+'</div><span class="bottle-caption">'+esc(s.name)+' · '+num(s.volume)+' ml</span></div></section><section class="panel"><div class="panel-header"><div><span class="eyebrow">DESEMPENHO DA BEBIDA</span><h3>Evolução no período</h3></div>'+button('Ver relatório completo','nav','ghost small','data-tab="reports"')+'</div>'+chartMarkup(chosen.series||[])+'</section>'+beverageDetails(chosen,inv);
    } else {
      hero='<section class="hero overview-hero"><div class="hero-copy"><span class="eyebrow">VISÃO GERAL DA SUA ADEGA</span><h2>Seu estoque.<br>Seu giro.<br><em>Sua margem.</em></h2><p>Da primeira dose ao último fechamento.<br>Veja o que faz a sua adega render.</p>'+button('Registrar uma venda '+icon('arrow-right'),'nav','primary','data-tab="counter"')+'<span class="hero-footnote">'+icon('check')+' Todos os números vêm dos mesmos movimentos.</span></div><div class="hero-art overview-bottles"><div class="bottle-glow"></div>'+['whisky-ambar','whisky-reserva','vodka-clara'].map(id=>active(state.spirits).find(s=>s.id===id)).filter(Boolean).concat(active(state.spirits)).filter((s,i,a)=>a.findIndex(x=>x.id===s.id)===i).slice(0,3).map((s,i)=>'<button class="hero-bottle hero-bottle-'+i+'" data-action="select" data-id="'+esc(s.id)+'" aria-label="Ver '+esc(s.name)+'">'+V.bottle(s,{large:true})+'</button>').join('')+'<div class="hero-art-label"><span>UMA NOVA VISÃO</span><strong>do seu balcão.</strong></div></div></section><div class="grid cols-4 kpi-grid">'+metric('Faturamento',money(totals.revenue),'Vendas menos cancelamentos','faturamento')+metric('Margem bruta',money(totals.grossMargin),'Receita menos custo de fornecedor','margem')+metric('Margem após taxas',money(totals.marginAfterFees),'Taxas líquidas: '+money(totals.fee),'taxas')+metric('Diferença de estoque',report.losses.hasCounts?money(report.losses.potential):'—',report.losses.hasCounts?'Receita potencial · adega inteira':'Sem contagem no período','vazamento')+'</div><section class="panel"><div class="panel-header"><div><span class="eyebrow">O RITMO DO SEU NEGÓCIO</span><h3>Faturamento no período</h3></div><span class="badge muted">MOVIMENTOS REGISTRADOS</span></div>'+chartMarkup(report.series)+'</section>';
    }
    const stale=state.origin==='demo'&&new Date(E.opDate(new Date()))-new Date(E.opDate(state.generatedUntil||state.baseDate))>=7*86400000;
    return heading('PAINEL DA ADEGA','Uma boa dose de controle.','O negócio inteiro, com os números na mesa.',button(icon('copy')+' Copiar resumo','copy-summary','secondary small'))+
      (stale?'<div class="notice">Demonstração gerada em '+date(state.generatedUntil||state.baseDate)+'. Seus testes estão preservados. '+button('Atualizar demonstração','restore','ghost small')+'</div>':'')+tourMarkup()+hero+
      '<div class="section-heading"><div><span class="eyebrow">AS ESTRELAS DO PERÍODO</span><h3>Cada bebida conta uma história.</h3></div></div><div class="spotlights">'+[[winner,'Mais vendida','trophy'],[loser,'Menos vendida','arrow-down'],[profitable,'Maior margem em R$','trending']].filter(x=>x[0]).map(([r,label,ico])=>'<button class="spotlight" data-action="select" data-id="'+esc(r.id)+'"><span class="spotlight-icon">'+icon(ico)+'</span><span><span class="eyebrow">'+label+'</span><strong>'+esc(r.name)+'</strong><small>'+(label.startsWith('Maior')?money(r.grossMargin)+' · '+pct(r.revenue>0?r.grossMargin/r.revenue*100:null):num((r.ml??r.qty)/state.settings.dose,1)+' doses equivalentes')+'</small></span>'+icon('arrow-up-right')+'</button>').join('')+'</div>'+
      '<section class="collection-section"><div class="panel-header"><div><span class="eyebrow">EXPLORE SUA ADEGA</span><h3>Uma garrafa. Todos os números.</h3></div><div class="collection-controls"><div class="tabs">'+button('Volume','rank',rank==='volume'?'primary small':'ghost small','data-rank="volume"')+button('Margem (R$)','rank',rank==='margin'?'primary small':'ghost small','data-rank="margin"')+'</div>'+button(icon('chevron-left'),'carousel','ghost icon-button','data-direction="-1" aria-label="Garrafas anteriores"')+button(icon('chevron-right'),'carousel','ghost icon-button','data-direction="1" aria-label="Próximas garrafas"')+'</div></div><div class="bottle-carousel" role="listbox" aria-label="Escolher bebida"><button class="bottle-tile overview-tile" role="option" aria-selected="'+!selected+'" data-action="select" data-id=""><span class="overview-symbol">'+icon('grid')+'</span><strong>Visão geral</strong><small>Toda a sua adega</small></button>'+ordered.map(r=>'<button class="bottle-tile" role="option" aria-selected="'+(r.id===selected)+'" data-action="select" data-id="'+esc(r.id)+'">'+V.bottle(r.item)+'<strong>'+esc(r.name)+'</strong><small>'+esc(r.item.type)+' · '+num(r.item.volume)+' ml</small><span class="tile-value">'+(rank==='margin'?money(r.grossMargin)+' · '+pct(r.revenue>0?r.grossMargin/r.revenue*100:null):num((r.ml??r.qty)/state.settings.dose,1)+' doses eq.')+'</span>'+(r.id===winner?.id?badge('Mais vendida','good'):r.item.closed<=r.item.min?badge('Repor','warn'):'')+'</button>').join('')+'</div></section>'+
      '<aside class="partner-banner"><div class="partner-symbol">'+icon('glass')+'</div><div><span class="eyebrow">PLANO PARCEIRO</span><h3>Mais precisão em cada dose.</h3><p>Suporte mensal + 1 dosador giratório profissional por balcão.</p><small>Fidelidade de 12 meses. Dosador manual, sem sensor.</small></div><span class="partner-seal">NA MEDIDA<br><b>DA SUA ADEGA</b></span></aside>';
  }
  window.addEventListener('chartsready',()=>{if(state)drawChart();});
  window.addEventListener('hashchange',()=>{const match=location.hash.match(/^#bebida=(.+)$/);if(match&&mode==='owner'){selected=decodeURIComponent(match[1]);tab='panel';render();}});
  // Demais telas e eventos ficam abaixo, no mesmo arquivo para a entrega HTML.
  function products() {
    return [
      ...active(state.drinks).map(x=>({type:'drink',id:x.id,name:x.name,price:x.price,subtitle:x.components.some(c=>c.id==='energetico')?'Destilado + energético + gelo':'Ficha técnica completa',item:state.spirits.find(s=>x.components.some(c=>c.id===s.id))})),
      ...active(state.combos).map(x=>({type:'combo',id:x.id,name:x.name,price:x.price,subtitle:'Combinação da casa',item:state.spirits.find(s=>x.items.some(c=>c.id===s.id||c.type==='drink'&&state.drinks.find(d=>d.id===c.id)?.components.some(a=>a.id===s.id)))})),
      ...active(state.spirits).map(x=>({type:'dose',id:x.id,name:x.name,price:x.dosePrice,subtitle:num(state.settings.dose)+' ml · '+x.type,item:x})),
      ...active(state.spirits).filter(x=>x.bottlePrice>0).map(x=>({type:'garrafa',id:x.id,name:x.name,price:x.bottlePrice,subtitle:num(x.volume)+' ml · garrafa fechada',item:x})),
      ...active(state.supplies).filter(x=>x.price>0).map(x=>({type:'unidade',id:x.id,name:x.name,price:x.price,subtitle:'Por '+x.unit,item:x}))
    ];
  }
  function product(type,id) { return products().find(p=>p.type===type&&p.id===id); }
  function productGrid() {
    let list=products().filter(p=>(category==='all'||category===p.type||category==='popular')&&p.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
    if(category==='popular') {
      const sales=E.report(state,{period:'month',counter:null,now:new Date()}).items||[];
      list.sort((a,b)=>(sales.find(x=>x.id===b.id&&x.type===b.type)?.qty||0)-(sales.find(x=>x.id===a.id&&x.type===a.type)?.qty||0)); list=list.slice(0,8);
    }
    return list.length ? list.map(p=>{
      const qty=cart.find(x=>x.id===p.id&&x.type===p.type)?.qty||0;
      return '<article class="product-tile '+(qty?'in-cart':'')+'"><button class="product-add" data-action="add" data-id="'+esc(p.id)+'" data-type="'+p.type+'"><span class="product-category">'+typeNames[p.type]+'</span><span class="product-illustration">'+(p.item&&p.type!=='unidade'?V.bottle(p.item):icon(p.type==='combo'?'package':p.type==='drink'?'glass':'box'))+'</span><strong>'+esc(p.name)+'</strong><small>'+esc(p.subtitle)+'</small><span class="product-bottom"><b>'+money(p.price)+'</b><span class="add-circle">'+(qty?num(qty):'+')+'</span></span></button><button class="quick-sell" data-action="quick" data-type="'+p.type+'" data-id="'+esc(p.id)+'">Vender já '+icon('arrow-up-right')+'</button></article>';
    }).join('') : empty('Nenhum item por aqui.','Cadastre produtos ou ajuste sua busca.',mode==='owner'?button('Abrir cadastros','nav','secondary','data-tab="settings"'):'');
  }
  function renderCart() {
    let quote=null,error='';try{if(cart.length)quote=E.quote(state,cart);}catch(e){error=e.message;}
    const total=cart.reduce((v,l)=>v+(product(l.type,l.id)?.price||0)*l.qty,0);
    return '<div class="cart-head"><span class="eyebrow">COMANDA RÁPIDA</span><h3>Mais uma boa venda.</h3><p>Adicione os itens. Escolha como receber.</p></div><div class="cart-items">'+(cart.length?cart.map((l,i)=>{
      const p=product(l.type,l.id);
      return '<div class="cart-line"><div><strong>'+esc(p?.name||l.id)+'</strong><small>'+typeNames[l.type]+' · '+money(p?.price||0)+'</small></div><div class="qty-control"><button aria-label="Diminuir '+esc(p?.name)+'" data-action="cart-minus" data-index="'+i+'">−</button><span>'+num(l.qty,3)+'</span><button aria-label="Aumentar '+esc(p?.name)+'" data-action="cart-plus" data-index="'+i+'">+</button></div><b>'+money((p?.price||0)*l.qty)+'</b></div>';
    }).join(''):'<div class="cart-empty">'+icon('glass')+'<p>Sua próxima venda<br>começa com um toque.</p></div>')+'</div>'+
    (error?'<div class="notice warn" role="alert">'+esc(error)+'</div>':'')+
    '<div class="cart-totals"><span>Total da comanda</span><strong>'+money(total)+'</strong></div>'+
    (mode==='owner'&&quote?'<div class="cart-margin"><span>Margem bruta prevista</span><b>'+money((quote.revenue??total)-(quote.cost||0))+'</b></div>':'')+
    '<span class="eyebrow payment-label">TOQUE PARA FINALIZAR</span><div class="payments">'+Object.entries(paymentNames).map(([id,label])=>'<button data-action="pay" data-payment="'+id+'" '+(!cart.length||error?'disabled':'')+'>'+icon(id==='cartao'?'card':id==='dinheiro'?'cash':'pix')+'<span>'+label+'</span></button>').join('')+'</div><small class="payment-note">Registro manual. Sem cobrança ou integração.</small>'+(cart.length?button('Limpar comanda','clear-cart','ghost small'):'');
  }
  function coverageText(inv) { return !inv.sufficientHistory?'Cobertura: histórico insuficiente':inv.coverage===Infinity?'Cobertura: sem consumo nos últimos 30 dias':'Cobertura estimada: '+num(inv.coverage,1)+' dias'; }
  function beverageDetails(row,inv) {
    const channels=row.channels||{}, usage=row.usage||[], latest=(getReport().losses.items||[]).find(x=>x.id===row.id)?.latest;
    return '<section class="panel"><div class="panel-header"><div><span class="eyebrow">DO BALCÃO AO ESTOQUE</span><h3>Por onde esta bebida gira</h3></div>'+badge(inv.reorder?'Reposição recomendada':'Estoque disponível',inv.reorder?'warn':'good')+'</div><div class="grid cols-2"><div>'+table(['Canal','Volume'],['dose','garrafa','drink','combo'].map(k=>[typeNames[k],num(channels[k]||0,1)+' ml']))+'</div><div>'+table(['Drink ou combo vendido','Usos','Volume'],usage.slice().sort((a,b)=>b.amount-a.amount).map(x=>[esc(x.name),num(x.qty,1),num(x.amount,1)+' ml']))+'</div></div><p class="muted">'+coverageText(inv)+'. Consumo físico dos últimos 30 dias: '+num(inv.consumption||0,1)+' ml.</p><p>'+(latest?'Última contagem no período: '+date(latest.at)+' · '+num(latest.shortage||0,1)+' ml faltantes · '+num(latest.surplus||0,1)+' ml de sobra · receita potencial '+money(latest.potential):'Sem contagem desta bebida no período.')+'</p></section>';
  }
  function renderCounter() {
    const today=E.report(state,{period:'day',counter:null,now:new Date()}).totals;
    return heading('BALCÃO','Venda simples. Controle completo.','Do pedido ao estoque, tudo na mesma comanda.',
      (mode==='owner'?button(icon('history')+' Histórico','history','secondary small'):'')+
      (state.settings.counters>1?'<label class="selling-counter">Vendendo no <select id="selling-counter"><option value="1" '+(sellingCounter===1?'selected':'')+'>Balcão 1</option><option value="2" '+(sellingCounter===2?'selected':'')+'>Balcão 2</option></select></label>':badge('Balcão 1'))) +
      '<div class="day-summary"><span><b>'+num(today.sales)+'</b> vendas no dia · adega</span><span><b>'+money(today.revenue)+'</b> faturamento</span>'+(mode==='owner'?'<span><b>'+money(today.grossMargin)+'</b> margem bruta</span>'+button(icon('copy')+' Resumo do dia','copy-day','ghost small'):'')+'<small>Dia operacional '+esc(E.opDate(new Date()))+' · 6h às 6h</small></div>'+
      '<div class="counter-layout"><section class="counter-products"><label class="search-field">'+icon('search')+'<input id="product-search" type="search" placeholder="Buscar bebida, drink ou combo…" aria-label="Buscar produtos" value="'+esc(search)+'"></label><div class="tabs category-tabs" role="group" aria-label="Categoria de produtos">'+[['all','Todos'],['popular','Mais vendidos'],['drink','Drinks'],['combo','Combos'],['dose','Doses'],['garrafa','Garrafas'],['unidade','Outros']].map(([id,label])=>'<button data-action="category" data-category="'+id+'" aria-pressed="'+(category===id)+'">'+label+'</button>').join('')+'</div><div class="product-grid" id="product-grid">'+productGrid()+'</div></section><aside class="cart-panel" id="cart-panel" tabindex="-1" aria-label="Comanda atual">'+renderCart()+'</aside></div>'+(cart.length?'<button class="mobile-cart" data-action="show-cart"><span>'+num(cart.reduce((a,l)=>a+l.qty,0))+' itens na comanda</span><strong>'+money(cart.reduce((a,l)=>a+(product(l.type,l.id)?.price||0)*l.qty,0))+' '+icon('arrow-right')+'</strong></button>':'');
  }
  function renderStock() {
    const low=active(state.spirits).filter(x=>x.closed<=x.min).length+active(state.supplies).filter(x=>x.stock<=x.min).length;
    return heading('ESTOQUE ATUAL','Cada garrafa, no seu lugar.','Saldo da adega inteira. Atualizado a cada movimento.',(mode==='owner'?button(icon('list')+' Lista de compras','shopping','secondary small'):'')+badge(num(low)+' para repor',low?'warn':'good'))+
      '<div class="notice subtle">'+icon('info')+' O estoque é compartilhado entre os balcões. Estes saldos não mudam com o período dos relatórios.</div>'+
      '<div class="inventory-grid">'+active(state.spirits).map(s=>{
        const inv=stockInfo(s.id);
        return '<article class="inventory-card"><div class="inventory-top"><span class="eyebrow">'+esc(s.type)+'</span>'+badge(s.closed<=s.min?'Repor':'Em estoque',s.closed<=s.min?'warn':'good')+'</div><div class="inventory-main"><'+(mode==='owner'?'button data-action="select" data-id="'+esc(s.id)+'" aria-label="Abrir painel de '+esc(s.name)+'"':'div')+' class="stock-bottle">'+V.bottle(s,{level:true})+'</'+(mode==='owner'?'button':'div')+'><div><h3>'+esc(s.name)+'</h3><span class="muted">'+num(s.volume)+' ml por garrafa</span><div class="stock-number">'+num(s.closed)+'<small>garrafas fechadas</small></div><div class="stock-level"><i style="width:'+Math.max(0,Math.min(100,s.open/s.volume*100))+'%"></i></div><div class="stock-doses">'+levelText(s)+'</div></div></div>'+
        (mode==='owner'?'<div class="stock-cost"><span>Custo em estoque <b>'+(s.cost==null?'Não informado':money(E.stock(s)*s.cost))+'</b></span><small>'+esc(supplierName(s.supplierId))+'</small></div><div class="inventory-actions">'+button('Vender dose','quick','secondary small','data-type="dose" data-id="'+esc(s.id)+'"')+button('+ Compra','purchase','ghost small','data-id="'+esc(s.id)+'"')+(!s.open&&s.closed>0?button('Abrir garrafa','open-bottle','ghost small','data-id="'+esc(s.id)+'"'):'')+'</div>':'')+'</article>';
      }).join('')+'</div>'+
      (!state.spirits.length?empty('A sua adega começa aqui.','Cadastre os destilados e informe o estoque que já existe.',mode==='owner'?button('Cadastrar destilado','new-item','primary','data-kind="spirits"'):''):'')+
      '<section class="panel"><div class="panel-header"><div><span class="eyebrow">ALÉM DAS GARRAFAS</span><h3>Insumos e unidades</h3></div>'+badge(num(active(state.supplies).length)+' itens','muted')+'</div>'+
      table(['Item','Estoque','Mínimo','Situação',...(mode==='owner'?['Custo atual','']:[])],active(state.supplies).map(s=>[esc(s.name),'<strong>'+num(s.stock,3)+' '+esc(s.unit)+'</strong>',num(s.min,3)+' '+esc(s.unit),badge(s.stock<=s.min?'Repor':'Disponível',s.stock<=s.min?'warn':'good'),...(mode==='owner'?[(s.cost==null?'Não informado':money(s.cost)+' / '+esc(s.unit)),button('+ Compra','purchase','ghost small','data-id="'+esc(s.id)+'"')]:[])]))+'</section>';
  }
  function renderReports() {
    const r=getReport(),t=r.totals;
    const items=(r.items||[]).slice().sort((a,b)=>b.revenue-a.revenue);
    const pay=Array.isArray(r.payments)?r.payments:Object.entries(r.payments||{}).map(([id,v])=>({id,...v}));
    const stats=inventory(); const inv=Array.isArray(stats)?stats:(stats.items||[]);
    const stagnant=inv.filter(x=>x.stagnant||x.idle);
    const compared=active(state.drinks).map(d=>{
      const distilled=d.components.filter(c=>state.spirits.some(s=>s.id===c.id)); if(!distilled.length)return null;
      if(d.components.some(c=>!find(c.id)||find(c.id).cost==null))return [esc(d.name),'Informe o custo','Informe o custo','—'];
      const cost=d.components.reduce((a,c)=>a+find(c.id).cost*c.qty,0);
      const doseRevenue=distilled.reduce((a,c)=>a+(find(c.id)?.dosePrice||0)*c.qty/state.settings.dose,0);
      const doseCost=distilled.reduce((a,c)=>a+(find(c.id)?.cost||0)*c.qty,0);
      const delta=(d.price-cost)-(doseRevenue-doseCost);
      return [esc(d.name),money(d.price-cost),money(doseRevenue-doseCost),'<span class="'+(delta>=0?'positive':'negative')+'">'+money(Math.abs(delta))+' '+(delta>=0?'a mais':'a menos')+'</span>'];
    }).filter(Boolean);
    return heading('RELATÓRIOS','O que gira. O que rende.','Números que ajudam a decidir a próxima compra.',button(icon('copy')+' Copiar resumo','copy-summary','secondary small'))+
      '<div class="grid cols-3 kpi-grid">'+metric('Faturamento',money(t.revenue),'Vendas menos estornos','faturamento')+metric('Margem bruta',money(t.grossMargin),'Sem aluguel e outras despesas','margem')+metric('Taxas de pagamento',money(t.fee),'Taxas originais menos devolvidas','taxas')+metric('Margem após taxas',money(t.marginAfterFees),pct(t.marginPct),'taxas')+metric('Doses equivalentes',num((t.soldMl||0)/state.settings.dose,1),num(state.settings.dose)+' ml por dose equivalente','volume')+metric('Garrafas abertas equivalentes',num(t.openBottleEquivalents||0,1),num(t.bottles||0)+' garrafas fechadas vendidas','volume')+'</div>'+
      '<section class="panel"><div class="panel-header"><div><span class="eyebrow">RESULTADO POR ITEM VENDIDO</span><h3>Seu cardápio em números</h3></div><span class="badge muted">SEM RATEIO</span></div>'+
      (items.length?table(['Item','Quantidade','Faturamento','Custo','Margem bruta','Margem %'],items.map((x,i)=>[esc(x.name)+(i<3?' '+badge('Top '+(i+1),'good'):i>=items.length-3?' '+badge('Menor giro','muted'):''),num(x.qty,1),money(x.revenue),money(x.cost),'<strong>'+money(x.grossMargin)+'</strong>',pct(x.revenue>0?x.grossMargin/x.revenue*100:null)])):empty('Sem vendas neste período.','Registre uma venda ou escolha outro período.'))+'</section>'+
      '<div class="grid cols-2"><section class="panel"><div class="panel-header"><div><span class="eyebrow">COMO SEUS CLIENTES PAGAM</span><h3>Mix de pagamento</h3></div></div><p class="muted small-text">Percentuais das vendas registradas antes dos cancelamentos.</p>'+table(['Forma','Vendas','Participação','Estornos','Líquido','Taxas cobradas','Taxas devolvidas','Taxas líquidas'],pay.map(p=>[paymentNames[p.id||p.payment]||esc(p.name),money(p.salesRevenue||0),pct(p.pct ?? p.share ?? null),money(p.cancelledRevenue||0),money(p.revenue||0),money(p.chargedFees||0),money(p.returnedFees||0),money(p.fee||0)]))+'</section><section class="panel"><div class="panel-header"><div><span class="eyebrow">COMBINAÇÕES DA CASA</span><h3>Resultado dos combos</h3></div></div>'+table(['Combo','Vendas','Margem','Desconto / acréscimo'],items.filter(x=>x.type==='combo').map(x=>[esc(x.name),num(x.qty),money(x.grossMargin),(x.discount<0?'Acréscimo ':'')+money(Math.abs(x.discount||0))]))+'</section></div>'+
      (state.settings.counters>1?'<section class="panel"><div class="panel-header"><div><span class="eyebrow">DOIS BALCÕES, UMA ADEGA</span><h3>Resultado por balcão</h3></div></div><div class="grid cols-2">'+[1,2].map(n=>{const v=E.report(state,{period,counter:n,now:new Date()}).totals;return '<div class="counter-result"><h4>Balcão '+n+'</h4><strong>'+money(v.revenue)+'</strong><p>Margem bruta: '+money(v.grossMargin)+'</p></div>';}).join('')+'</div></section>':'')+
      '<section class="panel"><div class="panel-header"><div><span class="eyebrow">MESMA QUANTIDADE DE DESTILADO</span><h3>Drink ou dose?</h3></div></div><p class="muted small-text">A margem do drink já desconta energético, gelo e os demais ingredientes.</p>'+table(['Drink','Margem do drink','Margem em doses','Diferença'],compared)+'</section>'+
      '<div class="grid cols-2"><section class="panel"><div class="panel-header"><div><span class="eyebrow">ESTOQUE ATUAL · ADEGA INTEIRA</span><h3>Dinheiro parado</h3></div></div>'+
      (stagnant.length?table(['Item','Capital parado','Cobertura'],stagnant.map(i=>{const s=find(i.id);return [esc(s?.name||i.name),money(E.stock(s)*s.cost),Number.isFinite(i.coverage)?num(i.coverage,1)+' dias':'Sem consumo recente'];})):empty('O giro está em dia.','Nenhum item atende ao critério de dinheiro parado.'))+
      '</section><section class="panel"><div class="panel-header"><div><span class="eyebrow">HISTÓRICO PRESERVADO</span><h3>Cancelamentos</h3></div></div>'+metric('Cancelamentos no período',num(t.cancellations),money(t.cancelledRevenue)+' estornados · data do cancelamento','cancelamento')+metric('Custo já consumido',money(t.cancelledConsumedCost),'Identificado separadamente do vazamento','cancelamento')+button('Consultar histórico de vendas','history','secondary small')+'</section></div>';
  }
  function lossRows() {
    const r=getReport(), losses=r.losses;
    if(Array.isArray(losses))return losses;
    return (losses?.entries||[]).slice().reverse();
  }
  function renderLoss() {
    const rows=lossRows(), loss=getReport().losses||{}, cost=loss.cost||loss.totalCost||rows.reduce((a,x)=>a+(x.lossCost||x.costLoss||0),0), potential=loss.potential||loss.revenue||rows.reduce((a,x)=>a+(x.potential||0),0);
    return heading('VAZAMENTO','Cada dose faz diferença.','Conte o que existe. Entenda a diferença.',button(icon('clipboard')+' Fazer contagem agora','count-start','primary'))+
      '<div class="notice subtle">'+icon('info')+' Estoque compartilhado da adega. A contagem não é atribuída a um balcão.</div>'+
      (loss.hasCounts?'<section class="loss-hero panel"><div><span class="eyebrow">RECEITA POTENCIAL EQUIVALENTE</span><strong class="loss-value">'+money(potential)+'</strong><h2>em doses que deixaram<br>de ser vendidas <em>(estimativa)</em></h2><p>O valor compara o volume faltante ao preço de dose registrado em cada contagem.</p>'+button('Como chegamos a este número?','help','ghost small','data-help="vazamento"')+'</div><div class="loss-details">'+metric('Custo do estoque faltante',money(cost),'Destilados + insumos contados','vazamento')+metric('Custo das sobras',money(loss.surplusCost||0),'Separado das faltas; sem compensação','vazamento')+'<p class="muted">Sobras são mostradas separadamente. Item não contado não significa perda zero.</p></div></section>':empty('Sem contagem neste período.','Ainda não há evidência para estimar diferenças. Faça uma contagem ou consulte um intervalo anterior.'))+
      '<section class="panel"><div class="panel-header"><div><span class="eyebrow">CONCILIAÇÃO NO PERÍODO</span><h3>O teórico encontra o real.</h3></div></div>'+
      (rows.length?table(['Item / contagem','Teórico','Contado','Falta / sobra','Doses faltantes eq.','Custo faltante','Receita potencial'],rows.map(x=>{
        const s=find(x.id||x.itemId), unit=s?.volume?'ml':(s?.unit||x.unit||'un'),diff=x.difference??x.diff??0;
        return [esc(x.name||s?.name||'Item')+'<small class="cell-note">'+(x.at?date(x.at):'')+(x.reason?' · '+esc(x.reason):'')+'</small>',x.skip?'—':num(x.theoretical??x.expected??0,2)+' '+unit,x.skip?'Sem contagem':num(x.counted??x.actual??0,2)+' '+unit,x.skip?badge('Sem contagem','muted'):badge((diff>0?'Falta ':diff<0?'Sobra ':'Conferido ')+num(Math.abs(diff),2)+' '+unit,diff>0?'warn':diff<0?'good':'muted'),x.kind==='spirit'&&!x.skip?num((x.shortage||0)/x.dose,1):'—',x.skip?'—':money(x.cost??0),s?.volume&&!x.skip?money(x.potential||0):'—'];
      })):empty('Sem contagem neste período.','Faça uma contagem ou consulte um intervalo anterior. Ainda não há evidência para estimar diferenças.'))+'</section>'+
      '<section class="panel simulator"><div class="panel-header"><div><span class="eyebrow">UMA PEQUENA DIFERENÇA, MUITAS VEZES</span><h3>Simulador de dose excessiva</h3></div>'+badge('HIPÓTESES, NÃO PROMESSA','muted')+'</div><div class="grid cols-2"><div><div class="form-grid">'+field('Medida prevista (ml)','sim-planned',state.settings.dose,'number','min="1" step="1"')+field('Medida servida (ml)','sim-served',state.settings.dose+10,'number','min="1" step="1"')+field('Doses por dia','sim-doses',80,'number','min="0" step="1"')+field('Dias','sim-days',30,'number','min="1" max="366" step="1"')+field('Preço da dose (R$)','sim-price',10,'number','min="0" step=".01"')+field('Custo por litro (R$)','sim-cost',45,'number','min="0" step=".01"')+'</div></div><div id="sim-result" class="sim-result"></div></div><p class="muted">Padronizar a dose com o dosador ajuda a reduzir diferenças. Investigue também registros, fichas técnicas e contagens.</p></section>';
  }
  function field(label,id,value='',type='text',attrs='') { return '<label class="field" for="'+id+'"><span>'+label+'</span><input id="'+id+'" name="'+id+'" type="'+type+'" value="'+esc(value)+'" '+attrs+'></label>'; }
  function simulate() {
    const el=$('#sim-result');if(!el)return;
    const val=id=>Math.max(0,Number($('#'+id).value)||0), planned=Math.max(1,val('sim-planned')), served=val('sim-served'), ml=Math.max(0,served-planned)*val('sim-doses')*val('sim-days');
    el.innerHTML='<span class="eyebrow">NESSE CENÁRIO</span><strong>'+num(ml/1000,2)+' litros</strong><p>servidos além da medida prevista</p><div class="grid cols-2"><div><b>'+money(ml/planned*val('sim-price'))+'</b><span>receita potencial equivalente</span></div><div><b>'+money(ml/1000*val('sim-cost'))+'</b><span>custo dos insumos</span></div></div><small>'+num(ml/planned,1)+' doses equivalentes de '+num(planned)+' ml. Resultado calculado apenas pelas hipóteses acima.</small>';
  }
  function renderSettings() {
    return heading('AJUSTES','Com a cara da sua adega.','Personalização, operação e cadastros. Você no comando.',button('Ver roteiro','show-tour','secondary small'))+
      '<div class="settings-grid"><section class="panel"><div class="panel-header"><div><span class="eyebrow">IDENTIDADE</span><h3>Deixe a casa com a sua cara.</h3></div></div><form id="brand-form"><div class="form-grid">'+field('Nome da adega','brand-name',brand.name,'text','required maxlength="60"')+field('Cor de destaque','brand-color',brand.color,'color')+'</div><label class="field"><span>Logo da adega</span><input type="file" id="brand-logo" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG ou WebP. Redimensionada para até 256 px.</small></label><div class="form-actions"><button class="button primary" type="submit">Salvar identidade</button>'+button('Remover logo','remove-logo','ghost small')+'</div></form></section>'+
      '<section class="panel"><div class="panel-header"><div><span class="eyebrow">A OPERAÇÃO</span><h3>Cada ajuste na medida.</h3></div></div><form id="operation-form"><div class="form-grid"><label class="field"><span>Medida única da dose</span><select id="setting-dose">'+[30,40,50].map(n=>'<option value="'+n+'" '+(state.settings.dose===n?'selected':'')+'>'+n+' ml</option>').join('')+'</select><small>Use a mesma medida do dosador físico.</small></label><label class="field"><span>Número de balcões</span><select id="setting-counters"><option value="1" '+(state.settings.counters===1?'selected':'')+'>1 balcão</option><option value="2" '+(state.settings.counters===2?'selected':'')+'>2 balcões</option></select></label>'+field('Taxa Pix (%)','fee-pix',state.settings.fees.pix,'number','min="0" max="100" step=".01" required')+field('Taxa dinheiro (%)','fee-dinheiro',state.settings.fees.dinheiro,'number','min="0" max="100" step=".01" required')+field('Taxa cartão (%)','fee-cartao',state.settings.fees.cartao,'number','min="0" max="100" step=".01" required')+field('PIN do modo Dono','setting-pin',state.settings.pin,'password','required pattern="[0-9]{4,8}" inputmode="numeric" minlength="4" maxlength="8"')+'</div><p class="muted small-text">Dia operacional: 6h às 6h. O PIN organiza o acesso na demonstração; não é um login seguro.</p><button class="button primary" type="submit">Salvar operação</button></form></section></div>'+
      '<section class="panel"><div class="panel-header"><div><span class="eyebrow">CATÁLOGO DA ADEGA</span><h3>Tudo começa com um bom cadastro.</h3></div><span class="badge muted">CUSTO DE FORNECEDOR</span></div><div class="catalog-groups">'+Object.entries(kinds).map(([kind,label])=>'<details class="catalog-group" '+(kind==='spirits'?'open':'')+'><summary><span>'+label+'</span><small>'+state[kind].length+' registros</small></summary><div class="catalog-body"><div class="catalog-actions">'+button('+ Cadastrar '+(kind==='spirits'?'destilado':kind==='supplies'?'insumo':kind==='drinks'?'drink':kind==='combos'?'combo':'fornecedor'),'new-item','secondary small','data-kind="'+kind+'"')+'</div>'+
      table(['Nome',kind==='suppliers'?'Contato':'Detalhe','Situação','Ações'],state[kind].map(x=>[esc(x.name),kind==='suppliers'?esc(x.contact||'—'):kind==='spirits'?num(x.volume)+' ml · Dose '+money(x.dosePrice):kind==='supplies'?esc(x.unit)+' · '+(x.price?money(x.price):'Somente insumo'):money(x.price),badge(x.active!==false?'Ativo':'Inativo',x.active!==false?'good':'muted'),'<div class="row-actions">'+button('Editar','edit-item','ghost small','data-kind="'+kind+'" data-id="'+esc(x.id)+'"')+(x.active!==false?button('Inativar','deactivate','ghost small','data-kind="'+kind+'" data-id="'+esc(x.id)+'"'):button('Reativar','activate','ghost small','data-kind="'+kind+'" data-id="'+esc(x.id)+'"'))+'</div>']))+'</div></details>').join('')+'</div></section>'+
      '<div class="grid cols-2"><section class="panel"><div class="panel-header"><div><span class="eyebrow">SEU CENÁRIO DE DEMONSTRAÇÃO</span><h3>Uma adega, duas possibilidades.</h3></div></div><p class="muted">Bairro e Premium têm dados independentes. A identidade da sua adega acompanha você.</p><div class="profile-options">'+button('Adega de Bairro','profile',profile==='bairro'?'primary':'secondary','data-profile="bairro"')+button('Adega Premium','profile',profile==='premium'?'primary':'secondary','data-profile="premium"')+'</div><small>Dados '+(state.origin==='demo'?'demonstrativos gerados em '+date(state.generatedUntil||state.baseDate):'próprios iniciados em '+date(state.baseDate))+'. Novas vendas fictícias nunca são geradas ao reabrir.</small><div class="form-actions">'+button('Restaurar demo','restore','secondary small')+button('Começar do zero','start-empty','ghost small')+'</div></section>'+
      '<section class="panel"><div class="panel-header"><div><span class="eyebrow">LEVE SEUS DADOS COM VOCÊ</span><h3>Exportar, importar e compartilhar.</h3></div></div><p class="muted">Os dados ficam neste navegador. Exporte uma cópia para continuar em outro aparelho.</p><div class="form-actions">'+button(icon('download')+' Exportar JSON','export','secondary')+button(icon('upload')+' Importar JSON','import','secondary')+'</div><hr><p class="muted small-text">O link leva nome, cor e perfil. Logo e movimentos ficam neste aparelho ou no arquivo exportado.</p>'+button(icon('link')+' Gerar link personalizado','share-link','ghost small')+'</section></div>'+
      '<aside class="assisted-card"><span>'+icon('users')+'</span><div><strong>Prefere que a gente cadastre tudo para você?</strong><p>Fale com seu consultor.</p></div><span class="badge muted">CADASTRO ASSISTIDO</span></aside>';
  }
  function purchaseModal(id) {
    owner();const s=find(id);if(!s)return;
    modal('Entrada de compra','<p>Adicione ao estoque de <strong>'+esc(s.name)+'</strong>. O custo médio será recalculado.</p><form id="purchase-form" data-id="'+esc(id)+'"><div class="form-grid">'+field(s.volume?'Quantidade de garrafas':'Quantidade ('+s.unit+')','purchase-qty',1,'number','required min="'+(s.volume?'1':'.001')+'" step="'+(s.volume?'1':'.001')+'"')+field('Valor total pago (R$)','purchase-total','','number','required min="0" step=".01"')+'</div><label class="field"><span>Fornecedor</span><select id="purchase-supplier" required>'+active(state.suppliers).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===s.supplierId?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label><p class="muted small-text">O valor pago ao fornecedor é a base do custo. Vendas anteriores permanecem com seus custos originais.</p><div class="form-actions"><button class="button primary">Registrar compra</button>'+button('Voltar','close-modal','ghost')+'</div></form>');
  }
  function historyModal() {
    owner();const sales=state.movements.filter(m=>m.type==='sale').slice().reverse(), cancellations=state.movements.filter(m=>m.type==='cancel'||m.type==='cancellation');
    modal('Histórico de vendas','<p class="muted">Horário real do registro. Cancelamentos permanecem vinculados à venda original.</p><label class="search-field">'+icon('search')+'<input id="history-search" type="search" placeholder="Buscar item, data ou pagamento" aria-label="Buscar no histórico"></label><div id="history-rows">'+historyTable(sales.slice(0,70),cancellations)+'</div><small>Exibindo as 70 vendas mais recentes. Use a busca para consultar todo o histórico.</small>');
  }
  function historyTable(sales,cancellations) {
    return table(['Venda','Itens','Total','Situação',''],sales.map(s=>{
      const c=cancellations.find(x=>x.saleId===s.id||x.vendaId===s.id), undone=state.movements.some(x=>x.type==='undo'&&x.saleId===s.id);
      return [stamp(s.at)+'<small class="cell-note">'+paymentNames[s.payment]+' · Balcão '+s.counter+'</small>',s.lines.map(x=>num(x.qty,2)+' × '+esc(x.name)).join('<br>'),money(s.revenue),undone?badge('Desfeita','muted'):c?badge('Cancelada','muted')+'<small class="cell-note">'+esc(c.reason||c.motivo||'')+'</small>':badge('Registrada','good'),undone?'—':c?button('Detalhes','sale-detail','ghost small','data-id="'+esc(s.id)+'"'):button('Cancelar','cancel-sale','ghost small','data-id="'+esc(s.id)+'"')];
    }));
  }
  function saleComponents(sale) {
    const map=new Map();
    for(const line of sale.lines)for(const c of line.components||[]){
      if(!map.has(c.id))map.set(c.id,{id:c.id,name:c.name||find(c.id)?.name,qty:0,cost:0,closed:0});
      const x=map.get(c.id);x.qty+=c.qty;x.cost+=c.cost||0;x.closed+=c.closedQty||0;
    }
    return [...map.values()];
  }
  function cancelModal(id) {
    owner();const sale=state.movements.find(x=>x.id===id&&x.type==='sale');if(!sale)return;
    const comps=saleComponents(sale);
    modal('Cancelar venda','<div class="notice warn">Venda de '+money(sale.revenue)+' em '+stamp(sale.at)+'. A receita será estornada no dia operacional de hoje.</div><form id="cancel-form" data-id="'+esc(id)+'"><label class="field"><span>Motivo do cancelamento</span><textarea id="cancel-reason" required maxlength="300" placeholder="Descreva o que aconteceu"></textarea></label><h3>O que continua disponível?</h3><p class="muted small-text">Informe somente ingredientes ou produtos que continuam disponíveis e utilizáveis. O que já foi servido não volta ao estoque. Um drink preparado não volta a ser ingredientes.</p><div class="cancel-components">'+comps.map(c=>{
      const s=find(c.id),countAfter=state.movements.some(m=>m.type==='count'&&new Date(m.at)>new Date(sale.at)&&(m.entries||[]).some(x=>x.id===c.id&&!x.skip));
      return '<div class="cancel-component" data-component="'+esc(c.id)+'" data-after-count="'+countAfter+'"><strong>'+esc(c.name)+'</strong><small>Baixa original: '+num(c.qty,3)+' '+(s?.volume?'ml':s?.unit||'un')+'</small><div class="form-grid">'+field('Quantidade recuperável','return-'+c.id,0,'number','min="0" max="'+c.qty+'" step=".001"')+(s?.volume?field('Destas, garrafas ainda lacradas','return-closed-'+c.id,0,'number','min="0" max="'+c.closed+'" step="1"'):'')+'</div>'+
      (countAfter||s?.volume?'<div class="notice subtle">Se houver recuperação, conte o saldo físico atual já incluindo os itens disponíveis. Informe as garrafas que realmente continuam lacradas e o líquido aberto.</div><div class="form-grid">'+(s?.volume?field('Fechadas contadas agora','counted-closed-'+c.id,'','number','min="0" step="1"')+field('Ml na aberta agora','counted-open-'+c.id,'','number','min="0" max="'+s.volume+'" step=".001"'):field('Quantidade contada agora','counted-qty-'+c.id,'','number','min="0" step=".001"'))+'</div>':'')+'</div>';
    }).join('')+'</div>'+
    (sale.fee>0?'<label class="check-field"><input type="checkbox" id="cancel-fee"> A taxa de '+money(sale.fee)+' foi devolvida</label><p class="muted small-text">Sem confirmação, permanece apenas a taxa original; não é criada outra cobrança.</p>':'')+
    '<div class="form-actions"><button class="button danger" type="submit">Confirmar cancelamento</button>'+button('Voltar','close-modal','secondary')+'</div></form>');
  }
  function startCount() {
    owner();countDraft={items:[...active(state.spirits),...active(state.supplies)],entries:[],step:0};
    if(!countDraft.items.length){modal('Contagem de estoque',empty('Nada para contar ainda.','Cadastre seus produtos antes da primeira contagem.',button('Abrir cadastros','go-catalog','primary')));return;}
    countStep();
  }
  function countStep() {
    const {items,step,entries}=countDraft;
    if(step>=items.length){countReview();return;}
    const s=items[step],entry=entries[step]||{},isSpirit=Boolean(s.volume);
    modal('Contagem de estoque','<div class="count-progress"><span>Item '+(step+1)+' de '+items.length+'</span><progress value="'+(step+1)+'" max="'+items.length+'"></progress></div><div class="count-product">'+(isSpirit?V.bottle(s,{level:true}):icon('box'))+'<div><span class="eyebrow">'+(isSpirit?'DESTILADO':esc(s.unit))+'</span><h3>'+esc(s.name)+'</h3><p>Conte o que está na adega agora.</p></div></div><form id="count-form">'+
      (isSpirit?'<div class="form-grid">'+field('Garrafas fechadas','count-closed',entry.closed??s.closed,'number','min="0" step="1" required')+field('Ml na garrafa aberta','count-open',entry.open??s.open,'number','min="0" max="'+s.volume+'" step=".001" required')+'</div><label class="field"><span>Nível na garrafa aberta</span><input type="range" id="count-slider" min="0" max="'+s.volume+'" step="10" value="'+(entry.open??s.open)+'"></label>':field('Quantidade física ('+s.unit+')','count-qty',entry.qty??s.stock,'number','min="0" step=".001" required'))+
      '<label class="field"><span>Motivo da diferença (opcional)</span><select id="count-reason"><option value="">Sem motivo informado</option><option>Quebra</option><option>Cortesia</option><option>Erro de registro</option><option>Não identificado</option></select></label><div class="form-actions"><button class="button primary" type="submit">'+(step===items.length-1?'Revisar contagem':'Próximo item')+'</button>'+button('Pular item','count-skip','secondary')+(step?button('Anterior','count-back','ghost'):'')+'</div><p class="muted small-text">Itens pulados mantêm seu saldo e não geram ajuste. Nada muda antes da confirmação final.</p></form>');
    if(entry.reason)$('#count-reason').value=entry.reason;
  }
  function countReview() {
    const entries=countDraft.entries,items=countDraft.items;
    const rows=entries.map((entry,i)=>{
      const s=items[i],expected=E.stock(s),counted=s.volume?(entry.closed*s.volume+entry.open):entry.qty,diff=expected-counted;
      return [esc(s.name),num(expected,3)+' '+(s.volume?'ml':s.unit),entry.skip?'Sem contagem':num(counted,3)+' '+(s.volume?'ml':s.unit),entry.skip?'—':badge((diff>0?'Falta ':diff<0?'Sobra ':'Conferido ')+num(Math.abs(diff),3),diff>0?'warn':diff<0?'good':'muted')];
    });
    modal('Confira antes de confirmar','<p>Os itens contados serão a nova referência do estoque. Faltas e sobras ficam registradas nesta data.</p>'+table(['Item','Teórico','Contado','Diferença'],rows)+'<div class="form-actions">'+button('Confirmar contagem','count-confirm','primary')+button('Voltar aos itens','count-review-back','secondary')+button('Descartar','close-modal','ghost')+'</div>');
  }
  function shoppingModal() {
    owner();const raw=inventory(),list=(Array.isArray(raw)?raw:(raw.items||[])).filter(x=>x.reorder||x.suggested>0);
    const groups=new Map();
    for(const x of list){const s=find(x.id);if(!s)continue;const supplier=supplierName(s.supplierId);if(!groups.has(supplier))groups.set(supplier,[]);groups.get(supplier).push({s,x});}
    const text='LISTA DE COMPRAS · '+brand.name+'\n'+date(new Date())+'\n\n'+[...groups].map(([supplier,rows])=>supplier+'\n'+rows.map(({s,x})=>'• '+s.name+': '+(x.suggested>0?num(x.suggested,3)+' '+(s.volume?'garrafas':s.unit):'abaixo do mínimo; sem compra sugerida pelo consumo recente')).join('\n')).join('\n\n')+'\n\nBase: consumo médio de 30 dias × 14 dias − estoque atual.';
    modal('Lista de compras','<p class="muted">Agrupada por fornecedor. O consumo considera toda a adega.</p><textarea class="copy-area" id="copy-shopping" readonly rows="14">'+esc(text)+'</textarea><div class="form-actions">'+button(icon('copy')+' Copiar lista','copy-shopping','primary')+'</div>');
  }
  function readEditorFields() {
    const form=$('#editor-form');if(!form)return;
    $$('[data-edit-key]',form).forEach(el=>{const key=el.dataset.editKey;editorDraft[key]=el.type==='number'?(el.value===''?null:Number(el.value)):el.value;});
    if(['drinks','combos'].includes(editorDraft.kind)){
      const rows=$$('.recipe-row',form);
      const data=rows.map(row=>({value:$('select',row).value,qty:Number($('input',row).value)})).filter(x=>x.value);
      editorDraft.rows=data;
    }
  }
  function recipeRows() {
    const combo=editorDraft.kind==='combos',list=combo?products().filter(x=>x.type!=='combo').map(x=>({value:x.type+'|'+x.id,label:typeNames[x.type]+' · '+x.name})):
      [...active(state.spirits).map(x=>({value:x.id,label:x.name+' · ml'})),...active(state.supplies).map(x=>({value:x.id,label:x.name+' · '+x.unit}))];
    return editorDraft.rows.map((r,i)=>'<div class="recipe-row"><label><span class="sr-only">Componente '+(i+1)+'</span><select class="recipe-select"><option value="">Escolha um componente</option>'+list.map(x=>'<option value="'+esc(x.value)+'" '+(r.value===x.value?'selected':'')+'>'+esc(x.label)+'</option>').join('')+'</select></label><label><span class="sr-only">Quantidade do componente '+(i+1)+'</span><input type="number" class="recipe-qty" min=".001" step=".001" value="'+(r.qty||1)+'" aria-label="Quantidade"></label><button type="button" class="button ghost icon-button" data-action="recipe-remove" data-index="'+i+'" aria-label="Remover componente '+(i+1)+'">'+icon('close')+'</button></div>').join('');
  }
  function editField(label,key,value,type='text',attrs='') { return '<label class="field"><span>'+label+'</span><input data-edit-key="'+key+'" type="'+type+'" value="'+esc(value??'')+'" '+attrs+'></label>'; }
  function editor(kind,id) {
    owner();const original=id?state[kind].find(x=>x.id===id):null;
    editorDraft={kind,original,id:original?.id||'',name:original?.name||'',type:original?.type||'Whisky',volume:original?.volume||1000,dosePrice:original?.dosePrice??10,bottlePrice:original?.bottlePrice??'',price:original?.price??'',costInput:original?.cost==null?'':original.cost*(original.volume||1),min:original?.min??(kind==='spirits'?2:5),supplierId:original?.supplierId||active(state.suppliers)[0]?.id||'',color:original?.color||'#d4b575',unit:original?.unit||'un',closed:0,open:0,stock:0,contact:original?.contact||'',rows:kind==='drinks'?(original?.components||[]).map(c=>({value:c.id,qty:c.qty})):kind==='combos'?(original?.items||[]).map(c=>({value:c.type+'|'+c.id,qty:c.qty})):[]};
    const d=editorDraft,locked=Boolean(original&&(E.stock(original)>0||state.movements.some(m=>JSON.stringify(m).includes('"'+id+'"'))));
    let body=editField('Nome','name',d.name,'text','required maxlength="70"');
    if(kind==='suppliers')body+=editField('Contato (opcional)','contact',d.contact,'text','maxlength="100"');
    if(kind==='spirits')body+='<div class="form-grid"><label class="field"><span>Tipo de bebida</span><select data-edit-key="type">'+['Whisky','Vodka','Gin','Rum','Cachaça','Licor','Licor de whisky','Conhaque','Tequila'].map(n=>'<option '+(d.type.toLowerCase()===n.toLowerCase()?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+editField('Volume da garrafa (ml)','volume',d.volume,'number','required min="1" max="10000" step="1" '+(locked?'disabled':''))+editField('Preço da dose (R$)','dosePrice',d.dosePrice,'number','required min=".01" step=".01"')+editField('Preço da garrafa (R$), opcional','bottlePrice',d.bottlePrice,'number','min=".01" step=".01"')+editField('Mínimo de garrafas fechadas','min',d.min,'number','required min="0" step="1"')+editField('Cor do rótulo','color',d.color,'color')+'</div>';
    if(kind==='supplies')body+='<div class="form-grid"><label class="field"><span>Unidade</span><select data-edit-key="unit" '+(locked?'disabled':'')+'><option value="un" '+(d.unit==='un'?'selected':'')+'>Unidade (un)</option><option value="kg" '+(d.unit==='kg'?'selected':'')+'>Quilograma (kg)</option></select></label>'+editField('Preço avulso (R$), opcional','price',d.price,'number','min=".01" step=".01"')+editField('Estoque mínimo','min',d.min,'number','required min="0" step=".001"')+'</div>';
    if(['spirits','supplies'].includes(kind)){
      body+='<label class="field"><span>Fornecedor padrão</span><select data-edit-key="supplierId"><option value="">Sem fornecedor padrão</option>'+active(state.suppliers).map(x=>'<option value="'+esc(x.id)+'" '+(x.id===d.supplierId?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label>';
      if(!original)body+='<div class="initial-stock"><h3>Estoque que você já tem</h3><p class="muted small-text">Será registrado como saldo inicial, não como compra.</p><div class="form-grid">'+editField(kind==='spirits'?'Custo pago por garrafa (R$)':'Custo por unidade / kg (R$)','costInput',d.costInput,'number','min="0" step=".0001"')+(kind==='spirits'?editField('Garrafas fechadas','closed',0,'number','min="0" step="1"')+editField('Ml na garrafa aberta','open',0,'number','min="0" step=".001"'):editField('Quantidade existente','stock',0,'number','min="0" step=".001"'))+'</div></div>';
      else body+='<div class="notice subtle">Custo médio atual: '+(original.cost==null?'não informado':money(original.cost*(original.volume||1)))+' por '+(original.volume?'garrafa':original.unit)+'. Use compras para atualizar o custo e contagens para corrigir o saldo. Embalagens com histórico são preservadas.</div>';
    }
    if(['drinks','combos'].includes(kind))body+=editField('Preço de venda (R$)','price',d.price,'number','required min=".01" step=".01"')+'<h3>'+(kind==='drinks'?'Ficha técnica':'Itens do combo')+'</h3><p class="muted small-text">'+(kind==='drinks'?'Destilados em ml; insumos em sua unidade cadastrada.':'Apenas itens vendáveis avulsos. O combo tem um preço fechado.')+'</p><div class="recipe-lines">'+recipeRows()+'</div>'+button('+ Adicionar componente','recipe-add','secondary small','type="button"')+'<div id="recipe-preview" class="recipe-preview"></div>';
    modal((original?'Editar ':'Cadastrar ')+(kind==='spirits'?'destilado':kind==='supplies'?'insumo':kind==='drinks'?'drink':kind==='combos'?'combo':'fornecedor'),'<form id="editor-form">'+body+'<div id="form-error" class="notice warn" role="alert" hidden></div><div class="form-actions"><button type="submit" class="button primary">Salvar cadastro</button>'+button('Voltar','close-modal','ghost','type="button"')+'</div></form>');
    recipePreview();
  }
  function recipePreview() {
    if(!$('#recipe-preview'))return;readEditorFields();const d=editorDraft;let cost=0,separate=0,known=true;
    for(const r of d.rows){
      if(d.kind==='drinks'){const x=find(r.value);if(!x||x.cost==null)known=false;else cost+=x.cost*r.qty;}
      else {const [type,id]=r.value.split('|'),p=product(type,id);if(!p){known=false;continue;}separate+=p.price*r.qty;const parts=type==='drink'?state.drinks.find(x=>x.id===id).components:[{id,qty:type==='garrafa'?find(id).volume:type==='dose'?state.settings.dose:1}];for(const c of parts){const x=find(c.id);if(!x||x.cost==null)known=false;else cost+=x.cost*c.qty*r.qty;}}
    }
    const price=Number(d.price)||0;
    $('#recipe-preview').innerHTML=known?'<span>Custo <strong>'+money(cost)+'</strong></span><span>Margem <strong>'+money(price-cost)+'</strong></span><span>Margem % <strong>'+pct(price>0?(price-cost)/price*100:null)+'</strong></span>'+(d.kind==='combos'?'<span>Preço separado <strong>'+money(separate)+'</strong></span><span>'+(separate-price>=0?'Desconto':'Acréscimo')+' <strong>'+money(Math.abs(separate-price))+'</strong></span>':''):'<span>Informe o custo de todos os componentes para calcular a margem.</span>';
  }
  function saveEditor() {
    owner();readEditorFields();const d=editorDraft,kind=d.kind;
    let item=d.original?{...d.original}:{id:(kind.slice(0,2)+'-'+Date.now().toString(36)),active:true};
    item.name=d.name.trim();if(!item.name)throw new Error('Informe o nome.');
    if(kind==='suppliers')item.contact=d.contact;
    if(kind==='spirits')Object.assign(item,{type:d.type,volume:Number(d.volume),dosePrice:Number(d.dosePrice),bottlePrice:d.bottlePrice===''||d.bottlePrice==null?null:Number(d.bottlePrice),min:Number(d.min),supplierId:d.supplierId,color:d.color});
    if(kind==='supplies')Object.assign(item,{unit:d.unit,price:d.price===''||d.price==null?null:Number(d.price),min:Number(d.min),supplierId:d.supplierId});
    if(['spirits','supplies'].includes(kind)&&!d.original){
      item.cost=d.costInput===''||d.costInput==null?null:Number(d.costInput)/(kind==='spirits'?Number(d.volume):1);
      if(kind==='spirits'){item.closed=Number(d.closed)||0;item.open=Number(d.open)||0;}else item.stock=Number(d.stock)||0;
    }
    if(kind==='drinks')Object.assign(item,{price:Number(d.price),components:d.rows.map(x=>({id:x.value,qty:x.qty}))});
    if(kind==='combos')Object.assign(item,{price:Number(d.price),items:d.rows.map(x=>{const [type,id]=x.value.split('|');return {type,id,qty:x.qty};})});
    E.upsert(state,kind,item,new Date());closeModal();touch();toast('Cadastro salvo.');
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Texto copiado. Pronto para compartilhar.'); }
    catch (_) { modal('Copie o texto','<textarea class="copy-area" id="manual-copy" rows="15" readonly>'+esc(text)+'</textarea><p class="muted small-text">Selecione e copie o texto para compartilhar.</p>');$('#manual-copy').select(); }
  }
  function summary(day=false) {
    const r=day?E.report(state,{period:'day',counter:null,now:new Date()}):getReport(),t=r.totals,rows=r.rankings.volume;
    const inv=inventory(),low=(Array.isArray(inv)?inv:inv.items||[]).filter(x=>x.reorder);
    const pays=Array.isArray(r.payments)?r.payments:Object.entries(r.payments||{}).map(([id,p])=>({id,...p}));
    return brand.name+' · '+APP_NAME+'\n'+(day?'Dia operacional '+E.opDate(new Date()):periods.find(x=>x[0]===period)[1])+' · 6h às 6h\n\n'+
      'Faturamento: '+money(t.revenue)+'\nMargem bruta: '+money(t.grossMargin)+'\nMargem após taxas: '+money(t.marginAfterFees)+'\nTaxas líquidas: '+money(t.fee)+'\nCancelamentos: '+num(t.cancellations)+'\nCusto consumido em cancelamentos: '+money(t.cancelledConsumedCost)+'\n\n'+
      'Pagamento (antes dos cancelamentos):\n'+pays.map(p=>(paymentNames[p.id||p.payment]||p.name)+': '+money(p.salesRevenue||0)+' · '+pct(p.pct??p.share??null)+' · estornos: '+money(p.cancelledRevenue||0)+' · líquido: '+money(p.revenue||0)).join('\n')+
      '\n\nTop 3 bebidas em volume:\n'+rows.slice(0,3).map((x,i)=>(i+1)+'. '+x.name+' · '+num((x.ml??x.qty)/state.settings.dose,1)+' doses equivalentes').join('\n')+
      '\nMaior margem em R$: '+(r.rankings.bestMargin?r.rankings.bestMargin.name+' · '+money(r.rankings.bestMargin.grossMargin):'Sem movimento')+'\nMenor volume: '+(r.rankings.least?.name||'Sem movimento')+'\n\nReposição: '+(low.map(x=>find(x.id)?.name||x.name).join(', ')||'Nenhum alerta')+
      '\nDiferença de estoque no período (adega inteira): '+money(r.losses?.potential||0)+' em receita potencial; '+money(r.losses?.cost||0)+' de custo faltante.'+
      '\nÚltima contagem: '+(r.losses?.latestAt?stamp(r.losses.latestAt)+' · '+money((r.losses.latestEntries||[]).reduce((a,x)=>a+(x.potential||0),0))+' em receita potencial; '+money((r.losses.latestEntries||[]).reduce((a,x)=>a+(x.cost||0),0))+' de custo faltante':'Sem contagem no período')+'\n\nMargens não incluem aluguel, salários e outras despesas. Valores de doses faltantes são estimativas.';
  }
  const helpTexts={
    faturamento:['Faturamento','Soma das vendas registradas no período, menos os estornos datados no mesmo período. Um cancelamento de venda antiga aparece na data do cancelamento, sem reescrever o passado.'],
    margem:['Margem bruta','Receita de venda menos o custo pago ao fornecedor pelos componentes, preservado no momento da venda. Não inclui aluguel, salários e outras despesas. A porcentagem é a margem dividida pela receita positiva.'],
    taxas:['Margem após taxas','Margem bruta menos as taxas de pagamento, descontando apenas devoluções informadas pelo Dono. A taxa original permanece no período da venda; o crédito é datado no cancelamento.'],
    rateio:['Participação em drinks e combos','Receita, margem e taxa são distribuídas proporcionalmente ao custo de cada componente naquela venda. Doses e garrafas pertencem 100% à bebida. Bebidas + insumos somam o total. Custos explicitamente zero usam divisão igual entre componentes distintos.'],
    vazamento:['Como calculamos as diferenças','O estoque teórico vem do saldo inicial, compras, saídas e ajustes. A contagem física gera falta ou sobra e vira a próxima referência. Receita potencial = ml faltantes ÷ medida da dose × preço da dose. Custo faltante = quantidade faltante × custo histórico. Insumos entram só pelo custo. Itens pulados não significam perda zero.'],
    volume:['Volumes e garrafas','Doses equivalentes dividem o volume por sua medida padrão. O consumo de garrafas abertas é calculado pelo volume efetivamente consumido. Garrafas fechadas vendidas são mostradas separadamente para evitar dupla contagem.'],
    cancelamento:['Cancelamentos preservam o histórico','O estorno é registrado no dia operacional do cancelamento. Somente itens disponíveis voltam ao estoque. Componentes consumidos permanecem baixados, com custo apresentado separadamente do vazamento. Contagem posterior exige conferência para não repor duas vezes.']
  };
  function exportFile() {
    owner();const payload={app:APP_NAME,version:1,exportedAt:new Date().toISOString(),profile,state,brand};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='adegacontrol-'+profile+'-'+E.opDate(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
    toast('Arquivo de dados exportado.');
  }
  function restoreModal(emptyProfile=false) {
    owner();
    modal(emptyProfile?'Começar com os seus dados':'Restaurar demonstração',
      '<div class="notice warn">'+(emptyProfile?'O perfil '+(profile==='bairro'?'Bairro':'Premium')+' ficará vazio para você cadastrar a própria adega.':'Será criado um novo histórico demonstrativo até hoje, com catálogo, fornecedores e saldos coerentes.')+'</div><p>Os movimentos e cadastros personalizados deste perfil serão substituídos. O outro perfil permanece intacto.</p><p>'+button(icon('download')+' Exportar antes de continuar','export','secondary small')+'</p><label class="check-field"><input type="checkbox" id="reset-brand"> Também apagar personalização (nome, logo e cor)</label><p class="muted small-text">A personalização e o PIN são preservados por padrão. Fechar esta janela não altera nada.</p>',
      button('Voltar','close-modal','secondary')+button(emptyProfile?'Começar do zero':'Restaurar demo','confirm-reset','danger','data-empty="'+emptyProfile+'"'));
  }
  async function resetProfile(emptyProfile) {
    owner();const clearBrand=$('#reset-brand').checked,oldPin=state.settings.pin;
    state=emptyProfile?E.createEmpty(profile,new Date()):D.generate(profile,new Date());
    if(!clearBrand)state.settings.pin=oldPin;else brand=defaultBrand(profile);
    cart=[];selected=null;counterFilter='all';sellingCounter=1;invalidate();closeModal();applyBrand();await persist();tab=emptyProfile?'settings':'panel';render();toast(emptyProfile?'Pronto para cadastrar a sua adega.':'Demonstração atualizada. Sua adega está pronta.');
  }
  function quickSell(type,id) {
    const p=product(type,id);if(!p)return;let error='';
    try{E.quote(state,[{type,id,qty:1}]);}catch(e){error=e.message;}
    modal('Vender já','<div class="quick-product"><span class="eyebrow">'+typeNames[type]+'</span><h3>'+esc(p.name)+'</h3><strong>'+money(p.price)+'</strong><p>Balcão '+sellingCounter+' · 1 item</p></div>'+(error?'<div class="notice warn">'+esc(error)+'</div>':'<p>Escolha a forma de pagamento para registrar a venda.</p><div class="payments">'+Object.entries(paymentNames).map(([pid,label])=>'<button data-action="quick-pay" data-payment="'+pid+'" data-type="'+type+'" data-id="'+esc(id)+'">'+icon(pid==='cartao'?'card':pid==='dinheiro'?'cash':'pix')+'<span>'+label+'</span></button>').join('')+'</div>')+'<p class="muted small-text">Registro manual da demonstração, sem cobrança.</p>');
  }
  function recordSale(lines,payment,isQuick=false) {
    const sale=E.sell(state,lines,payment,sellingCounter,new Date());if(!isQuick)cart=[];
    if($('#modal').open)closeModal();undoId=sale.id;clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoId=null;},5000);
    touch();toast('Venda registrada · '+money(sale.revenue),'<button class="button ghost small" data-action="undo" data-id="'+esc(sale.id)+'">Desfazer</button>');
  }
  async function handleAction(action,el) {
    const id=el.dataset.id;
    switch(action){
      case 'nav': navigate(el.dataset.tab);break;
      case 'show-cart':$('#cart-panel').scrollIntoView({behavior:'smooth',block:'start'});$('#cart-panel').focus({preventScroll:true});break;
      case 'period':period=el.dataset.period;invalidate();render();break;
      case 'select':owner();selectBeverage(id);break;
      case 'rank':rank=el.dataset.rank;render();break;
      case 'carousel':$('.bottle-carousel').scrollBy({left:Number(el.dataset.direction)*320,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});break;
      case 'close-modal':closeModal();break;
      case 'help':{const h=helpTexts[el.dataset.help]||helpTexts.margem;modal(h[0],'<p class="help-copy">'+h[1]+'</p>');break;}
      case 'dismiss-tour':state.tourDismissed=true;touch();break;
      case 'show-tour':owner();state.tourDismissed=false;tab='panel';touch();break;
      case 'category':category=el.dataset.category;render();break;
      case 'add':{const type=el.dataset.type,line=cart.find(x=>x.id===id&&x.type===type);if(line)line.qty++;else cart.push({type,id,qty:1});render();break;}
      case 'cart-minus':{const i=+el.dataset.index;cart[i].qty--;if(cart[i].qty<=0)cart.splice(i,1);render();break;}
      case 'cart-plus':cart[+el.dataset.index].qty++;render();break;
      case 'clear-cart':cart=[];render();break;
      case 'pay':recordSale(cart,el.dataset.payment);break;
      case 'quick':quickSell(el.dataset.type,id);break;
      case 'quick-pay':recordSale([{type:el.dataset.type,id,qty:1}],el.dataset.payment,true);break;
      case 'undo':if(id!==undoId)throw new Error('O prazo de desfazer terminou. O Dono pode cancelar pelo histórico.');E.undo(state,id,new Date());undoId=null;touch();toast('Venda desfeita. Estoque restaurado.');break;
      case 'purchase':purchaseModal(id);break;
      case 'open-bottle':owner();E.openBottle(state,id,new Date());touch();toast('Garrafa aberta para a próxima dose.');break;
      case 'copy-summary':owner();await copyText(summary(false));break;
      case 'copy-day':owner();await copyText(summary(true));break;
      case 'shopping':shoppingModal();break;
      case 'copy-shopping':await copyText($('#copy-shopping').value);break;
      case 'history':historyModal();break;
      case 'cancel-sale':cancelModal(id);break;
      case 'sale-detail':{owner();const s=state.movements.find(x=>x.id===id),c=state.movements.find(x=>x.type==='cancel'&&x.saleId===id);modal('Detalhes da venda',table(['Informação','Registro'],[['Venda',stamp(s.at)],['Valor',money(s.revenue)],['Cancelamento',c?stamp(c.at):'—'],['Motivo',esc(c?.reason||'—')],['Taxa devolvida',c?.feeReturned?'Sim':'Não'],['Reposição',c?(c.entries||[]).map(e=>esc(find(e.id)?.name)+': '+num(e.recoveredQty,3)).join('<br>'):'—']]));break;}
      case 'count-start':startCount();break;
      case 'count-skip':countDraft.entries[countDraft.step]={id:countDraft.items[countDraft.step].id,skip:true};countDraft.step++;countStep();break;
      case 'count-back':countDraft.step--;countStep();break;
      case 'count-review-back':countDraft.step=countDraft.items.length-1;countStep();break;
      case 'count-confirm':owner();E.count(state,countDraft.entries,new Date());countDraft=null;closeModal();touch();toast('Contagem registrada. A nova referência está salva.');break;
      case 'go-catalog':closeModal();navigate('settings');break;
      case 'new-item':editor(el.dataset.kind);break;
      case 'edit-item':editor(el.dataset.kind,id);break;
      case 'recipe-add':readEditorFields();editorDraft.rows.push({value:'',qty:1});$('.recipe-lines').innerHTML=recipeRows();recipePreview();break;
      case 'recipe-remove':readEditorFields();editorDraft.rows.splice(+el.dataset.index,1);$('.recipe-lines').innerHTML=recipeRows();recipePreview();break;
      case 'deactivate':owner();modal('Inativar cadastro','<p>O item não ficará disponível para novas vendas. Seu histórico permanece nos relatórios. Receitas que dependem dele precisarão ser atualizadas.</p>',button('Voltar','close-modal','secondary')+button('Inativar','confirm-deactivate','danger','data-id="'+esc(id)+'" data-kind="'+el.dataset.kind+'"'));break;
      case 'confirm-deactivate':owner();E.deactivate(state,el.dataset.kind,id);closeModal();touch();toast('Cadastro inativado. Histórico preservado.');break;
      case 'activate':owner();E.upsert(state,el.dataset.kind,{...state[el.dataset.kind].find(x=>x.id===id),active:true},new Date());touch();toast('Cadastro reativado.');break;
      case 'profile':owner();await loadProfile(el.dataset.profile);render();toast('Perfil carregado. Identidade preservada.');break;
      case 'restore':restoreModal();break;
      case 'start-empty':restoreModal(true);break;
      case 'confirm-reset':await resetProfile(el.dataset.empty==='true');break;
      case 'export':exportFile();break;
      case 'import':owner();$('#import-file').click();break;
      case 'confirm-import':{
        owner();state=window.__pendingImport.state;brand=window.__pendingImport.brand;profile=window.__pendingImport.profile;window.__pendingImport=null;cart=[];counterFilter='all';sellingCounter=1;selected=null;invalidate();closeModal();applyBrand();await persist();tab='settings';render();toast('Dados importados com as datas originais.');break;
      }
      case 'share-link':{
        owner();const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('adega',brand.name);url.searchParams.set('cor',brand.color);url.searchParams.set('perfil',profile);
        modal('Link com a identidade da sua adega','<p>Inclui nome, cor e perfil. Logo e movimentos são transferidos pelo arquivo exportado.</p>'+field('Link personalizado','share-url',url.href,'text','readonly')+(location.protocol==='file:'?'<p class="notice">Para compartilhar com outra pessoa, publique o HTML e gere o link usando o endereço do site. Este endereço local funciona só neste computador.</p>':'')+'<div class="form-actions">'+button('Copiar link','copy-link','primary')+'</div>');break;
      }
      case 'copy-link':await copyText($('#share-url').value);break;
      case 'remove-logo':owner();brand.logo='';brand.custom=true;applyBrand();persist();toast('Logo removida.');break;
      case 'mode':if(mode==='owner'){mode='counter';localStorage.setItem('adegacontrol.mode',mode);tab='counter';render();toast('Modo Balcão ativado.');}else modal('Entrar no modo Dono','<form id="pin-form">'+field('PIN do Dono','owner-pin','','password','inputmode="numeric" required pattern="[0-9]{4,8}" autofocus')+'<p class="muted small-text">O PIN inicial da demonstração é 1234.</p><div class="form-actions"><button class="button primary" type="submit">Entrar</button></div></form>');break;
    }
    if(tab==='loss')simulate();
  }
  document.addEventListener('click',async event=>{
    const el=event.target.closest('[data-action]');if(!el)return;
    event.preventDefault();
    if(el.disabled)return;
    try{await handleAction(el.dataset.action,el);}catch(error){toast(error.message||'Não foi possível concluir a ação.');}
  });
  document.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.target;
    try{
      if(form.id==='pin-form'){if($('#owner-pin').value!==state.settings.pin)throw new Error('PIN incorreto.');mode='owner';localStorage.setItem('adegacontrol.mode',mode);closeModal();render();return;}
      owner();
      if(form.id==='brand-form'){brand.name=$('#brand-name').value.trim();brand.color=$('#brand-color').value;brand.custom=true;if(!brand.name)throw new Error('Informe o nome da adega.');applyBrand();await persist();toast('Identidade atualizada.');}
      if(form.id==='operation-form'){
        const settings={...state.settings,dose:+$('#setting-dose').value,counters:+$('#setting-counters').value,fees:{pix:+$('#fee-pix').value,dinheiro:+$('#fee-dinheiro').value,cartao:+$('#fee-cartao').value},pin:$('#setting-pin').value};
        state.settings=settings;if(sellingCounter>settings.counters)sellingCounter=1;if(settings.counters<2)counterFilter='all';touch();toast('Operação atualizada. O histórico foi preservado.');
      }
      if(form.id==='purchase-form'){E.purchase(state,{id:form.dataset.id,qty:+$('#purchase-qty').value,total:+$('#purchase-total').value,supplierId:$('#purchase-supplier').value},new Date());closeModal();touch();toast('Compra registrada. Custo médio atualizado.');}
      if(form.id==='editor-form')saveEditor();
      if(form.id==='count-form'){
        const s=countDraft.items[countDraft.step],entry={id:s.id,reason:$('#count-reason').value};
        if(s.volume){entry.closed=+$('#count-closed').value;entry.open=+$('#count-open').value;}else entry.qty=+$('#count-qty').value;
        countDraft.entries[countDraft.step]=entry;countDraft.step++;countStep();
      }
      if(form.id==='cancel-form'){
        const returns=$$('.cancel-component',form).map(row=>{
          const id=row.dataset.component,r={id,qty:Number($('#return-'+id).value)};
          if($('#return-closed-'+id))r.closed=+$('#return-closed-'+id).value;
          if(r.qty>0&&(row.dataset.afterCount==='true'||find(id)?.volume)){
            const keys=find(id)?.volume?['counted-closed-'+id,'counted-open-'+id]:['counted-qty-'+id];
            if(keys.some(k=>$('#'+k).value===''))throw new Error('Informe o saldo físico atual de '+find(id).name+' antes de confirmar a recuperação.');
            if(find(id)?.volume){r.countedClosed=+$('#counted-closed-'+id).value;r.countedOpen=+$('#counted-open-'+id).value;}else r.countedQty=+$('#counted-qty-'+id).value;
          }
          return r;
        });
        E.cancel(state,form.dataset.id,{reason:$('#cancel-reason').value,feeReturned:Boolean($('#cancel-fee')?.checked),returns},new Date());closeModal();touch();toast('Cancelamento registrado com histórico preservado.');
      }
    }catch(error){const target=$('#form-error');if(target){target.hidden=false;target.textContent=error.message;}else toast(error.message||'Confira os dados informados.');}
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='product-search'){search=el.value;$('#product-grid').innerHTML=productGrid();}
    if(el.id==='history-search'){
      const q=el.value.toLocaleLowerCase('pt-BR'),sales=state.movements.filter(m=>m.type==='sale'&&(stamp(m.at)+' '+paymentNames[m.payment]+' '+m.lines.map(l=>l.name).join(' ')).toLocaleLowerCase('pt-BR').includes(q)).reverse().slice(0,70);
      $('#history-rows').innerHTML=historyTable(sales,state.movements.filter(m=>m.type==='cancel'));
    }
    if(el.id==='count-slider')$('#count-open').value=el.value;
    if(el.id==='count-open')$('#count-slider').value=el.value;
    if(el.id.startsWith('sim-'))simulate();
    if(el.closest('#editor-form'))recipePreview();
  });
  document.addEventListener('change',async event=>{
    const el=event.target;
    try{
      if(el.id==='report-counter'){counterFilter=el.value;invalidate();render();}
      if(el.id==='selling-counter'){sellingCounter=+el.value;localStorage.setItem('adegacontrol.counter.'+profile,String(sellingCounter));render();}
      if(el.classList.contains('recipe-select'))recipePreview();
      if(el.id==='brand-logo'&&el.files[0]){
        owner();const file=el.files[0];if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>5*1024*1024)throw new Error('Escolha PNG, JPG ou WebP com até 5 MB.');
        const url=URL.createObjectURL(file),img=new Image();
        try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Não foi possível abrir a imagem.'));img.src=url;});const scale=Math.min(1,256/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);brand.logo=canvas.toDataURL('image/png');brand.custom=true;applyBrand();await persist();toast('Logo atualizada.');}finally{URL.revokeObjectURL(url);}
      }
      if(el.id==='import-file'&&el.files[0]){
        owner();const file=el.files[0];if(file.size>30*1024*1024)throw new Error('O arquivo excede o limite de 30 MB.');
        const payload=JSON.parse(await file.text());if(payload.app!==APP_NAME||payload.version!==1||!['bairro','premium'].includes(payload.profile))throw new Error('Este arquivo não é uma exportação válida do AdegaControl.');
        const validated=E.validateImport(payload.state);if(validated.profile!==payload.profile)throw new Error('O perfil do arquivo é inconsistente.');
        const b=payload.brand;if(!b||typeof b.name!=='string'||!b.name.trim()||b.name.length>60||!/^#[0-9a-f]{6}$/i.test(b.color)||b.logo&&(!/^data:image\/(?:png|jpeg|webp);base64,/.test(b.logo)||b.logo.length>700000))throw new Error('Identidade inválida no arquivo.');
        window.__pendingImport={state:validated,brand:{name:b.name,color:b.color,logo:b.logo||'',custom:Boolean(b.custom)},profile:payload.profile};
        modal('Importar dados','<p>Substituir os dados do perfil <strong>'+(payload.profile==='bairro'?'Bairro':'Premium')+'</strong> pelos dados exportados em '+stamp(payload.exportedAt)+'?</p><p>As datas e o histórico serão preservados exatamente. O outro perfil não será alterado.</p>',button('Voltar','close-modal','secondary')+button('Importar e substituir','confirm-import','primary'));
        el.value='';
      }
    }catch(error){toast(error.message||'Não foi possível abrir o arquivo.');if(el.id==='import-file')el.value='';}
  });
  document.addEventListener('keydown',event=>{
    const tile=event.target.closest('.bottle-tile');if(!tile)return;
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();const tiles=$$('.bottle-tile'),i=tiles.indexOf(tile),next=event.key==='Home'?0:event.key==='End'?tiles.length-1:(i+(event.key==='ArrowRight'?1:-1)+tiles.length)%tiles.length;
      tiles[next].focus();tiles[next].scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    }
  });
  $('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const rect=$('#modal').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeModal();}});
  async function boot() {
    try {
      const params=new URLSearchParams(location.search);
      profile=['bairro','premium'].includes(params.get('perfil'))?params.get('perfil'):(localStorage.getItem('adegacontrol.profile')||'bairro');
      if(!['bairro','premium'].includes(profile))profile='bairro';
      try{brand=JSON.parse(localStorage.getItem('adegacontrol.brand'))||defaultBrand(profile);}catch(_){brand=defaultBrand(profile);}
      await loadProfile(profile);
      if(params.has('adega')){brand.name=params.get('adega').trim().slice(0,60)||brand.name;brand.custom=true;}
      if(/^#[0-9a-f]{6}$/i.test(params.get('cor')||'')){brand.color=params.get('cor');brand.custom=true;}
      const hash=location.hash.match(/^#bebida=(.+)$/);if(hash)selected=decodeURIComponent(hash[1]);
      applyBrand();$('#boot').hidden=true;$('#app').hidden=false;render();await persist();
      window.AdegaApp={getState:()=>state,getView:()=>({tab,period,profile,mode,selected}),flush:()=>saveQueue};
    } catch(error) {
      console.error(error);
      $('#boot').innerHTML='<span class="boot-mark">A</span><h1>Não foi possível abrir a adega.</h1><p>'+esc(error.message)+'</p><p>Os dados existentes foram preservados. Confira se o navegador permite armazenamento local.</p>';
    }
  }
  boot();
})();
