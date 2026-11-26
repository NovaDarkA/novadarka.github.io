// Explicit public route map. Source folders are never exposed directly.
export const pages = [
  {
    "name": "index.html",
    "source": "frontend/pages/tienda/index.html",
    "sharedHeader": true
  },
  {
    "name": "coleccion.html",
    "source": "frontend/pages/tienda/coleccion.html",
    "sharedHeader": true
  },
  {
    "name": "sorprendeme.html",
    "source": "frontend/pages/tienda/sorprendeme.html",
    "sharedHeader": true
  },
  {
    "name": "carrito.html",
    "source": "frontend/pages/compra/carrito.html",
    "sharedHeader": true
  },
  {
    "name": "pedido.html",
    "source": "frontend/pages/compra/pedido.html",
    "sharedHeader": true
  },
  {
    "name": "login.html",
    "source": "frontend/pages/cuenta/login.html",
    "sharedHeader": true
  },
  {
    "name": "registro.html",
    "source": "frontend/pages/cuenta/registro.html",
    "sharedHeader": true
  },
  {
    "name": "cuenta.html",
    "source": "frontend/pages/cuenta/cuenta.html",
    "sharedHeader": true
  },
  {
    "name": "recuperar.html",
    "source": "frontend/pages/cuenta/recuperar.html",
    "sharedHeader": true
  },
  {
    "name": "administracion.html",
    "source": "frontend/pages/administracion/administracion.html",
    "sharedHeader": false
  },
  {
    "name": "informacion.html",
    "source": "frontend/pages/ayuda/informacion.html",
    "sharedHeader": true
  },
  {
    "name": "404.html",
    "source": "frontend/pages/ayuda/404.html",
    "sharedHeader": false
  },
  {
    "name": "page_collection.html",
    "source": "frontend/pages/compatibilidad/page_collection.html",
    "sharedHeader": false
  },
  {
    "name": "page_login.html",
    "source": "frontend/pages/compatibilidad/page_login.html",
    "sharedHeader": false
  },
  {
    "name": "page_surprise.html",
    "source": "frontend/pages/compatibilidad/page_surprise.html",
    "sharedHeader": false
  }
];
export const assets = ["css","js","img"];
export const headerPages = pages.filter(page=>page.sharedHeader).map(page=>page.name);
export const regularPages = pages.filter(page=>page.sharedHeader||page.name==="administracion.html").map(page=>page.name);
export function renderHeader(template,page){
  let result=template.trim();
  const active={
    "coleccion.html":['href="/coleccion">Colección Martin Dingman','href="/coleccion" aria-current="page">Colección Martin Dingman'],
    "login.html":['href="/login">Iniciar sesión','href="/login" aria-current="page">Iniciar sesión'],
    "registro.html":['href="/registro">Crear cuenta','href="/registro" aria-current="page">Crear cuenta'],
    "carrito.html":['href="/carrito" aria-label="Carrito" class="action-icon"','href="/carrito" aria-label="Carrito" class="action-icon" aria-current="page"'],
    "cuenta.html":['href="/cuenta">Mi perfil','href="/cuenta" aria-current="page">Mi perfil']
  }[page];
  if(active)result=result.replace(...active);
  return result;
}
