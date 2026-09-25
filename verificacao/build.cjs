const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'src/shell.html'), 'utf8');
const photoSpec=[
 ['Smirnoff No. 21','smirnoff.png'],
 ['Gin Rock’s','gin-rocks.jpg'],
 ['Ballantine’s Finest','ballantines-oficial.webp'],
 ['Cachaça 51','cachaca-51.jpg'],
 ['Cachaça Corote','corote.jpg'],
 ['Jack Daniel’s Old No. 7','jack-daniels.png'],
 ['Johnnie Walker Red Label','red-label.webp'],
 ['White Horse','white-horse.png'],
 ['Dreher','dreher.webp'],
 ['Gordon’s London Dry Gin','gordons.png'],
 ['Absolut Vodka','absolut.webp'],
 ['Chivas Regal 12 Anos','chivas-12.jpg'],
 ['Jack Daniel’s Tennessee Honey','jack-honey.jpg'],
 ['Beefeater London Dry Gin','beefeater.png']
];
const photos=photoSpec.map(([name,file])=>({name,mime:'image/'+(file.endsWith('.jpg')?'jpeg':path.extname(file).slice(1)),data:fs.readFileSync(path.join(root,'assets/bebidas',file)).toString('base64'),fit:['ballantines-oficial.webp','jack-honey.jpg'].includes(file)?'contain':'cover'}));
html=html.replace('/*__PHOTOS__*/',()=> 'window.AdegaPhotos=Object.fromEntries('+JSON.stringify(photos)+'.map(p=>[p.name,{src:URL.createObjectURL(new Blob([Uint8Array.from(atob(p.data),c=>c.charCodeAt(0))],{type:p.mime})),fit:p.fit}]));');
for (const [marker, name] of Object.entries({ STYLE: 'style.css', ENGINE: 'engine.js', DEMO: 'demo.js', VISUAL: 'visual.js', APP: 'app.js' })) {
  let text = fs.readFileSync(path.join(root, 'src', name), 'utf8');
  if (marker === 'STYLE' && fs.existsSync(path.join(root, 'src/ui-extra.css'))) text += '\n' + fs.readFileSync(path.join(root, 'src/ui-extra.css'), 'utf8');
  if (marker !== 'STYLE') text = text.replace(/<\/script/gi, '<\\/script');
  html = html.replace('/*__' + marker + '__*/', () => text);
}
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html montado: ' + Buffer.byteLength(html).toLocaleString('pt-BR') + ' bytes; sem build necessário para usar.');
