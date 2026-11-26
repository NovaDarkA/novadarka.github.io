import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = join(root, "dist");
const assets = [
  "index.html", "coleccion.html", "sorprendeme.html", "login.html", "registro.html", "administracion.html", "carrito.html", "pedido.html",
  "page_collection.html", "page_login.html", "page_surprise.html", "css", "js", "img"
];
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const item of assets) {
  await cp(join(root, item), join(output, item), { recursive: true });
}
console.log("Shoefit: static assets copied to dist.");
