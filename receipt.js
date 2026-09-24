// Nota PNG dibuat hanya di browser, tidak diunggah ke Firebase.
const fmt=n=>Math.round(Number(n)||0).toLocaleString('id-ID');
const rp=n=>'Rp'+fmt(n);
const clean=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim();
function loadLogo(){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Logo Cangkang Mas tidak dapat dimuat.'));im.src='assets/logo.png';});}
export async function makeReceiptPNG(entry){
 if(entry?.type!=='sale')throw Error('Invoice hanya tersedia untuk transaksi penjualan.');
 const im=await loadLogo(), W=1000, L=54, R=946, bg='#fffbee',cream='#fff1c8',ink='#30343a',gray='#424242';
 const v=Number, weight=v(entry.weight)||0, price=v(entry.price)||0, delivery=v(entry.delivery)||0, out=v(entry.trayOut)||0,bought=v(entry.trayBought)||0;
 const shopee=entry.channel==='shopee',trayTotal=shopee?0:bought*(v(entry.trayPrice)||0),gross=v(entry.revenue)||0;
 const eggTotal=shopee?gross:Math.max(0,gross-delivery-trayTotal);
 const rows=[{name:'Telur '+clean(entry.productName||''),qty:fmt(weight)+' gram',price:shopee?'—':rp(price),sum:rp(eggTotal)}];
 if(out>0)rows.push({name:bought===out?'Tray (beli)':bought>0?'Tray (tukar + beli)':entry.trayMode==='loan'?'Tray (pinjam)':'Tray (tukar)',qty:fmt(out)+' pcs',price:bought&&!shopee?rp(entry.trayPrice):'—',sum:rp(trayTotal)});
 if(delivery>0&&!shopee)rows.push({name:'Ongkir',qty:'—',price:'—',sum:rp(delivery)});
 const debt=Math.max(0,v(entry.debt)||0),tTop=355,rowH=62,tableBottom=tTop+48+rows.length*rowH;
 const totalY=tableBottom+38, footerY=totalY+90+(debt>0?46:0),H=footerY+154;
 const c=document.createElement('canvas');c.width=W;c.height=H;
 const x=c.getContext('2d');if(!x)throw Error('Browser tidak mendukung pembuatan nota PNG.');
 x.fillStyle=bg;x.fillRect(0,0,W,H);x.fillStyle=cream;x.fillRect(0,0,493,312);
 function txt(s,px,py,size=19,bold=false,align='left',color=ink,font='Arial, sans-serif'){
  x.save();x.textBaseline='alphabetic';x.textAlign=align;x.fillStyle=color;x.font=`${bold?'700':'400'} ${size}px ${font}`;x.fillText(clean(s),px,py);x.restore();
 }
 function fit(s,px,py,maxW,size=19,bold=false,align='left',color=ink){x.save();x.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;const w=x.measureText(clean(s)).width;x.restore();txt(s,px,py,Math.max(11,Math.floor(size*Math.min(1,maxW/(w||1)))),bold,align,color);}
 function rule(y,l=605,r=R){x.fillStyle='#646464';x.fillRect(l,y,r-l,1.5);}
 // Logo diperbesar. Header tetap mempertahankan template krem tanpa ikon produk.
 const logoW=430,logoH=logoW*im.height/im.width;x.drawImage(im,46,27,logoW,logoH);
 txt('KEBRAON INDAH PERMAI D.38',61,177,18);txt('SURABAYA',61,202,18);
 fit('0857-3192-9628 / 0813-5857-8824',61,228,395,18);
 txt('KEPADA:',61,267,18,true);fit(entry.partyName||'Pembeli umum',61,297,400,21);
 txt('INVOICE',R,106,61,true,'right',ink,'Georgia, serif');
 const dt=clean(entry.date);let shownDate=dt;if(/^\d{4}-\d{2}-\d{2}$/.test(dt)){const [y,m,d]=dt.split('-');shownDate=`${d}-${m}-${y}`;}
 const invoice=clean(entry.invoiceNo||`INV-${dt.replace(/-/g,'')}-${clean(entry.id).slice(0,6).toUpperCase()}`);
 txt('DATE',625,205,18,true);fit(shownDate||'—',R,205,225,18,false,'right');
 txt('INVOICE #',625,235,18,true);fit(invoice,R,235,225,18,false,'right');
 x.fillStyle=gray;x.fillRect(L,tTop,R-L,48);
 txt('NAMA BARANG',L+15,tTop+32,19,true,'left','#fff');txt('QTY',L+480,tTop+32,19,true,'center','#fff');
 txt('HARGA',L+673,tTop+32,19,true,'center','#fff');txt('JUMLAH',R-13,tTop+32,19,true,'right','#fff');
 rows.forEach((r,i)=>{const top=tTop+48+i*rowH;x.fillStyle=i%2?bg:cream;x.fillRect(L,top,R-L,rowH);
 fit(r.name,L+15,top+40,360,21,true);fit(r.qty,L+480,top+40,145,19,false,'center');
 fit(r.price,L+766,top+40,145,18,false,'right');fit(r.sum,R-13,top+40,145,19,false,'right');});
 x.fillStyle=gray;x.fillRect(605,totalY,R-605,55);txt('TOTAL',620,totalY+36,22,true,'left','#fff');txt(rp(gross),R-13,totalY+36,25,true,'right','#fff');
 if(debt>0){txt('SISA BON',620,totalY+94,18,true);txt(rp(debt),R-13,totalY+94,21,true,'right','#bb2731');}
 // Footer mengikuti isi: tidak ada ruang kosong sebesar satu halaman A4.
 txt('Terima Kasih',W/2,footerY+30,19,false,'center');
 const footW=300,footH=footW*im.height/im.width;x.drawImage(im,(W-footW)/2,footerY+40,footW,footH);
 txt('THANK YOU FOR YOUR BUSINESS!',W/2,footerY+40+footH+23,15,false,'center');
 return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Gagal membuat invoice PNG.')),'image/png'));
}
export function receiptFilename(entry){return 'Invoice-Cangkang-Mas-'+clean(entry.date||'')+'-'+clean(entry.id||'').slice(0,8)+'.png';}
export function downloadReceipt(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
