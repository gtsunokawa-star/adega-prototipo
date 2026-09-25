/* Original, code-drawn illustrations. No external image or brand assets. */
(() => {
  'use strict';
  let serial = 0;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const paths = {
    dashboard:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    counter:'M3 7h18v13H3zM6 3h12v4M7 11h3m4 0h3m-10 4h10',
    bottle:'M10 3h4v5l4 4v9H6v-9l4-4zM9 15h6M10 6h4',
    stock:'m12 3 9 5-9 5-9-5 9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7 5.8l9 5',
    reports:'M4 3v18h17M8 16v-4m5 4V7m5 9v-6',
    leak:'M12 2S5 9 5 14a7 7 0 0 0 14 0c0-5-7-12-7-12Zm-3 12a3 3 0 0 0 3 3',
    settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5h4l.7 3 2.4 1.4 3-.8 2 3.5-2.3 2.1v2.8l2.3 2.1-2 3.5-3-.8-2.4 1.4-.7 3h-4l-.7-3-2.4-1.4-3 .8-2-3.5 2.3-2.1v-2.8L2 10.1l2-3.5 3 .8L9.3 6l.7-3Z',
    arrow:'M5 12h14m-6-6 6 6-6 6',
    arrowUp:'M6 18 18 6M6 6h12v12',
    chevron:'m9 5 7 7-7 7',
    chevronDown:'m6 9 6 6 6-6',
    plus:'M12 5v14M5 12h14',
    minus:'M5 12h14',
    close:'m6 6 12 12M18 6 6 18',
    check:'m5 12 4 4L19 6',
    search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm5.5 13 5 5',
    clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2',
    calendar:'M4 5h16v16H4zM8 2v6m8-6v6M4 10h16',
    help:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-3 6a3 3 0 1 1 5 2c-2 1-2 1-2 3m0 3h.01',
    info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 7v7m0-10h.01',
    wallet:'M20 7H4V4h15v3M4 7v14h17V7h-1Zm17 4h-7v6h7m-4-3h.01',
    pix:'m12 2 5 5-5 5-5-5 5-5Zm0 10 5 5-5 5-5-5 5-5ZM2 12l4-4 4 4-4 4-4-4Zm12 0 4-4 4 4-4 4-4-4Z',
    cash:'M2 6h20v13H2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 10h.01M19 15h.01',
    card:'M3 5h18v14H3zM3 10h18M7 15h3',
    download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    copy:'M9 8h12v13H9zM16 8V3H3v13h6',
    refresh:'M20 7v5h-5M4 17v-5h5M5.1 7a8 8 0 0 1 13.7-2L20 7M4 17l1.2 2A8 8 0 0 0 19 17',
    user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 21v-2a8 8 0 0 1 16 0v2',
    eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    lock:'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4m-4 5v2',
    spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
    crown:'m3 6 4 5 5-8 5 8 4-5-2 13H5L3 6Zm3 10h12',
    warning:'m12 3 10 18H2L12 3Zm0 6v5m0 3h.01',
    cart:'M2 3h3l3 12h11l3-9H6M9 19h.01M18 19h.01',
    trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
    edit:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-3 3 5 5',
    menu:'M4 6h16M4 12h16M4 18h16',
    filter:'M3 5h18l-7 8v7l-4-2v-5L3 5Z',
    trend:'m3 17 6-6 4 4 8-10M15 5h6v6',
    logout:'M9 3H3v18h6M8 12h13m-5-5 5 5-5 5',
    sun:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5',
    moon:'M20.5 14A9 9 0 0 1 10 3a9 9 0 1 0 10.5 11Z'
  };
  paths['arrow-left']='M19 12H5m6-6-6 6 6 6';
  paths['arrow-down']='M12 5v14m-6-6 6 6 6-6';
  paths['chevron-left']='m15 5-7 7 7 7';
  paths.glass='M4 3h16l-8 10L4 3Zm8 10v8m-5 0h10M6.5 6h11';
  paths.list='M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01';
  paths.clipboard='M8 4H4v18h16V4h-4M8 2h8v5H8zM8 12h8m-8 5h5';
  const aliases={home:'dashboard',grid:'dashboard',painel:'dashboard',balcao:'counter',inventory:'stock',estoque:'stock',chart:'reports',relatorios:'reports',drop:'leak',droplet:'leak',vazamento:'leak',gear:'settings',ajustes:'settings',arrowRight:'arrow','arrow-right':'arrow','arrow-up-right':'arrowUp','chevron-right':'chevron','credit-card':'card',money:'cash',x:'close',box:'stock',package:'stock',add:'plus',alert:'warning','check-circle':'check','shopping-bag':'cart',bar:'counter',history:'clock',trophy:'crown',trending:'trend'};
  function icon(name) {
    const key=aliases[name] || name;
    return `<svg class="icon icon-${esc(key)}" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key] || paths.bottle}"/></svg>`;
  }
  function bottle(item={}, {large=false,level=false}={}) {
    const photo=window.AdegaPhotos && window.AdegaPhotos[item.name];
    if(photo) return '<span class="bottle-svg bottle-photo'+(large?' bottle-large':'')+'"><img src="'+photo.src+'" alt="'+esc(item.name)+' — foto do produto" width="200" height="380" style="object-fit:'+photo.fit+'" decoding="async"></span>';
    const id=`adega-bottle-${++serial}`;
    const name=String(item.name || item.nome || 'Reserva da casa');
    const rawType=String(item.type || item.tipo || item.category || 'whisky').toLowerCase();
    const kind=rawType.includes('vod')?'vodka':rawType.includes('gin')?'gin':rawType.includes('rum')?'rum':rawType.includes('cerve')?'beer':'whisky';
    const colorCandidate=item.corRotulo || item.labelColor || item.color;
    const color=/^#[0-9a-f]{3,8}$/i.test(colorCandidate || '')?colorCandidate:({whisky:'#3f4a32',vodka:'#6c8292',gin:'#537568',rum:'#874d39',beer:'#8c7541'})[kind];
    const volume=Number(item.bottleMl || item.volumeMl || item.volumeGarrafa || item.volume || item.capacityMl) || 1000;
    const shapes={
      whisky:'M76 61H124V102Q124 112 145 126L154 135V337Q154 348 143 351H57Q46 348 46 337V135L55 126Q76 112 76 102Z',
      vodka:'M83 54H117V128Q117 141 129 153Q139 162 139 178V340Q139 350 129 352H71Q61 350 61 340V178Q61 162 71 153Q83 141 83 128Z',
      gin:'M79 63H121V115C122 134 156 149 160 174V331Q158 349 142 352H58Q42 349 40 331V174C44 149 78 134 79 115Z',
      rum:'M79 65H121V112Q121 128 140 140Q152 149 152 177V329Q152 350 132 353H68Q48 350 48 329V177Q48 149 60 140Q79 128 79 112Z',
      beer:'M83 49H117V110Q117 130 132 148Q142 161 142 185V334Q142 350 130 352H70Q58 350 58 334V185Q58 161 68 148Q83 130 83 110Z'
    };
    const liquid=({whisky:'#aa641f',vodka:'#7898a1',gin:'#386d54',rum:'#884213',beer:'#977323'})[kind];
    const narrow=kind==='vodka'||kind==='beer';
    const neck=narrow?{x:80,w:40,y:31,h:31}:{x:75,w:50,y:40,h:33};
    const lx=narrow?65:51,lw=narrow?70:98,ly=kind==='vodka'?205:197,lh=kind==='gin'?105:111;
    const words=name.split(/\s+/).filter(Boolean),lines=[];let line='';
    const max=narrow?11:14;
    for(const word of words) { if((line+' '+word).trim().length>max&&line){lines.push(line);line=word;}else line=(line+' '+word).trim(); }
    if(line)lines.push(line);
    const displayLines=lines.slice(0,3).map((t,i)=>`<tspan x="100" dy="${i?17:0}">${esc(t.length>16?t.slice(0,15)+'…':t)}</tspan>`).join('');
    const rawLevel = item.fillLevel ?? item.level ?? (item.open != null ? Number(item.open)/volume : item.stockMl != null ? (Number(item.stockMl)%volume)/volume : .68);
    const fillRatio=typeof level==='number'?Math.max(0,Math.min(1,level)):level?Math.max(0,Math.min(1,Number(rawLevel) || 0)):.89;
    const fluidY=353-fillRatio*210;
    const sixHex=color.length===4?color.slice(1).split('').map(c=>c+c).join(''):color.slice(1,7);
    const channels=[0,2,4].map(start=>parseInt(sixHex.slice(start,start+2),16)/255).map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4));
    const lightLabel=(.2126*channels[0]+.7152*channels[1]+.0722*channels[2])>.3;
    const labelText=lightLabel?'#172018':'#fff7df';
    return `<svg class="bottle-svg${large?' bottle-large':''}${level?' bottle-with-level':''}" viewBox="0 0 200 380" role="img" aria-labelledby="${id}-title" xmlns="http://www.w3.org/2000/svg"><title id="${id}-title">${esc(name)}, ${esc(rawType)}, ${volume} ml${level?', nível ilustrativo do estoque':''}</title><defs><linearGradient id="${id}-glass" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#fff" stop-opacity=".15"/><stop offset=".12" stop-color="#a0b197" stop-opacity=".26"/><stop offset=".25" stop-color="#141c15" stop-opacity=".5"/><stop offset=".65" stop-color="#101811" stop-opacity=".25"/><stop offset=".9" stop-color="#8b9c79" stop-opacity=".24"/><stop offset="1" stop-color="#e1e3c8" stop-opacity=".35"/></linearGradient><linearGradient id="${id}-liquid" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${liquid}" stop-opacity=".55"/><stop offset=".28" stop-color="${liquid}" stop-opacity=".92"/><stop offset=".56" stop-color="${liquid}" stop-opacity=".69"/><stop offset="1" stop-color="${liquid}" stop-opacity=".4"/></linearGradient><linearGradient id="${id}-cap" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#202321"/><stop offset=".25" stop-color="#62605a"/><stop offset=".5" stop-color="#383932"/><stop offset=".83" stop-color="#131713"/><stop offset="1" stop-color="#4a4a3b"/></linearGradient><linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".05"/></linearGradient><clipPath id="${id}-clip"><path d="${shapes[kind]}"/></clipPath></defs><ellipse cx="100" cy="361" rx="67" ry="9" fill="#000" opacity=".42"/><path d="${shapes[kind]}" fill="url(#${id}-glass)" stroke="#afbaa0" stroke-opacity=".34" stroke-width="1.1"/><g clip-path="url(#${id}-clip)"><rect x="39" y="${fluidY}" width="122" height="212" fill="url(#${id}-liquid)"/><path d="M39 ${fluidY}Q100 ${fluidY+3} 161 ${fluidY}" fill="none" stroke="#d9b268" stroke-opacity=".36"/><path d="M58 152V331Q58 341 67 341" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="4"/><path d="M145 144V328" fill="none" stroke="#eddfb0" stroke-opacity=".18" stroke-width="2"/><path d="M67 134V184" stroke="#fff" stroke-opacity=".13" stroke-width="2"/><rect x="40" y="60" width="122" height="293" fill="url(#${id}-shine)"/><path d="M51 342H148M55 346H144" stroke="#d3c18b" stroke-opacity=".25"/></g><rect x="${neck.x}" y="${neck.y}" width="${neck.w}" height="${neck.h}" rx="3" fill="url(#${id}-cap)" stroke="#9f997b" stroke-opacity=".3"/><path d="M${neck.x+3} ${neck.y+5}h${neck.w-6}M${neck.x+2} ${neck.y+neck.h-5}h${neck.w-4}" stroke="#d8caaa" stroke-opacity=".38"/><path d="M${neck.x+7} ${neck.y+9}v${neck.h-19}m5 0v-${neck.h-19}m5 0v${neck.h-19}m5 0v-${neck.h-19}m5 0v${neck.h-19}" stroke="#c1b994" stroke-opacity=".12"/><rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="1" fill="${color}"/><rect x="${lx+4}" y="${ly+4}" width="${lw-8}" height="${lh-8}" rx=".5" fill="none" stroke="${labelText}" stroke-opacity=".43" stroke-width=".6"/><path d="M${lx+11} ${ly+27}h${lw-22}M${lx+11} ${ly+lh-27}h${lw-22}" stroke="${labelText}" stroke-opacity=".32" stroke-width=".6"/><text x="100" y="${ly+19}" text-anchor="middle" fill="${labelText}" font-family="Georgia,serif" font-size="6" letter-spacing="2">SELEÇÃO DA CASA</text><text x="100" y="${ly+(displayLines.match(/tspan/g)?.length>4?45:51)}" text-anchor="middle" fill="${labelText}" font-family="'Cormorant Garamond',Georgia,serif" font-size="${narrow?12:15}" font-weight="600">${displayLines}</text><text x="100" y="${ly+lh-15}" text-anchor="middle" fill="${labelText}" font-family="Arial,sans-serif" font-size="6" letter-spacing="1.3">${esc(rawType.toUpperCase().slice(0,14))} · ${volume} ML</text><circle cx="100" cy="166" r="11" fill="none" stroke="#d7c496" stroke-opacity=".55" stroke-width=".7"/><path d="m100 159 1.7 4.7 4.8 1.8-4.8 1.7-1.7 4.8-1.7-4.8-4.8-1.7 4.8-1.8 1.7-4.7Z" fill="#d7c496" opacity=".7"/></svg>`;
  }
  function chartFallback(series=[]) {
    const data=(Array.isArray(series)?series:series.data || []).map((point,i)=>typeof point==='number'?{label:String(i+1),value:point}:{label:String(point.label ?? point.date ?? point.day ?? i+1),value:Number(point.value ?? point.revenue ?? point.total ?? point.faturamento ?? 0)});
    const id=`adega-chart-${++serial}`, width=760,height=230,left=57,top=22,right=14,bottom=38;
    if(!data.length)return '<div class="empty-state chart-empty">As vendas do período aparecerão aqui.</div>';
    const max=Math.max(1,...data.map(p=>p.value)),min=Math.min(0,...data.map(p=>p.value)),span=max-min || 1;
    const x=i=>left+i*(width-left-right)/Math.max(1,data.length-1),y=v=>top+(max-v)/span*(height-top-bottom);
    const points=data.map((p,i)=>`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    const fmt=v=>new Intl.NumberFormat('pt-BR',{notation:Math.abs(v)>=10000?'compact':'standard',maximumFractionDigits:0}).format(v);
    const axes=[0,.5,1].map(f=>{const val=min+span*f,py=y(val);return `<line x1="${left}" x2="${width-right}" y1="${py}" y2="${py}" stroke="currentColor" stroke-opacity=".1"/><text x="${left-13}" y="${py+4}" text-anchor="end">${esc(fmt(val))}</text>`;}).join('');
    const stride=Math.max(1,Math.ceil(data.length/6));
    const labels=data.map((p,i)=>i%stride===0||i===data.length-1?`<text x="${x(i)}" y="${height-12}" text-anchor="${i===0?'start':i===data.length-1?'end':'middle'}">${esc(p.label)}</text>`:'').join('');
    return `<svg class="fallback-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Faturamento ao longo do período. ${data.length} pontos, máximo ${esc(fmt(max))}." xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent, #c9e879)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent, #c9e879)" stop-opacity="0"/></linearGradient></defs><g fill="currentColor" font-family="Inter,Arial,sans-serif" font-size="11">${axes}${labels}</g><polygon points="${left},${y(min)} ${points} ${x(data.length-1)},${y(min)}" fill="url(#${id})"/><polyline points="${points}" stroke="var(--accent, #c9e879)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${data.length<18?data.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="3" fill="var(--accent, #c9e879)"><title>${esc(p.label)}: ${esc(fmt(p.value))}</title></circle>`).join(''):''}</svg>`;
  }
  window.AdegaVisual={bottle,icon,chartFallback};
})();
