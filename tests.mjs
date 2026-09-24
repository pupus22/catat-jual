import assert from 'node:assert/strict';
import {replay,integer} from './engine.mjs';
let seq=0;const E=(type,date,data,id='e'+(++seq))=>({id,type,date,data,seq,voided:false});
const d='2026-09-24';let tests=0;const test=(label,fn)=>{fn();tests++;console.log('PASS '+tests+' '+label)};
const p=E('product',d,{name:'HORN'},'horn'),c=E('contact',d,{name:'Andi',kind:'customer'},'andi'),s=E('contact',d,{name:'Kandang',kind:'supplier'},'kandang');
const initial=E('initial',d,{trayAvailable:8,trayCost:2000}),buy=E('purchase',d,{productId:'horn',partyId:'kandang',weight:10000,price:23500,extra:0,trayIn:8,trayOut:8,trayBought:0}),buy2=E('purchase',d,{productId:'horn',weight:15000,price:24000,extra:0});
const sale=E('sale',d,{productId:'horn',partyId:'andi',weight:12000,price:25000,paid:100000,channel:'offline',trayOut:8,trayIn:7,trayBought:1,trayPrice:2000,delivery:5000,extra:500,pay:'credit'}),pay=E('settlement',d,{partyId:'andi',invoiceId:sale.id,mode:'debt',amount:100000});
const base=[p,c,s,initial,buy,buy2,sale,pay];
test('format angka titik ribuan saja',()=>{assert.equal(integer('30.000'),30000);assert.throws(()=>integer('1.500,50'));});
test('FIFO dari lot tertua',()=>{const r=replay(base);assert.equal(r.stock.horn,13000);assert.equal(r.outcomes[sale.id].cogs,283000+2000);assert.equal(r.products.horn.lots[0].qty,13000)});
test('tray tukar dan beli tidak dihitung ganda',()=>{const r=replay(base);assert.equal(r.tray.available,7);assert.equal(r.contacts.andi.trayDue,0);assert.equal(r.contacts.kandang.trayDue,0)});
test('bon terikat nota dan cicilan tidak menambah omzet',()=>{const r=replay(base);assert.equal(r.invoices[sale.id].debt,107000);assert.equal(r.contacts.andi.debt,107000);assert.equal(r.outcomes[pay.id].revenue,0)});
test('koreksi berat kulak lebih kecil dari penjualan ditolak',()=>assert.throws(()=>replay(base.map(e=>e.id===buy.id?{...e,data:{...e.data,weight:7000}}:e).map(e=>e.id===buy2.id?{...e,voided:true}:e)),/Stok HORN kurang/));
test('koreksi kulak lebih besar menghitung ulang stok',()=>{const r=replay(base.map(e=>e.id===buy.id?{...e,data:{...e.data,weight:12000}}:e));assert.equal(r.stock.horn,15000)});
test('hapus jual salah input pulihkan seluruh saldo tanpa cicilan yatim',()=>{assert.throws(()=>replay(base.map(e=>e.id===sale.id?{...e,voided:true}:e)),/Nota bon tidak ditemukan/);const r=replay(base.map(e=>[sale.id,pay.id].includes(e.id)?{...e,voided:true}:e));assert.equal(r.stock.horn,25000);assert.equal(r.contacts.andi.debt,0);assert.equal(r.tray.available,8)});
test('koreksi harga kulak hitung ulang laba otomatis',()=>{const original=replay(base);const corrected=replay(base.map(e=>e.id===buy.id?{...e,data:{...e.data,price:24500}}:e));assert.equal(original.outcomes[sale.id].profit-corrected.outcomes[sale.id].profit,10000)});
test('retur customer tidak kurangi stok kedua kali',()=>{const r=E('return',d,{direction:'customer',partyId:'andi',productId:'horn',weight:500,resolution:'replace'});const after=replay([...base,r]);assert.equal(after.stock.horn,13000);assert.equal(after.contacts.andi.eggDue,500)});
test('telur pengganti kurangi stok saat dikirim',()=>{const r=E('return',d,{direction:'customer',partyId:'andi',productId:'horn',weight:500,resolution:'replace'}),rep=E('settlement',d,{partyId:'andi',productId:'horn',claimId:r.id,weight:500,mode:'egg'});const after=replay([...base,r,rep]);assert.equal(after.stock.horn,12500);assert.equal(after.contacts.andi.eggDue,0)});
test('biaya bersama kurangi total bukan laba offline secara keliru',()=>{const cost=E('expense',d,{amount:15000,channel:'shared',name:'Bensin'}),r=replay([...base,cost]);assert.equal(r.period[d.slice(0,7)+'|shared'].profit,-15000);assert.equal(r.period[d.slice(0,7)+'|offline'].profit,replay(base).period[d.slice(0,7)+'|offline'].profit)});
test('penjualan Shopee net tidak dipotong lagi',()=>{const r=replay([p,E('purchase',d,{productId:'horn',weight:1000,price:23500}),E('sale',d,{productId:'horn',weight:1000,channel:'shopee',net:26970,extra:500})]);assert.equal(Object.values(r.period).find(x=>x.revenue===26970).profit,2970)});
test('edit pembayaran lebih kecil dari cicilan ditolak',()=>{assert.throws(()=>replay(base.map(e=>e.id===sale.id?{...e,data:{...e.data,price:10000}}:e)),/Pembayaran (awal melebihi total|melebihi sisa bon nota)/)});
test('penambahan tray awal koreksi tray benar',()=>{const r=replay([...base,E('adjust',d,{productId:'',trayAvailable:20,trayBroken:2,trayCost:2000})]);assert.equal(r.tray.available,20);assert.equal(r.tray.broken,2)});
console.log('TOTAL '+tests+' pengujian lulus');

