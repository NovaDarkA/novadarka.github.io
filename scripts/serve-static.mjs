import {createServer} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {extname,resolve,relative,isAbsolute} from "node:path";
const root=resolve("dist"),port=Number(process.env.PORT||4173);
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".ico":"image/x-icon"};
await stat(resolve(root,"index.html"));
createServer(async(req,res)=>{
 if(!["GET","HEAD"].includes(req.method)){res.writeHead(405,{Allow:"GET, HEAD"}).end();return;}
 try{
   const url=new URL(req.url,"http://localhost");
   const pathname=decodeURIComponent(url.pathname);
   const legacy=({"/index.html":"/","/index":"/","/page_collection":"/coleccion","/page_login":"/login","/page_surprise":"/sorprendeme"})[pathname]??(/\.html$/.test(pathname)?pathname.slice(0,-5):null);
   if(legacy){res.writeHead(308,{Location:legacy+url.search}).end();return;}
   const path=resolve(root,"."+ (pathname==="/" ? "/index.html":!extname(pathname)?pathname+".html":pathname));
   const rel=relative(root,path);
   if(rel.startsWith("..")||isAbsolute(rel)){res.writeHead(403).end();return;}
   const body=await readFile(path);
   res.writeHead(200,{"Content-Type":mime[extname(path)]||"application/octet-stream","X-Content-Type-Options":"nosniff"});
   res.end(req.method==="HEAD"?undefined:body);
 }catch{
   res.writeHead(404,{"Content-Type":"text/html; charset=utf-8"});
   res.end(req.method==="HEAD"?undefined:await readFile(resolve(root,"404.html")));
 }
}).listen(port,"127.0.0.1",()=>console.log("Shoefit preview: http://127.0.0.1:"+port));
