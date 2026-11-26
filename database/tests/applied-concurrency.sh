#!/usr/bin/env bash
# Run only against disposable PostgreSQL initialized from actual migrations.
set -euo pipefail
: "${CONTAINER:?disposable CI container required}"
db() { docker exec -i "$CONTAINER" psql -X -U postgres -d shoefit_test -v ON_ERROR_STOP=1 "$@"; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
a=10000000-0000-4000-8000-000000000001
b=10000000-0000-4000-8000-000000000002
k1=20000000-0000-4000-8000-000000000001
k2=20000000-0000-4000-8000-000000000002
k3=20000000-0000-4000-8000-000000000003
db <<SQL
insert into auth.users(id,email) values('$a','concurrent-a@test.invalid'),('$b','concurrent-b@test.invalid');
insert into public.producto(nom_prod,slug,precio,activo) values('Concurrency fixture','ci-concurrent-stock',100,true);
insert into public.producto_variante(id_producto,talla,existencias) select id_producto,25,1 from public.producto where slug='ci-concurrent-stock';
insert into public.producto_variante(id_producto,talla,existencias) select id_producto,26,2 from public.producto where slug='ci-concurrent-stock';
SQL
v1=$(db -Atc "select v.id_variante from public.producto_variante v join public.producto p using(id_producto) where p.slug='ci-concurrent-stock' and talla=25")
v2=$(db -Atc "select v.id_variante from public.producto_variante v join public.producto p using(id_producto) where p.slug='ci-concurrent-stock' and talla=26")
# A holds its reservation open; B runs in another connection while the lock is held.
checkout() {
 local uid=$1 key=$2 variant=$3 hold=$4 app=$5
 db <<SQL
begin;
set local application_name='$app';
set local statement_timeout='20s';
select set_config('request.jwt.claim.sub','$uid',true);
set local role authenticated;
select public.shoefit_crear_pedido('$key',jsonb_build_array(jsonb_build_object('id_variante',$variant,'cantidad',1)));
select pg_sleep($hold);
commit;
SQL
}
wait_for_sleep() {
 local app=$1
 for i in $(seq 1 100); do
  if [ "$(db -Atc "select count(*) from pg_stat_activity where application_name='$app' and wait_event='PgSleep'")" = 1 ]; then return 0; fi
  sleep 0.1
 done
 echo "First session did not hold its transaction"; return 1
}
checkout "$a" "$k1" "$v1" 5 ci-stock-first >"$tmp/a" 2>&1 &
pid=$!
wait_for_sleep ci-stock-first
if checkout "$b" "$k2" "$v1" 0 ci-stock-second >"$tmp/b" 2>&1; then
 wait "$pid"; echo "FAIL oversold final unit"; cat "$tmp/b"; exit 1
fi
wait "$pid"
grep -q 'stock_unavailable' "$tmp/b"
[ "$(db -Atc "select existencias from public.producto_variante where id_variante=$v1")" = 0 ]
[ "$(db -Atc "select count(*) from public.pedido where checkout_key in ('$k1','$k2')")" = 1 ]
echo 'PASS independent customers cannot oversell the final unit'
# Same customer, same key, two simultaneous submissions.
checkout "$a" "$k3" "$v2" 5 ci-retry-first >"$tmp/c" 2>&1 &
pid=$!
wait_for_sleep ci-retry-first
checkout "$a" "$k3" "$v2" 0 ci-retry-second >"$tmp/d" 2>&1
wait "$pid"
grep -Eq '"reused": *true' "$tmp/d"
[ "$(db -Atc "select existencias from public.producto_variante where id_variante=$v2")" = 1 ]
[ "$(db -Atc "select count(*) from public.pedido where checkout_key='$k3'")" = 1 ]
echo 'PASS simultaneous retries create only one order and reserve once'
