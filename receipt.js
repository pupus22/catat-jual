// Invoice dibuat sebagai PNG sementara di browser; tidak diunggah ke Firebase.
const fmt=n=>Math.round(Number(n)||0).toLocaleString('id-ID');
const rp=n=>'Rp'+fmt(n);
const clean=v=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim();
function loadLogo(){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Logo Cangkang Mas tidak dapat dimuat.'));image.src='assets/logo.png';});}
export async function makeReceiptPNG(entry){
 if(entry?.type!=='sale')throw Error('Invoice hanya tersedia untuk transaksi penjualan.');
 const logo=await loadLogo();
 const W=1000,L=38,R=962,ink='#252c32',cream='#fff2cf',pale='#fff8e9',red='#df1726',gray='#30373b',bg='#fffefa';
 const n=v=>Number(v)||0,weight=n(entry.weight),price=n(entry.price),delivery=n(entry.delivery),out=n(entry.trayOut),bought=n(entry.trayBought),gross=n(entry.revenue);
 const shopee=entry.channel==='shopee',trayTotal=shopee?0:bought*n(entry.trayPrice),eggTotal=shopee?gross:Math.max(0,gross-delivery-trayTotal);
 const rows=[{name:'Telur '+clean(entry.productName||''),qty:fmt(weight)+' gram',price:shopee?'—':rp(price),sum:rp(eggTotal)}];
 if(out>0)rows.push({name:bought===out?'Tray (beli)':bought>0?'Tray (tukar + beli)':entry.trayMode==='loan'?'Tray (pinjam)':'Tray (tukar)',qty:fmt(out)+' pcs',price:bought&&!shopee?rp(entry.trayPrice):'—',sum:rp(trayTotal)});
 if(delivery>0&&!shopee)rows.push({name:'Ongkir',qty:'—',price:'—',sum:rp(delivery)});
 const debt=Math.max(0,n(entry.debt)),tableY=445,headH=62,rowH=70,tableEnd=tableY+headH+rows.length*rowH,totalY=tableEnd+34;
 const H=Math.max(1260,totalY+505+(debt?65:0)),footerY=H-286;
 const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');if(!x)throw Error('Browser tidak mendukung pembuatan invoice PNG.');
 x.fillStyle=bg;x.fillRect(0,0,W,H);
 function rect(a,b,w,h,color){x.fillStyle=color;x.fillRect(a,b,w,h);}
 function rounded(a,b,w,h,r,color){x.fillStyle=color;x.beginPath();x.roundRect(a,b,w,h,r);x.fill();}
 function text(s,px,py,size=19,bold=false,align='left',color=ink){x.save();x.fillStyle=color;x.textAlign=align;x.textBaseline='alphabetic';x.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;x.fillText(clean(s),px,py);x.restore();}
 function fit(s,px,py,maxW,size=19,bold=false,align='left',color=ink){x.save();x.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;const measured=x.measureText(clean(s)).width;x.restore();text(s,px,py,Math.max(11,Math.floor(size*Math.min(1,maxW/(measured||1)))),bold,align,color);}
 function logoAt(cx,top,w){const h=w*logo.height/logo.width;x.drawImage(logo,cx-w/2,top,w,h);return h;}
 // Header mengikuti contoh invoice: logo besar di kiri, judul di kanan, ruang antarbagian tertata.
 logoAt(317,45,520);fit('T E L U R   S E G A R   S E T I A P   H A R I',244,162,324,13);
 text('KEBRAON INDAH PERMAI D.38',L+22,210,20);text('SURABAYA',L+22,242,20);
 fit('0857-3192-9628 / 0813-5857-8824',L+22,278,515,20);
 rect(617,68,1,235,'#e1cba4');text('INVOICE',R-14,187,72,true,'right');
 const dt=clean(entry.date);let date=dt;if(/^\d{4}-\d{2}-\d{2}$/.test(dt)){const [y,m,d]=dt.split('-');date=`${d}-${m}-${y}`;}
 const invoice=clean(entry.invoiceNo||`INV-${dt.replace(/-/g,'')}-${clean(entry.id).slice(0,6).toUpperCase()}`);
 text('TANGGAL',645,257,17,true);fit(date||'—',R-14,257,197,18,false,'right');
 text('NO. INVOICE',645,291,17,true);fit(invoice,R-14,291,197,18,false,'right');
 rounded(L,323,500,88,7,pale);text('KEPADA:',L+24,356,20,true);fit(entry.partyName||'Pembeli umum',L+24,389,451,22);
 // Lima kolom bergrid untuk menjaga judul dan nilai tepat sejajar di seluruh ukuran gambar.
 const cuts=[L,126,444,611,799,R];rounded(L,tableY,R-L,headH+rowH*rows.length,6,cream);rect(L,tableY,R-L,headH,gray);
 const centers=cuts.slice(0,-1).map((v,i)=>(v+cuts[i+1])/2);
 text('No.',centers[0],tableY+41,20,true,'center','#fff');text('NAMA BARANG',cuts[1]+24,tableY+41,19,true,'left','#fff');
 text('QTY',centers[2],tableY+41,19,true,'center','#fff');text('HARGA',centers[3],tableY+41,19,true,'center','#fff');text('JUMLAH',centers[4],tableY+41,19,true,'center','#fff');
 rows.forEach((r,i)=>{const top=tableY+headH+i*rowH,y=top+44;if(i%2===1)rect(L,top,R-L,rowH,pale);text(String(i+1),centers[0],y,19,true,'center');fit(r.name,cuts[1]+24,y,cuts[2]-cuts[1]-38,20,true);fit(r.qty,centers[2],y,cuts[3]-cuts[2]-16,19,false,'center');fit(r.price,centers[3],y,cuts[4]-cuts[3]-16,19,false,'center');fit(r.sum,centers[4],y,cuts[5]-cuts[4]-16,19,false,'center');});
 rounded(523,totalY,439,82,7,red);rounded(523,totalY,160,82,7,cream);rect(677,totalY,8,82,red);text('TOTAL',549,totalY+53,27,true);fit(rp(gross),R-21,totalY+53,251,35,true,'right','#fff');
 if(debt>0){text('SISA BON',549,totalY+131,21,true);fit(rp(debt),R-21,totalY+131,251,26,true,'right','#b4232e');}
 // Dekorasi kurva yang tersisa di bagian bawah, tidak menutupi seluruh teks footer.
 x.save();x.fillStyle='#fff4e1';x.beginPath();x.moveTo(0,H-330);x.bezierCurveTo(80,H-260,85,H-190,140,H-130);x.bezierCurveTo(178,H-92,210,H-100,238,H);x.lineTo(0,H);x.closePath();x.fill();
 x.fillStyle='#f9e5c9';x.beginPath();x.moveTo(0,H-75);x.bezierCurveTo(260,H-132,425,H-42,635,H-81);x.bezierCurveTo(785,H-102,883,H-158,1000,H-145);x.lineTo(1000,H);x.lineTo(0,H);x.closePath();x.fill();
 x.fillStyle=red;x.beginPath();x.moveTo(640,H);x.bezierCurveTo(800,H-25,898,H-88,1000,H-88);x.lineTo(1000,H);x.closePath();x.fill();x.restore();
 text('Terima Kasih',W/2,footerY,26,false,'center');rect(W/2-46,footerY+20,92,2,red);
 logoAt(W/2,footerY+31,475);fit('T E L U R   S E G A R   S E T I A P   H A R I',W/2,footerY+150,338,13,false,'center');
 text('T H A N K   Y O U   F O R   Y O U R   B U S I N E S S !',W/2,footerY+211,15,false,'center');
 return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Gagal membuat invoice PNG.')),'image/png'));
}
export function receiptFilename(entry){return 'Invoice-Cangkang-Mas-'+clean(entry.date||'')+'-'+clean(entry.id||'').slice(0,8)+'.png';}
export function downloadReceipt(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
