import { createSupabaseTransport } from "./supabase-transport.js";
import { HttpError } from "../lib/http.js";

/** @param {ReturnType<typeof createSupabaseTransport>} request */
export async function readCatalog(request) {
  const params = new URLSearchParams({select:"id_producto,slug,nom_prod,marca,talla,precio,tipo_prod,color,img",activo:"eq.true",order:"id_producto.asc",limit:"100"});
  const response = await request("/rest/v1/producto?" + params.toString());
  if (!response.ok) throw new HttpError(503, "catalog_unavailable");
  const data = await response.json();
  if (!Array.isArray(data)) throw new HttpError(503, "catalog_unavailable");
  return data;
}
