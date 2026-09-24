// Invoice dibuat di browser sebagai PNG; file gambar tidak dikirim ke Firebase.
const fmt=n=>Math.round(Number(n)||0).toLocaleString('id-ID');
const rp=n=>'Rp'+fmt(n);
const clean=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim();
function loadLogo(){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Logo Cangkang Mas tidak dapat dimuat.'));im.src='assets/logo.png';});}
export async function makeReceiptPNG(entry){
 if(entry?.type!=='sale')throw Error('Invoice hanya tersedia untuk transaksi penjualan.');
 const logo=await loadLogo();
 const W=1000,L=42,R=958,ink='#222a30',cream='#fff2cd',pale='#fff8e8',red='#e31e2c',gray='#33383b',bg='#fffdf6';
 const num=v=>Number(v)||0,weight=num(entry.weight),price=num(entry.price),delivery=num(entry.delivery),out=num(entry.trayOut),bought=num(entry.trayBought);
 const shopee=entry.channel==='shopee',trayTotal=shopee?0:bought*num(entry.trayPrice),gross=num(entry.revenue);
 const eggTotal=shopee?gross:Math.max(0,gross-delivery-trayTotal);
 const rows=[{name:'Telur '+clean(entry.productName||''),qty:fmt(weight)+' gram',price:shopee?'—':rp(price),sum:rp(eggTotal)}];
 if(out>0)rows.push({name:bought===out?'Tray (beli)':bought>0?'Tray (tukar + beli)':entry.trayMode==='loan'?'Tray (pinjam)':'Tray (tukar)',qty:fmt(out)+' pcs',price:bought&&!shopee?rp(entry.trayPrice):'—',sum:rp(trayTotal)});
 if(delivery>0&&!shopee)rows.push({name:'Ongkir',qty:'—',price:'—',sum:rp(delivery)});
 const debt=Math.max(0,num(entry.debt)),headY=432,rowH=68,tableBottom=headY+60+rowH*rows.length,totalY=tableBottom+36;
 // Tinggi bertambah mengikuti jumlah baris; footer selalu utuh dengan jarak bawah aman.
 const footerY=totalY+116+(debt?54:0),footerBottom=footerY+176,H=footerBottom+64;
 const c=document.createElement('canvas');c.width=W;c.height=H;
 const x=c.getContext('2d');if(!x)throw Error('Browser tidak mendukung pembuatan invoice PNG.');
 x.fillStyle=bg;x.fillRect(0,0,W,H);
 function text(s,px,py,size=19,bold=false,align='left',color=ink){x.save();x.fillStyle=color;x.textAlign=align;x.textBaseline='alphabetic';x.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;x.fillText(clean(s),px,py);x.restore();}
 function fit(s,px,py,maxW,size=19,bold=false,align='left',color=ink){x.save();x.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;const w=x.measureText(clean(s)).width;x.restore();text(s,px,py,Math.max(11,Math.floor(size*Math.min(1,maxW/(w||1)))),bold,align,color);}
 function imgAt(cx,top,w){const h=w*logo.height/logo.width;x.drawImage(logo,cx-w/2,top,w,h);return h;}
 function rect(px,py,w,h,color){x.fillStyle=color;x.fillRect(px,py,w,h);}
 function rounded(px,py,w,h,r,color){x.fillStyle=color;x.beginPath();x.roundRect(px,py,w,h,r);x.fill();}
 // Header dua kolom; tipografi sans-serif yang sama pada seluruh nota.
 const logoH=imgAt(254,34,432);
 text('TELUR SEGAR SETIAP HARI',L+20,logoH+62,13,false,'left','#56616a');
 text('KEBRAON INDAH PERMAI D.38',L+20,logoH+99,18);
 text('SURABAYA',L+20,logoH+127,18);
 fit('0857-3192-9628 / 0813-5857-8824',L+20,logoH+155,435,18);
 rect(590,54,2,217,'#e4d5b6');
 text('INVOICE',R-5,123,65,true,'right',ink);
 const dt=clean(entry.date);let shownDate=dt;if(/^\d{4}-\d{2}-\d{2}$/.test(dt)){const [y,m,d]=dt.split('-');shownDate=`${d}-${m}-${y}`;}
 const invoice=clean(entry.invoiceNo||`INV-${dt.replace(/-/g,'')}-${clean(entry.id).slice(0,6).toUpperCase()}`);
 text('TANGGAL',628,216,17,true);fit(shownDate||'—',R-5,216,207,18,false,'right');
 text('NO. INVOICE',628,249,17,true);fit(invoice,R-5,249,207,18,false,'right');
 rounded(L,322,482,83,7,pale);text('KEPADA:',L+20,354,18,true);fit(entry.partyName||'Pembeli umum',L+20,386,434,21);
 // Daftar barang hanya teks, tidak ada ikon atau gambar produk.
 rounded(L,headY,R-L,60+rows.length*rowH,5,cream);rect(L,headY,R-L,60,gray);
 text('NAMA BARANG',L+18,headY+39,20,true,'left','#fff');text('QTY',L+520,headY+39,19,true,'center','#fff');text('HARGA',L+702,headY+39,19,true,'center','#fff');text('JUMLAH',R-15,headY+39,19,true,'right','#fff');
 rows.forEach((r,i)=>{const y=headY+60+i*rowH;if(i%2)rect(L,y,R-L,rowH,bg);fit(r.name,L+18,y+43,360,21,true);fit(r.qty,L+520,y+43,152,19,false,'center');fit(r.price,L+787,y+43,153,19,false,'right');fit(r.sum,R-15,y+43,143,19,false,'right');});
 // Satu kotak TOTAL saja; BON hanya jika ada sisa tagihan.
 rounded(532,totalY,426,74,8,red);rounded(532,totalY,162,74,8,cream);rect(687,totalY,8,74,red);
 text('TOTAL',554,totalY+47,27,true);fit(rp(gross),R-17,totalY+47,246,30,true,'right','#fff');
 if(debt>0){text('SISA BON',553,totalY+117,21,true);fit(rp(debt),R-17,totalY+117,255,24,true,'right','#b4232e');}
 // Ornamen krem ringan mengikuti palet tanpa memotong footer.
 x.save();x.strokeStyle='#f4e5cc';x.lineWidth=2;x.beginPath();x.moveTo(L,footerBottom+15);x.quadraticCurveTo(W/2,footerBottom+36,R,footerBottom+15);x.stroke();x.restore();
 text('Terima Kasih',W/2,footerY+23,22,false,'center');
 const fH=imgAt(W/2,footerY+38,380);
 text('THANK YOU FOR YOUR BUSINESS!',W/2,footerY+38+fH+27,16,false,'center','#555f67');
 return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Gagal membuat invoice PNG.')),'image/png'));
}
export function receiptFilename(entry){return 'Invoice-Cangkang-Mas-'+clean(entry.date||'')+'-'+clean(entry.id||'').slice(0,8)+'.png';}
export function downloadReceipt(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
