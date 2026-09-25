const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  let target;
  try{target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400);return res.end();}
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if(target===root)target=path.join(root,'index.html');
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);return res.end('Não encontrado');}res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});
}).listen(4180,'127.0.0.1',()=>console.log('AdegaControl em http://127.0.0.1:4180'));
