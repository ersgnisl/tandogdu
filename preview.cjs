const http=require('http');
const fs=require('fs');
const path=require('path');
const {exec}=require('child_process');
const root=__dirname;
const port=5187;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.mp4':'video/mp4'};
http.createServer((request,response)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname)}catch{response.writeHead(400).end();return}
  if(pathname==='/tr'){response.writeHead(302,{Location:'/tr/'}).end();return}
  if(pathname.endsWith('.html')){let clean=pathname.endsWith('/index.html')?pathname.slice(0,-10):pathname.slice(0,-5)+'/';if(!clean)clean='/';response.writeHead(302,{Location:clean}).end();return}
  let filePath=pathname;
  if(pathname==='/')filePath='/index.html';
  else if(pathname==='/tr/')filePath='/tr/index.html';
  else if(pathname.endsWith('/'))filePath=pathname.slice(0,-1)+'.html';
  const target=path.resolve(root,'.'+filePath);
  const relative=path.relative(root,target);
  if(relative.startsWith('..')||path.isAbsolute(relative)){response.writeHead(403).end();return}
  if(path.extname(target).toLowerCase()==='.mp4'){
    fs.stat(target,(error,stats)=>{
      if(error||!stats.isFile()){response.writeHead(404).end('Video not found');return}
      const range=request.headers.range;
      if(range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        if(!match){response.writeHead(416,{'Content-Range':`bytes */${stats.size}`}).end();return}
        const start=match[1]?Number(match[1]):0;
        const end=match[2]?Math.min(Number(match[2]),stats.size-1):stats.size-1;
        if(start> end||start>=stats.size){response.writeHead(416,{'Content-Range':`bytes */${stats.size}`}).end();return}
        response.writeHead(206,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${stats.size}`,'Content-Length':end-start+1});
        fs.createReadStream(target,{start,end}).pipe(response);
      }else{
        response.writeHead(200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':stats.size});
        fs.createReadStream(target).pipe(response);
      }
    });
    return;
  }
  fs.readFile(target,(error,data)=>{
    if(error){response.writeHead(404).end('Page not found');return}
    const type=types[path.extname(target)]||'application/octet-stream';
    if(type.startsWith('text/html')){const base=pathname.startsWith('/tr/')?'/tr/':'/';data=Buffer.from(data.toString('utf8').replace('<head>',`<head><base href="${base}">`))}
    response.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data)
  })
}).listen(port,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${port}/`;
  console.log(`Tandoğdu Tekstil preview: ${url}`);
  console.log('Close this window to stop the preview.');
  if(process.argv.includes('--open')&&process.platform==='win32')exec(`start "" "${url}"`)
});
