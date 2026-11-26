// Translate only known catalog labels; never guess or overwrite administrator-entered text.
const labels=Object.freeze({
 "Flexible Sneakers for men":"Tenis flexibles para hombre",
 "Sport Shoes special brand orange and white":"Tenis deportivos blancos y naranjas de marca especial",
 "Martin Dingman Brown For Men 123456":"Zapatos café Martin Dingman para hombre 123456",
 "Casual Boots Martin O'Neil Brown":"Botas casuales café Martin O'Neil",
 "Gray":"Gris","Orange / White":"Naranja / blanco","Brown":"Café",
 "Sneakers":"Tenis","Sport Shoes":"Tenis deportivos","Casual Shoes":"Zapatos casuales","Casual Boots":"Botas casuales"
});
export function catalogLabel(value){return typeof value==="string"&&Object.hasOwn(labels,value)?labels[value]:value;}
export function localizeCatalogRecord(row){return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,["nom_prod","color","tipo_prod","tipo_producto"].includes(key)?catalogLabel(value):value]));}
