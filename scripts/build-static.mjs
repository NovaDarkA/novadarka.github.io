import {cp,mkdir,rm,readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {pages,assets,renderHeader} from "./frontend-manifest.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const output=join(root,"dist");
const header=await readFile(join(root,"frontend/components/header.html"),"utf8");
if(new Set(pages.map(p=>p.name)).size!==pages.length)throw Error("Duplicate public route");
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const page of pages){
 if(process.argv.includes('--protected')&&page.name==='administracion.html')continue;
 let html=await readFile(join(root,page.source),"utf8");
 if(page.sharedHeader){
   if(html.split("<!-- SHARED_HEADER -->").length!==2)throw Error("Missing or duplicate header: "+page.source);
   html=html.replace("<!-- SHARED_HEADER -->",renderHeader(header,page.name));
 }
 await writeFile(join(output,page.name),html,"utf8");
}
for(const asset of assets)await cp(join(root,"frontend/assets",asset),join(output,asset),{recursive:true});
console.log("Shoefit: "+pages.length+" public routes built; source organized in frontend/.");