test('retur refund terkait nota dibebankan pada offline',()=>{const r=E('return',d,{direction:'customer',partyId:'andi',productId:'horn',invoiceId:sale.id,weight:500,resolution:'refund',refund:12000});const before=replay(base),after=replay([...base,r]);assert.equal(after.period['2026-09|offline'].profit,before.period['2026-09|offline'].profit-12000);assert.equal(after.contacts.andi.refundDue,12000)});
test('refund customer diselesaikan tanpa laba dipotong dua kali',()=>{const r=E('return',d,{direction:'customer',partyId:'andi',productId:'horn',invoiceId:sale.id,weight:500,resolution:'refund',refund:12000}),refund=E('settlement',d,{partyId:'andi',claimId:r.id,mode:'refund',amount:12000});const after=replay([...base,r,refund]);assert.equal(after.contacts.andi.refundDue,0);assert.equal(after.outcomes[refund.id].profit,0)});
test('hapus transaksi retur yang sudah dibayar ditolak sampai refund terkait dibatalkan',()=>{const r=E('return',d,{direction:'customer',partyId:'andi',productId:'horn',invoiceId:sale.id,weight:500,resolution:'refund',refund:12000}),refund=E('settlement',d,{partyId:'andi',claimId:r.id,mode:'refund',amount:12000});assert.throws(()=>replay([...base,{...r,voided:true},refund]),/Pilih retur/)});
test('bon awal bisa dilunasi sesuai nota saldo awal',()=>{const initialDebt=E('initial',d,{partyId:'andi',debt:300000}),rep=E('settlement',d,{partyId:'andi',invoiceId:initialDebt.id,mode:'debt',amount:100000});const r=replay([c,initialDebt,rep]);assert.equal(r.contacts.andi.debt,200000);assert.equal(r.invoices[initialDebt.id].debt,200000)});
test('beli tray yang dipinjam tidak mengurangi fisik dua kali',()=>{const loan=E('tray',d,{mode:'loan',partyId:'andi',out:4,in:0}),convert=E('tray',d,{mode:'convert',partyId:'andi',out:2,in:0,price:2500,paid:5000});const r=replay([c,initial,loan,convert]);assert.equal(r.tray.available,4);assert.equal(r.contacts.andi.trayDue,2)});
console.log('TOTAL FINAL '+tests+' pengujian lulus');
test('HPP gram satuan dibulatkan konsisten tanpa akumulasi selisih',()=>{
 const es=[p,E('purchase',d,{productId:'horn',weight:1001,price:23500})];
 for(let i=0;i<1001;i++)es.push(E('sale',d,{productId:'horn',weight:1,price:25000,channel:'offline'}));
 const r=replay(es),sum=es.filter(e=>e.type==='sale').reduce((n,e)=>n+r.outcomes[e.id].cogs,0);
 assert.equal(sum,Math.round(1001*23500/1000));assert.equal(r.stock.horn,0);
});
console.log('TOTAL FINAL '+tests+' pengujian lulus');
test('transaksi historis dapat diinput setelah jenis telur dibuat',()=>{const p2=E('product','2026-09-24',{name:'OMEGA'},'omega');const b=E('purchase','2026-09-10',{productId:'omega',weight:10000,price:27000});const r=replay([p2,b]);assert.equal(r.stock.omega,10000)});
console.log('TOTAL FINAL '+tests+' pengujian lulus');
test('penghapusan customer yang masih dipakai transaksi ditolak',()=>{
 assert.throws(()=>replay(base.map(e=>e.id===c.id?{...e,voided:true}:e)),/customer\/supplier pada transaksi tidak ditemukan|Customer\/supplier pada transaksi tidak ditemukan/);
});
test('penghapusan jenis telur yang masih dipakai ditolak',()=>{
 assert.throws(()=>replay(base.map(e=>e.id===p.id?{...e,voided:true}:e)),/Jenis telur tidak ditemukan/);
});
test('tanggal penjualan dimajukan sebelum ada stok ditolak',()=>{
 assert.throws(()=>replay(base.map(e=>e.id===sale.id?{...e,date:'2026-09-01'}:e)),/(Stok HORN kurang|tray tersedia 0)/);
});
test('kas: kulak keluar, penjualan dan cicilan masuk, tanpa omzet ganda',()=>{
 const r=replay(base),flow=r.cash['2026-09'];assert.equal(flow.in,200000);assert.equal(flow.out,235000+15000*24);assert.equal(r.outcomes[pay.id].revenue,0);
});
test('koreksi transaksi biaya operasional membalik laba dan kas',()=>{
 const expense=E('expense',d,{amount:10000,pay:'qris',channel:'offline',name:'Parkir'});
 const original=replay([...base,expense]);const corrected=replay([...base,{...expense,data:{...expense.data,amount:5000}}]);
 assert.equal(corrected.period['2026-09|offline'].profit-original.period['2026-09|offline'].profit,5000);
 assert.equal(corrected.cash['2026-09'].out,original.cash['2026-09'].out-5000);
});
test('edit harga jual harian tidak mengubah jenis telur atau harga kulak',()=>{
 const corrected=replay(base.map(e=>e.id===sale.id?{...e,data:{...e.data,price:26000}}:e));assert.equal(corrected.invoices[sale.id].revenue,319000);assert.equal(corrected.products.horn.name,'HORN');assert.equal(corrected.outcomes[sale.id].cogs,285000);
});
console.log('TOTAL FINAL '+tests+' pengujian lulus');
