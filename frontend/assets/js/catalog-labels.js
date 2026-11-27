// Translate only known catalog labels; never guess or overwrite administrator-entered text.
const labels=Object.freeze({
 "Black Leather Shoes for women":"Zapatos negros de piel para mujer",
 "Black Lili 50 medium heels for women":"Tacones medianos negros Lili 50 para mujer",
 "Black Shoes Dr Martens 1461":"Zapatos negros Dr. Martens 1461",
 "Brown Soft Heels for women":"Tacones café Soft para mujer",
 "Flexi Black Shoe Confort 4831":"Zapato negro Flexi Confort 4831",
 "Spray Lifestyle Black for women":"Zapatos negros Spray Lifestyle para mujer",
 "Black":"Negro",
 "Heels":"Tacones",
 "Leather Shoes":"Zapatos de piel",
 "Loafers":"Mocasines",

 "Flexible Sneakers for men":"Tenis flexibles para hombre",
 "Sport Shoes special brand orange and white":"Tenis deportivos blancos y naranjas de marca especial",
 "Martin Dingman Brown For Men 123456":"Zapatos café Martin Dingman para hombre 123456",
 "Casual Boots Martin O'Neil Brown":"Botas casuales café Martin O'Neil",
 "Gray":"Gris","Orange / White":"Naranja / blanco","Brown":"Café",
 "Sneakers":"Tenis","Sport Shoes":"Tenis deportivos","Casual Shoes":"Zapatos casuales","Casual Boots":"Botas casuales"
});
export function catalogLabel(value){return typeof value==="string"&&Object.hasOwn(labels,value)?labels[value]:value;}
export function localizeCatalogRecord(row){return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,["nom_prod","color","tipo_prod","tipo_producto"].includes(key)?catalogLabel(value):value]));}
