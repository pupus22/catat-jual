// Invoice PNG dibuat hanya di browser; file gambar tidak dikirim atau disimpan di Firebase.
const fmt = n => Math.round(Number(n) || 0).toLocaleString('id-ID');
const rupiah = n => 'Rp' + fmt(n);
const clean = v => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim();
const logo = () => new Promise((resolve, reject) => {const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error('Logo Cangkang Mas gagal dimuat.')); im.src = 'assets/logo.png';});

export async function makeReceiptPNG(entry) {
  if (entry?.type !== 'sale') throw new Error('Nota hanya tersedia untuk transaksi penjualan.');
  const im = await logo();
  const W = 1000, H = 1230, L = 53, R = 947;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); if (!x) throw new Error('Browser tidak mendukung pembuatan nota PNG.');
  const bg = '#fffbee', pale = '#f8edc4', ink = '#30343a', gray = '#424242';
  x.fillStyle = bg; x.fillRect(0,0,W,H);
  x.fillStyle = pale; x.fillRect(0,0,485,380);
  function txt(s,px,py,size=20,bold=false,align='left',color=ink,font='Arial, sans-serif') {
    x.save();x.textBaseline='alphabetic';x.textAlign=align;x.fillStyle=color;
    x.font=`${bold ? '700' : '400'} ${size}px ${font}`;x.fillText(clean(s),px,py);x.restore();
  }
  function fit(s,px,py,width,size=20,bold=false,align='left',color=ink) {
    x.save();x.font=`${bold?'700':'400'} ${size}px Arial, sans-serif`;
    const actual=x.measureText(clean(s)).width;x.restore();
    txt(s,px,py,Math.max(12,Math.floor(size*Math.min(1,width/(actual||1)))),bold,align,color);
  }
  function rule(y,left=L,right=R,color='#6d6d6d',weight=1.5){x.fillStyle=color;x.fillRect(left,y,right-left,weight)}
  // Header mengikuti template invoice: logo resmi saja, tanpa gambar produk atau ikon.
  const logoW=400,logoH=logoW*im.height/im.width;
  x.drawImage(im,62,34,logoW,logoH);
  txt('KEBRAON INDAH PERMAI D.38',62,193,18);
  txt('SURABAYA',62,220,18);
  txt('0857-3192-9628 / 0813-5857-8824',62,247,18);
  txt('INVOICE',R,115,61,true,'right',ink,'Georgia, serif');
  const dt=clean(entry.date);let shownDate=dt;
  if(/^\d{4}-\d{2}-\d{2}$/.test(dt)){const [year,month,day]=dt.split('-');shownDate=`${day}-${month}-${year}`;}
  const invoice=clean(entry.invoiceNo||`INV-${dt.replace(/-/g,'')}-${clean(entry.id).slice(0,6).toUpperCase()}`);
  txt('DATE',652,231,18,true);fit(shownDate||'—',R,231,210,18,false,'right');
  txt('INVOICE #',652,262,18,true);fit(invoice,R,262,210,18,false,'right');
  txt('KEPADA:',62,304,20,true);fit(entry.partyName||'Pembeli umum',62,338,420,23);
  const weight=Number(entry.weight)||0,price=Number(entry.price)||0,delivery=Number(entry.delivery)||0;
  const out=Number(entry.trayOut)||0,bought=Number(entry.trayBought)||0;
  const shopee=entry.channel==='shopee';const trayTotal=shopee?0:bought*(Number(entry.trayPrice)||0);
  const gross=Number(entry.revenue)||0;
  // Pada non-Shopee total transaksi mencakup ongkir dan tray. Shopee: penerimaan bersih sudah totalnya.
  const eggTotal=shopee?gross:Math.max(0,gross-delivery-trayTotal);
  const rows=[{name:`Telur ${clean(entry.productName||'')}`,qty:`${fmt(weight)} gram`,price:shopee?'—':rupiah(price),sum:rupiah(eggTotal)}];
  if(out>0) rows.push({name:bought===out?'Tray (beli)':bought>0?'Tray (tukar + beli)':entry.trayMode==='loan'?'Tray (pinjam)':'Tray (tukar)',qty:`${fmt(out)} pcs`,price:bought&&!shopee?rupiah(entry.trayPrice):'—',sum:rupiah(trayTotal)});
  if(delivery>0&&!shopee)rows.push({name:'Ongkir',qty:'—',price:'—',sum:rupiah(delivery)});
  const tTop=428,headH=47,rowH=65;
  x.fillStyle=gray;x.fillRect(L,tTop,R-L,headH);
  txt('NAMA BARANG',L+16,tTop+32,20,true,'left','#fff');
  txt('QTY',L+485,tTop+32,20,true,'center','#fff');
  txt('HARGA',L+687,tTop+32,20,true,'center','#fff');
  txt('JUMLAH',R-15,tTop+32,20,true,'right','#fff');
  rows.forEach((r,i)=>{
    const top=tTop+headH+i*rowH;x.fillStyle=i%2===0?pale:'#fffbee';x.fillRect(L,top,R-L,rowH);
    fit(r.name,L+16,top+40,353,21,true);
    fit(r.qty,L+485,top+40,130,20,false,'center');
    fit(r.price,L+775,top+40,160,20,false,'right');
    fit(r.sum,R-15,top+40,155,20,false,'right');
  });
  const paid=Math.max(0,Number(entry.paid)||0),debt=Math.max(0,Number(entry.debt)||0);
  let sy=tTop+headH+rows.length*rowH+36;
  rule(sy,620);txt('TOTAL TAGIHAN',640,sy+36,19,true);txt(rupiah(gross),R-10,sy+36,22,true,'right');
  rule(sy+50,620);txt('DIBAYAR',640,sy+85,19,true);txt(rupiah(paid),R-10,sy+85,22,false,'right');
  if(debt>0){rule(sy+99,620);txt('SISA BON',640,sy+135,19,true);txt(rupiah(debt),R-10,sy+135,22,true,'right','#bd2029');sy+=50;}
  x.fillStyle=gray;x.fillRect(620,sy+104,R-620,54);
  txt('TOTAL',636,sy+141,22,true,'left','#fff');txt(rupiah(gross),R-15,sy+141,24,true,'right','#fff');
  // Status BON hanya terlihat apabila ada sisa tagihan.
  if(debt>0){txt('BON BELUM LUNAS',R-15,sy+195,22,true,'right','#bd2029');}
  else{txt('LUNAS',R-15,sy+195,22,true,'right','#11653e');}
  txt('Terima Kasih',W/2,1088,21,false,'center');
  const footW=340,footH=footW*im.height/im.width;x.drawImage(im,(W-footW)/2,1100,footW,footH);
  txt('THANK YOU FOR YOUR BUSINESS!',W/2,1192,17,false,'center');
  return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Gagal membuat gambar invoice.')),'image/png'));
}
export function receiptFilename(entry){return 'Invoice-Cangkang-Mas-'+clean(entry.date||'')+'-'+clean(entry.id||'').slice(0,8)+'.png';}
export function downloadReceipt(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
