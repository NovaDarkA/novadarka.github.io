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
 html=html.replace(/href="\/?index\.html(?:#inicio)?"/g,'href="/"').replace(/href="\/?index\.html#/g,'href="/#');
 // Canonical public routes. Keep HTML file names as internal build artifacts.
 html=html.replace(/(href|action)="\/?(coleccion|sorprendeme|carrito|pedido|login|registro|cuenta|recuperar|administracion|informacion|404)\.html(?=["?#])/g,'$1="/$2').replace(/(url=)\/?(coleccion|login|sorprendeme)\.html(?=")/g,'$1/$2');
 // Version local styles and scripts so existing browsers fetch the corrected assets.
 html=html.replace(/(href|src)="((?:css|js)\/[^"?]+\.(?:css|js))"/g,'$1="$2?v=20261126-08"');
 if(page.name!=="administracion.html")html=html.replace("</head>",'<script type="module" src="/js/language.js?v=20261126-08"></script>\n</head>');
 await writeFile(join(output,page.name),html,"utf8");
}
for(const asset of assets)await cp(join(root,"frontend/assets",asset),join(output,asset),{recursive:true});
console.log("Shoefit: "+pages.length+" public routes built; source organized in frontend/.");
