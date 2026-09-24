// Sumber kebenaran: event aktif. Semua saldo dihitung ulang setiap koreksi/pembatalan.
export const fmt=n=>Math.round(Number(n)||0).toLocaleString('id-ID');
export const rupiah=n=>'Rp'+fmt(n);
export const integer=(value,label='Angka')=>{
  const s=String(value??'').trim();
  if(!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(s))throw Error(label+': hanya angka bulat, titik untuk ribuan (mis. 10.000).');
  const n=Number(s.replaceAll('.',''));if(!Number.isSafeInteger(n)||n<0)throw Error(label+' tidak valid.');return n;
};
const positive=(n,label)=>{if(!Number.isSafeInteger(n)||n<0)throw Error(label+' tidak valid.');return n};
const required=(ok,msg)=>{if(!ok)throw Error(msg)};
const takeFIFO=(item,qty,ref)=>{
  required(item,'Jenis telur tidak ditemukan pada '+ref);required(qty>0,'Berat harus lebih dari nol.');
  let rem=qty,cost=0,used=[];
  for(const lot of item.lots){const amount=Math.min(rem,lot.qty);if(amount>0){
    const initialQty=lot.initialQty||lot.qty, totalCost=lot.totalCost??Math.round(initialQty*lot.unit/1000);
    const before=initialQty-lot.qty,after=before+amount;
    cost+=Math.round(after*totalCost/initialQty)-Math.round(before*totalCost/initialQty);
    lot.qty-=amount;rem-=amount;used.push({source:lot.source,qty:amount,unit:lot.unit});
  }}
  item.lots=item.lots.filter(l=>l.qty>0);
  if(rem>0)throw Error('Stok '+item.name+' kurang '+fmt(rem)+' gram pada '+ref+'. Periksa kulak atau transaksi keluar sebelumnya.');
  return {cost:Math.round(cost),used};
};
export function replay(events){
 const active=events.filter(e=>!e.voided).sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.seq||0)-(b.seq||0)||String(a.id).localeCompare(String(b.id)));
 const masters=active.filter(e=>['product','contact','productUpdate','contactUpdate'].includes(e.type)).sort((a,b)=>(a.seq||0)-(b.seq||0));
 const timeline=active.filter(e=>!['product','contact','productUpdate','contactUpdate'].includes(e.type));
 const products={},contacts={},invoices={},claims={},returnedWeight={},outcomes={},tray={available:0,broken:0,unitCost:0},period={},cash={},audit=[];
 const add=(e,profit=0,revenue=0,cogs=0,cost=0)=>{const month=e.date.slice(0,7),ch=e.data?.channel||(['sale','tray'].includes(e.type)?'offline':'shared'),key=month+'|'+ch;if(!period[key])period[key]={revenue:0,cogs:0,cost:0,profit:0};period[key].revenue+=revenue;period[key].cogs+=cogs;period[key].cost+=cost;period[key].profit+=profit;outcomes[e.id]={...outcomes[e.id],profit,revenue,cogs,cost};};
 const cashPost=(e,value,method='cash')=>{if(!value)return;const key=e.date.slice(0,7);if(!cash[key])cash[key]={in:0,out:0,byMethod:{cash:0,transfer:0,qris:0}};if(value>=0)cash[key].in+=value;else cash[key].out+=-value;cash[key].byMethod[method in cash[key].byMethod?method:'cash']+=value;};
 const owner=(id)=>{const c=contacts[id];required(c,'Customer/supplier pada transaksi tidak ditemukan.');return c;};
 const available=(n,what)=>{required(tray.available>=n,what+': tray tersedia '+fmt(tray.available)+' pcs, perlu '+fmt(n)+' pcs. Isi stok awal atau koreksi transaksi terkait.');};
 const egg=(id)=>{required(products[id],'Jenis telur tidak ditemukan untuk transaksi.');return products[id]};
 for(const e of [...masters,...timeline]){
  required(/^\d{4}-\d{2}-\d{2}$/.test(e.date||''),'Tanggal transaksi '+e.id+' tidak valid.');
  const v=e.data||{},ref=(e.label||e.type)+' ('+e.date+')';
  switch(e.type){
   case 'product':required(v.name?.trim(),'Nama jenis telur wajib.');required(!products[e.id],'Jenis telur ganda.');products[e.id]={id:e.id,name:v.name.trim(),active:true,lots:[],lastPrice:0};break;
   case 'contact':required(v.name?.trim()&&['customer','supplier'].includes(v.kind),'Data pihak tidak valid.');contacts[e.id]={id:e.id,name:v.name.trim(),kind:v.kind,phone:v.phone||'',address:v.address||'',debt:0,trayDue:0,eggDue:0,refundDue:0};break;
   case 'productUpdate':required(products[v.target],'Jenis telur untuk koreksi tidak ditemukan.');required(v.name?.trim(),'Nama telur wajib.');Object.assign(products[v.target],{name:v.name.trim(),active:v.active!==false});break;
   case 'contactUpdate':required(contacts[v.target],'Customer/supplier untuk koreksi tidak ditemukan.');required(v.name?.trim(),'Nama wajib.');Object.assign(contacts[v.target],{name:v.name.trim(),phone:v.phone||'',address:v.address||'',active:v.active!==false});break;
   case 'initial':{
    if(v.cashAmount!==undefined)cashPost(e,positive(v.cashAmount,'Kas awal'),v.pay||'cash');
    if(v.productId){let p=egg(v.productId);if(v.weight){positive(v.weight,'Stok awal');p.lots.push({source:e.id,qty:v.weight,initialQty:v.weight,unit:positive(v.price||0,'Modal awal'),totalCost:Math.round(v.weight*(v.price||0)/1000)});}}
    if(v.trayAvailable!==undefined){tray.available+=positive(v.trayAvailable,'Tray awal');tray.unitCost=positive(v.trayCost||0,'Modal tray awal');}
    if(v.trayBroken!==undefined)tray.broken+=positive(v.trayBroken,'Tray rusak awal');
    if(v.partyId){let c=owner(v.partyId);const openingDebt=positive(v.debt||0,'Bon awal');c.debt+=openingDebt;c.trayDue+=positive(v.trayDue||0,'Saldo tray awal');if(openingDebt)invoices[e.id]={id:e.id,partyId:v.partyId,revenue:openingDebt,paid:0,debt:openingDebt,date:e.date,channel:'opening',pay:'credit',opening:true};}
    break;
   }
   case 'purchase':{
    const p=egg(v.productId),weight=positive(v.weight,'Berat kulak'),price=positive(v.price,'Harga kulak'),extra=positive(v.extra||0,'Biaya kulak');required(weight>0,'Berat kulak wajib lebih dari nol.');
    const inN=positive(v.trayIn||0,'Tray diterima'),out=positive(v.trayOut||0,'Tray ditukar'),bought=positive(v.trayBought||0,'Tray dibeli');required(out+bought<=inN,'Tray ditukar dan dibeli tidak boleh lebih dari tray yang diterima.');available(out,ref);
    tray.available+=inN-out;
    if(bought){const own=tray.available-inN+out;tray.unitCost=Math.round(((own||0)*tray.unitCost+bought*positive(v.trayPrice||0,'Harga tray'))/Math.max(1,own+bought));}
    if(v.partyId){const c=owner(v.partyId);required(c.kind==='supplier','Kulak harus memilih supplier.');c.trayDue+=inN-out-bought;}
    else required(inN===out+bought,'Pilih supplier jika ada saldo tray yang belum diselesaikan.');
    const unit=(weight*price/1000+extra)*1000/weight;p.lots.push({source:e.id,qty:weight,initialQty:weight,unit,totalCost:Math.round(weight*price/1000)+extra});
    outcomes[e.id]={amount:Math.round(weight*price/1000)+bought*(v.trayPrice||0)+extra,weight,trayIn:inN,trayOut:out};cashPost(e,-outcomes[e.id].amount,v.pay||'cash');add(e,0);break;
   }
   case 'sale':{
    const p=egg(v.productId),weight=positive(v.weight,'Berat jual'),out=positive(v.trayOut||0,'Tray keluar'),incoming=positive(v.trayIn||0,'Tray kembali'),bought=positive(v.trayBought||0,'Tray dibeli'),price=positive(v.price||0,'Harga jual'),ship=positive(v.delivery||0,'Ongkir'),cost=positive(v.extra||0,'Biaya tambahan');
    required(bought<=out,'Tray dibeli melebihi tray keluar.');required(incoming<=out-bought,'Jumlah tray diterima melebihi tray yang ditukar.');available(out,ref);
    const fifo=takeFIFO(p,weight,ref),unitTrayCost=tray.unitCost;
    tray.available+=incoming-out;
    if(v.partyId){const c=owner(v.partyId);required(c.kind==='customer','Penjualan harus memilih customer.');c.trayDue+=out-incoming-bought;required(c.trayDue>=0,'Saldo tray customer menjadi negatif.');}
    else required(out===incoming+bought,'Pilih customer untuk tray yang belum dikembalikan.');
    const isShopee=v.channel==='shopee';
    const revenue=isShopee?positive(v.net||0,'Uang bersih Shopee'):Math.round(weight*price/1000)+ship+bought*positive(v.trayPrice||0,'Harga jual tray');
    required(revenue>0,'Total penjualan harus lebih dari nol.');
    const paid=isShopee?revenue:positive(v.paid??revenue,'Dibayar sekarang');required(paid<=revenue,'Pembayaran awal melebihi total tagihan.');
    if(paid<revenue)required(v.partyId,'Pilih customer untuk transaksi bon.');
    const due=revenue-paid;if(v.partyId)contacts[v.partyId].debt+=due;
    invoices[e.id]={id:e.id,partyId:v.partyId||'',productId:v.productId,weight,revenue,paid,debt:due,channel:v.channel||'offline',pay:v.pay||'cash',date:e.date};
    p.lastPrice=price;cashPost(e,paid,isShopee?'transfer':v.pay||'cash');
    const cogs=fifo.cost+bought*unitTrayCost;outcomes[e.id]={...invoices[e.id],fifo:fifo.used,trayOut:out,trayIn:incoming,trayBought:bought};add(e,revenue-cogs-cost,revenue,cogs,cost);break;
   }
   case 'tray':{
    const out=positive(v.out||0,'Tray keluar'),incoming=positive(v.in||0,'Tray masuk'),mode=v.mode,price=positive(v.price||0,'Harga tray'),c=v.partyId?owner(v.partyId):null;required(['buy','sell','convert','loan','return','swap','broken','replace'].includes(mode),'Jenis transaksi tray tidak valid.');
    if(mode==='convert'){required(c?.kind==='customer'&&out>0&&incoming===0,'Pilih customer dan jumlah tray pinjaman yang dibeli.');required(c.trayDue>=out,'Tray yang dibeli melebihi saldo pinjaman customer.');const revenue=out*price,paid=positive(v.paid??revenue,'Dibayar');required(paid<=revenue,'Pembayaran melebihi tagihan.');c.trayDue-=out;c.debt+=revenue-paid;invoices[e.id]={id:e.id,partyId:c.id,revenue,paid,debt:revenue-paid,date:e.date,channel:v.channel||'offline',pay:v.pay||'cash',traySale:true};cashPost(e,paid,v.pay||'cash');add(e,revenue-out*tray.unitCost,revenue,out*tray.unitCost);break;}
    if(mode==='buy'){required(incoming>0&&out===0,'Kulak tray: isi hanya jumlah masuk.');tray.unitCost=Math.round((tray.available*tray.unitCost+incoming*price)/(tray.available+incoming));tray.available+=incoming;outcomes[e.id]={amount:incoming*price};cashPost(e,-incoming*price,v.pay||'cash');add(e,0);break;}
    if(mode==='replace'){required(out>0&&incoming>0&&tray.broken>=out,'Tray rusak tidak mencukupi.');tray.broken-=out;tray.available+=incoming;add(e,0);break;}
    available(out,ref);tray.available+=incoming-out;
    if(mode==='broken'){required(out>0&&incoming===0,'Tray rusak: hanya tray keluar.');tray.broken+=out;add(e,-out*tray.unitCost,0,out*tray.unitCost);break;}
    if(mode==='return'){required(c&&out===0&&incoming>0,'Pengembalian tray: pilih pihak dan jumlah masuk.');required(c.trayDue>=incoming,'Tray kembali melebihi kewajiban pihak ini.');c.trayDue-=incoming;add(e,0);break;}
    if(mode==='loan'||mode==='swap'){required(c,'Pilih pihak tukar/pinjam tray.');c.trayDue+=out-incoming;required(c.trayDue>=0,'Saldo tray pihak menjadi negatif.');add(e,0);break;}
    if(mode==='sell'){const revenue=out*price,paid=positive(v.paid??revenue,'Dibayar');required(out>0&&incoming===0&&paid<=revenue,'Data penjualan tray tidak sesuai.');if(revenue>paid)required(c?.kind==='customer','Pilih customer untuk bon tray.');if(c)c.debt+=revenue-paid;invoices[e.id]={id:e.id,partyId:c?.id||'',revenue,paid,debt:revenue-paid,date:e.date,channel:v.channel||'offline',pay:v.pay||'cash',traySale:true};cashPost(e,paid,v.pay||'cash');add(e,revenue-out*tray.unitCost,revenue,out*tray.unitCost);break;}
    break;
   }
   case 'return':{
    const p=egg(v.productId),weight=positive(v.weight,'Berat retur'),direction=v.direction,resolution=v.resolution;
    required(weight>0,'Berat retur harus lebih dari nol.');required(['customer','supplier','internal'].includes(direction),'Arah retur tidak valid.');required(['none','refund','replace'].includes(resolution),'Penyelesaian retur tidak valid.');
    const c=v.partyId?owner(v.partyId):null;required(direction==='internal'||c?.kind===direction,'Pilih customer atau supplier yang sesuai retur.');
    let channel=v.channel||'shared';
    if(v.invoiceId){
      const i=invoices[v.invoiceId];required(direction==='customer'&&i&&!i.opening&&i.partyId===v.partyId&&i.productId===v.productId,'Nota penjualan asal retur tidak sesuai customer atau jenis telur.');
      returnedWeight[v.invoiceId]=(returnedWeight[v.invoiceId]||0)+weight;
      required(returnedWeight[v.invoiceId]<=i.weight,'Total berat retur melebihi berat pada nota asal.');channel=i.channel;
    }
    let loss=0;if(direction!=='customer')loss=takeFIFO(p,weight,ref).cost;
    const refund=positive(v.refund||0,'Nilai refund');
    if(c&&resolution==='refund'){required(refund>0,'Masukkan nilai penggantian uang.');c.refundDue+=refund;}
    if(c&&resolution==='replace')c.eggDue+=weight;
    if(c&&resolution!=='none')claims[e.id]={id:e.id,partyId:c.id,productId:v.productId,channel,direction,resolution,weight,refundDue:resolution==='refund'?refund:0,eggDue:resolution==='replace'?weight:0};
    // Retur customer: telur sudah berkurang saat penjualan; jangan dikurangi lagi.
    // Refund customer mengurangi laba ketika hak refund dicatat, bukan saat uang dibayar.
    const recognized=direction==='customer'&&resolution==='refund'?-refund:-loss;
    outcomes[e.id]={weight,recognized};add({...e,data:{...v,channel}},recognized,0,direction==='customer'?0:loss,direction==='customer'&&resolution==='refund'?refund:0);break;
   }
   case 'settlement':{
    const c=owner(v.partyId),amount=positive(v.amount||0,'Pembayaran/penggantian'),mode=v.mode;
    if(mode==='debt'){
      const i=invoices[v.invoiceId];required(i&&i.partyId===c.id,'Nota bon tidak ditemukan atau bukan milik customer ini.');required(amount>0&&i.debt>=amount,'Pembayaran melebihi sisa bon nota.');
      i.debt-=amount;i.paid+=amount;c.debt-=amount;outcomes[e.id]={invoiceId:v.invoiceId,amount};cashPost(e,amount,v.pay||'cash');add(e,0);break;
    }
    const claim=claims[v.claimId];
    required(claim&&claim.partyId===c.id,'Pilih retur yang belum diselesaikan milik customer/supplier ini.');
    required((mode==='refund'&&claim.resolution==='refund')||(mode==='egg'&&claim.resolution==='replace'),'Jenis penyelesaian tidak sesuai hak retur.');
    if(mode==='refund'){
      required(amount>0&&claim.refundDue>=amount,'Pengembalian uang melebihi sisa refund retur yang dipilih.');
      claim.refundDue-=amount;c.refundDue-=amount;
      // Refund supplier memulihkan rugi, refund customer sudah mengurangi laba pada tanggal retur.
      const profit=c.kind==='supplier'?amount:0;cashPost(e,c.kind==='supplier'?amount:-amount,v.pay||'cash');add({...e,data:{...v,channel:claim.channel}},profit,0,0,-profit);break;
    }
    if(mode==='egg'){
      const qty=positive(v.weight||0,'Berat pengganti');
      required(qty>0&&claim.eggDue>=qty,'Penggantian telur melebihi sisa retur yang dipilih.');
      required(v.productId===claim.productId,'Jenis telur pengganti harus sama dengan jenis telur yang diretur.');
      claim.eggDue-=qty;c.eggDue-=qty;
      if(c.kind==='supplier'){const p=egg(v.productId);p.lots.push({source:e.id,qty,initialQty:qty,unit:0,totalCost:0});add(e,0);}
      else {const cost=takeFIFO(egg(v.productId),qty,ref).cost;add({...e,data:{...v,channel:claim.channel}},-cost,0,cost);}
      break;
    }
    throw Error('Jenis penyelesaian tidak dikenali.');
   }
   case 'expense':{const amount=positive(v.amount,'Biaya usaha');required(amount>0,'Biaya wajib diisi.');cashPost(e,-amount,v.pay||'cash');add(e,-amount,0,0,amount);break;}
   case 'adjust':{
    if(v.productId){const p=egg(v.productId);const actual=positive(v.actual,'Stok fisik');const current=p.lots.reduce((a,l)=>a+l.qty,0);if(actual<current){const cost=takeFIFO(p,current-actual,ref).cost;add(e,-cost,0,cost);}else if(actual>current){p.lots.push({source:e.id,qty:actual-current,initialQty:actual-current,unit:positive(v.price||0,'Modal penyesuaian'),totalCost:Math.round((actual-current)*(v.price||0)/1000)});add(e,0);}else add(e,0);
    }else{tray.available=positive(v.trayAvailable,'Tray layak');tray.broken=positive(v.trayBroken||0,'Tray rusak');tray.unitCost=positive(v.trayCost||0,'Modal tray');add(e,0);}break;
   }
   default:throw Error('Jenis transaksi belum didukung: '+e.type);
  }
 }
 const stock={};for(const p of Object.values(products))stock[p.id]=p.lots.reduce((a,l)=>a+l.qty,0);
 return {products,contacts,invoices,claims,outcomes,tray,stock,period,cash,audit};
}
