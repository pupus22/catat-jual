const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
let source=fs.readFileSync(__dirname+'/app.js','utf8');
source=source.replace(/^import .*;\n/gm,'').replace(/startApp\(\)\.catch\(err=>\{showLogin\([\s\S]*?\}\);\s*$/,'');
const values={},docs=new Map(),forms={saleForm:{dataset:{}},purchaseForm:{dataset:{}},settleForm:{dataset:{}}};
let serial=0;
const el=id=>{if(forms[id])return forms[id];if(!values[id])values[id]={value:'',checked:false,hidden:false,dataset:{},textContent:'',classList:{toggle(){}},addEventListener(){},querySelectorAll(){return []},closest(){return {hidden:false}},isConnected:true};return values[id]};
function ref(...parts){let id=parts[0]?.path?parts[0].path+'/'+(parts[1]||'auto-'+ ++serial):parts.slice(1).join('/');return {path:id,id:id.split('/').pop()};}
const context={console,crypto,document:{getElementById:el,querySelectorAll:()=>[],createElement(){return {};}},window:{addEventListener(){},scrollTo(){}},Date,Number,Promise,setTimeout,clearTimeout,Event:class Event{constructor(type){this.type=type}},Intl, navigator:{},confirm(){return true},URL,Blob,File:class File{},collection:(...p)=>ref(...p),doc:(...p)=>ref(...p),runTransaction:async(db,work)=>{
 const operations=[];const tx={get:async r=>{const entry=docs.get(r.path);return {exists:()=>entry!==undefined,data:()=>entry===undefined?undefined:structuredClone(entry)}} ,set:(r,d)=>operations.push(['set',r.path,structuredClone(d)]),update:(r,d)=>operations.push(['update',r.path,structuredClone(d)])};
 const result=await work(tx);
 for(const [op,path,d] of operations){if(op==='update'){assert(docs.has(path),'update missing '+path);docs.set(path,{...docs.get(path),...d});}else docs.set(path,d)}return result;
 }};
vm.createContext(context);
vm.runInContext(source+'\nglobalThis.TEST={recordPurchase,recordSale,recordSettlement,costFIFO,stock, num, setState:x=>{state=x}, setAuth:x=>{auth=x; db={}},entryRef, state:()=>state};',context);
const t=context.TEST;t.setAuth({currentUser:{uid:'owner'}});
const path=(col,id)=>`users/owner/${col}/${id}`;
function put(col,id,obj){docs.set(path(col,id),structuredClone(obj));}
function input(fields){for(const [k,v] of Object.entries(fields))el(k).value=String(v)}
let checks=0;function check(desc,fn){fn();checks++;console.log('PASS '+desc)}
put('products','horn',{name:'HORN',lots:[]});put('contacts','supplier',{name:'Supplier',kind:'supplier',trayDue:0,debt:0});put('contacts','customer',{name:'Customer',kind:'customer',trayDue:0,debt:0});put('meta','tray',{available:8,broken:0,unitCost:1000});
t.setState({products:[{id:'horn',name:'HORN',lots:[]}],contacts:[{id:'supplier',name:'Supplier',kind:'supplier',trayDue:0,debt:0},{id:'customer',name:'Customer',kind:'customer',trayDue:0,debt:0}],entries:[],tray:{available:8,broken:0,unitCost:1000}});
(async()=>{
 input({bProduct:'horn',bSupplier:'supplier',bBundle:10000,bCount:1,bActual:'',bPrice:23500,bTrayOut:8,bTrayIn:8,bTrayBought:0,bTrayPrice:0,bCost:0,bDate:'2026-09-24',bNote:''});el('bActualSwitch').checked=false;
 await t.recordPurchase();check('kulak FIFO 10.000 gram',()=>assert.equal(docs.get(path('products','horn')).lots[0].qty,10000));
 check('tukar tray 8 untuk 8 tidak mengubah stok fisik',()=>assert.equal(docs.get(path('meta','tray')).available,8));
 await t.recordPurchase();check('retry kulak tidak menduplikasi stok',()=>assert.equal(docs.get(path('products','horn')).lots[0].qty,10000));
 const purchaseEntries=[...docs].filter(([k,v])=>k.includes('/entries/')&&v.type==='purchase');check('retry kulak hanya 1 entri',()=>assert.equal(purchaseEntries.length,1));
 input({sProduct:'horn',sCustomer:'customer',sWeight:2000,sPrice:25000,sChannel:'offline',sTrayMode:'swap',sTrayOut:2,sTrayIn:2,sTrayBuy:0,sTrayPrice:0,sDelivery:0,sCost:0,sPay:'credit',sPaid:10000,sNote:''});
 await t.recordSale(); const sales=[...docs].filter(([k,v])=>k.includes('/entries/')&&v.type==='sale');let [salePath,sale]=sales[0];
 check('penjualan 2.000 gram menyisakan 8.000 gram',()=>assert.equal(docs.get(path('products','horn')).lots[0].qty,8000));
 check('bon nota penjualan Rp40.000',()=>assert.equal(sale.debt,40000));
 await t.recordSale();check('retry penjualan tanpa stok/bon ganda',()=>{assert.equal(docs.get(path('products','horn')).lots[0].qty,8000);assert.equal(docs.get(path('contacts','customer')).debt,40000)});
 // replicate onSnapshot state update
 t.setState({products:[{id:'horn',...docs.get(path('products','horn'))}],contacts:[{id:'customer',...docs.get(path('contacts','customer'))}],entries:[{id:salePath.split('/').pop(),...docs.get(salePath)}],tray:docs.get(path('meta','tray'))});
 input({qMode:'debt',qAmount:15000,qInvoice:salePath.split('/').pop(),qPay:'transfer',qProduct:'horn',qNote:''});
 await t.recordSettlement('customer');check('cicilan mengurangi nota yang tepat',()=>{assert.equal(docs.get(salePath).paid,25000);assert.equal(docs.get(salePath).debt,25000)});
 check('cicilan mengurangi bon customer tetapi bukan omzet baru',()=>{assert.equal(docs.get(path('contacts','customer')).debt,25000);const s=[...docs.values()].find(v=>v.type==='settlement');assert.equal(s.profit,0);assert.equal(s.invoiceId,salePath.split('/').pop())});
 await t.recordSettlement('customer');check('retry cicilan tidak membuat pembayaran kedua',()=>assert.equal(docs.get(salePath).debt,25000));
 check('format angka Indonesia: titik ribuan, tanpa desimal',()=>{assert.equal(t.num('1.500'),1500);assert.equal(t.num('25.000'),25000);assert.throws(()=>t.num('1,500'))});
 console.log('TOTAL '+checks+' PASS / '+checks+' TESTS');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});
