// Nota PNG dibuat di browser dari data transaksi; TIDAK dikirim ke Firebase.
const idFmt = n => Math.round(Number(n)||0).toLocaleString('id-ID');
const idRupiah = n => 'Rp' + idFmt(n);
const clean = value => String(value ?? '').replace(/[\u0000-\u001f]/g,' ').trim();
function loadLogo(){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Logo nota tidak dapat dimuat.'));image.src='assets/logo.png';});}
export async function makeReceiptPNG(entry){
  if(entry?.type!=='sale') throw new Error('Nota penjualan hanya tersedia untuk transaksi jual telur.');
  const logo=await loadLogo();
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1460;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Browser tidak mendukung pembuatan nota gambar.');
  const W=1000, L=65,R=935;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,W,canvas.height);
  const ink='#15191e',red='#b42327',green='#086229';
  function line(y,color='#7c8289',dash=[]){ctx.save();ctx.beginPath();ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke();ctx.restore()}
  function text(value,x,y,size=24,weight=400,align='left',color=ink,font='Arial, sans-serif'){
    ctx.save();ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(clean(value),x,y);ctx.restore();
  }
  function fit(value,x,y,maxWidth,size=24,weight=400,align='left',color=ink){
    ctx.save();ctx.font=`${weight} ${size}px Arial, sans-serif`;const width=ctx.measureText(clean(value)).width;ctx.restore();text(value,x,y,Math.max(15,Math.floor(size*Math.min(1,maxWidth/(width||1)))),weight,align,color);
  }
  // Logo resmi Cangkang Mas (aset aplikasi) di atas, sama seperti desain disetujui.
  const logoWidth=680,logoHeight=logoWidth*logo.height/logo.width;
  ctx.drawImage(logo,(W-logoWidth)/2,56,logoWidth,logoHeight);
  text('Telur Fresh Siap Angkut',W/2,305,22,400,'center');
  line(344,'#69717b',[9,7]);
  text('NOTA PENJUALAN',W/2,410,43,750,'center');
  const timestamp=clean(entry.date||'');let date=timestamp;
  if(/^\d{4}-\d{2}-\d{2}$/.test(timestamp)){const [yy,mm,dd]=timestamp.split('-');date=`${dd}-${mm}-${yy}`}
  const invoice=clean(entry.invoiceNo||`INV-${timestamp.replace(/-/g,'')}-${clean(entry.id||'').slice(0,6).toUpperCase()}`);
  const method={cash:'Tunai',transfer:'Transfer',qris:'QRIS',credit:'Bon / cicilan'}[entry.pay]||(entry.channel==='shopee'?'Shopee':clean(entry.pay||'—'));
  const labels=[['No',invoice],['Tanggal',date||'—'],['Customer',clean(entry.partyName||'Pembeli umum')],['Metode',method]];
  labels.forEach(([label,value],i)=>{const y=456+i*34;text(label,L+10,y,23,400);text(':',L+164,y,23,400);fit(value,L+190,y,R-L-210,23,400)});
  const tableTop=593;
  ctx.fillStyle='#eff0f2';ctx.beginPath();ctx.roundRect(L,tableTop,R-L,45,5);ctx.fill();
  text('No.',L+15,tableTop+30,22,700);text('Nama Barang',L+102,tableTop+30,22,700);
  text('Qty',L+465,tableTop+30,22,700);text('Harga',L+655,tableTop+30,22,700);
  text('Subtotal',R-8,tableTop+30,22,700,'right');
  const rows=[];
  const weight=Number(entry.weight)||0,price=Number(entry.price)||0,delivery=Number(entry.delivery)||0;
  const trayBought=Number(entry.trayBought)||0,trayOut=Number(entry.trayOut)||0,trayIn=Number(entry.trayIn)||0;
  const isShopee=entry.channel==='shopee';
  const trayCost=isShopee?0:trayBought*(Number(entry.trayPrice)||0);
  const eggTotal=isShopee?Math.max(0,Number(entry.eggRevenue)||0):Math.max(0,(Number(entry.eggRevenue)||0)-delivery);
  rows.push({name:`Telur ${clean(entry.productName||'')}`,qty:`${idFmt(weight)} gram`,price:isShopee?'—':idRupiah(price),subtotal:idRupiah(eggTotal)});
  if(trayOut>0)rows.push({name:trayBought===trayOut?'Tray (beli)':trayBought>0?'Tray (tukar + beli)':entry.trayMode==='loan'?'Tray (pinjam)':'Tray (tukar)',qty:`${idFmt(trayOut)} pcs`,price:trayBought&&!isShopee?idRupiah(entry.trayPrice):'—',subtotal:idRupiah(trayCost)});
  if(delivery>0) rows.push({name:'Ongkir',qty:'—',price:'—',subtotal:idRupiah(delivery)});
  // Penerimaan bersih Shopee sudah menjadi total baris telur; jangan tampilkan lagi sebagai baris kedua.
  let y=680;
  rows.forEach((row,i)=>{
    text(String(i+1),L+20,y,22);
    fit(row.name,L+102,y,285,22);
    fit(row.qty,L+465,y,158,21);
    fit(row.price,L+655,y,125,20);
    text(row.subtotal,R-8,y,22,400,'right');
    if(i!==rows.length-1)line(y+21,'#c6c9ce',[7,5]);
    y+=57;
  });
  // Penghasilan Shopee sudah bersih; bukan baris ekstra di luar total.
  const tableBottom=Math.max(850,y+10);line(tableBottom,'#35383d');
  const total=Math.round(Number(entry.revenue)||0),paid=Math.round(Number(entry.paid)||0);
  const debt=Math.max(0,Math.round(Number(entry.debt)||0));
  const moneyLabelX=525,amountX=R-8;
  text('Total Tagihan',moneyLabelX,tableBottom+56,26,700);
  text(idRupiah(total),amountX,tableBottom+56,33,700,'right');
  text('Dibayar',moneyLabelX,tableBottom+99,24);
  text(idRupiah(paid),amountX,tableBottom+99,27,400,'right');
  if(debt>0){
    text('Sisa Bon',moneyLabelX,tableBottom+144,27,700);
    text(idRupiah(debt),amountX,tableBottom+144,33,700,'right',red);
  }
  const separator=tableBottom+(debt>0?172:124);line(separator,'#41454b');
  const stampY=separator+67;
  const stampText=debt>0?'BON BELUM LUNAS':'LUNAS',stampColor=debt>0?red:green;
  ctx.save();ctx.strokeStyle=stampColor;ctx.lineWidth=3;ctx.fillStyle=debt>0?'#fff4f4':'#f2faf5';ctx.beginPath();ctx.roundRect(debt>0?245:365,stampY-43,debt>0?510:270,85,12);ctx.fill();ctx.stroke();ctx.restore();
  text(stampText,W/2,stampY+16,debt>0?38:50,750,'center',stampColor);
  const footer=Math.max(stampY+155,canvas.height-155);
  line(footer,'#69717b',[9,7]);
  text('Terima kasih',W/2,footer+72,38,400,'center',ink,'Georgia, serif');
  text('Cangkang Mas',W/2,footer+108,25,700,'center');
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Gagal membuat gambar nota.')),'image/png'));
}
export function receiptFilename(entry){return 'Nota-Cangkang-Mas-'+clean(entry.date||'')+'-'+clean(entry.id||'').slice(0,8)+'.png'}
export function downloadReceipt(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
