import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
const root = resolve("dist");
const pages = ["index.html", "coleccion.html", "sorprendeme.html", "login.html", "registro.html", "page_collection.html", "page_login.html", "page_surprise.html"];
const read = path => readFile(join(root,path),"utf8");

test("published output exposes only the intended frontend", async () => {
  const entries = (await readdir(root)).sort();
  assert.deepEqual(entries, [...pages,"css","js","img"].sort());
});

test("all local HTML links, fragments and responsive image sources exist", async () => {
  const html = Object.fromEntries(await Promise.all(pages.map(async p => [p, await read(p)])));
  let count = 0;
  for (const [page, source] of Object.entries(html)) {
    const refs = [...source.matchAll(/\b(?:href|src|action)="([^"]+)"/g)].map(m=>m[1]);
    for (const m of source.matchAll(/\bsrcset="([^"]+)"/g)) {
      refs.push(...m[1].split(",").map(s=>s.trim().split(/\s+/)[0]));
    }
    for (const m of source.matchAll(/http-equiv="refresh"[^>]*content="[^"]*url=([^"]+)"/gi)) refs.push(m[1]);
    for (const ref of refs) {
      if (ref === "#" || /^(?:https?:|mailto:|tel:|data:|\/\/)/i.test(ref)) continue;
      const [path, hash] = ref.split("#");
      const dest = resolve(root, path || page);
      assert.ok(!relative(root,dest).startsWith(".."), page+": "+ref);
      assert.ok((await stat(dest)).isFile(), page+": "+ref);
      if (hash && html[path || page]) assert.ok([...html[path||page].matchAll(/\bid="([^"]+)"/g)].some(m=>m[1]===hash), page+": "+ref);
      count++;
    }
  }
  assert.ok(count > 100);
  console.log("Validated "+count+" local references");
});

test("legacy pages redirect to the current pages", async () => {
  for (const [old,current] of Object.entries({"page_collection.html":"coleccion.html","page_login.html":"login.html","page_surprise.html":"sorprendeme.html"})) {
    assert.ok((await read(old)).includes('content="0;url='+current+'"'));
  }
});
