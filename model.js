(function(root){
'use strict';
const SOLAR=[0,0,0,0,0,.02,.12,.30,.52,.70,.84,.94,1,.96,.83,.65,.43,.22,.06,0,0,0,0,0];
const MODES={'diesel':'Diesel–Solar–BESS','on-grid':'On-grid solar','off-grid':'Off-grid solar + battery',hybrid:'Hybrid solar + battery + grid'};
const STRATEGIES={economic:'Fuel-led hourly dispatch','day-min':'Daytime minimum generators',reliability:'Battery reserve'};
const defaults=()=>({name:'New energy project',mode:'diesel',strategy:'economic',dayLoad:220,nightLoad:120,voltage:400,phase:3,pf:.9,pv:300,pvLoss:12,pvInverter:300,combinedLimit:500,battery:500,chargeLimit:200,dischargeLimit:200,batteryVoltage:512,chargeAmps:450,dischargeAmps:450,initialSoc:60,minSoc:20,maxSoc:95,reserveSoc:50,efficiency:90,gridImport:300,gridExport:100,exportAllowed:true,outage:false,outageStart:18,outageDuration:4,buy:150,sell:0,dieselPrice:850,cycling:15,pvVoltage:600,pvEfficiency:97,profile:null,generators:[{name:'DG 1',enabled:true,kw:250,kva:312.5,max:250,derating:100,min:30,amps:500,intercept:7,slope:.24,start:0,end:0,forceDay:true},{name:'DG 2',enabled:true,kw:150,kva:187.5,max:150,derating:100,min:30,amps:300,intercept:5,slope:.26,start:0,end:0,forceDay:false}]});
const ac=(kw,c)=>Math.abs(kw)*1000/((c.phase===3?Math.sqrt(3):1)*c.voltage*c.pf);
const kwFromAmps=(a,c)=>a*(c.phase===3?Math.sqrt(3):1)*c.voltage*c.pf/1000;
const genCap=(g,c)=>Math.min(g.kw*g.derating/100,g.max,g.kva*c.pf,g.amps===0?Infinity:kwFromAmps(g.amps,c));
const available=(g,h)=>g.enabled&&(g.start===g.end||(g.start<g.end?h>=g.start&&h<g.end:h>=g.start||h<g.end));
function validate(c){
 const errors=[];if(!c||typeof c!=='object')return ['Invalid project settings.'];for(const key of ['exportAllowed','outage'])if(typeof c[key]!=='boolean')errors.push('Invalid switch: '+key);const positive=['voltage','pf','batteryVoltage','pvVoltage','pvEfficiency','efficiency'];
 for(const k of ['dayLoad','nightLoad','pv','pvLoss','pvInverter','combinedLimit','battery','chargeLimit','dischargeLimit','chargeAmps','dischargeAmps','initialSoc','minSoc','maxSoc','reserveSoc','gridImport','gridExport','outageStart','outageDuration','buy','sell','dieselPrice','cycling',...positive])if(!Number.isFinite(c[k])||c[k]<0||(positive.includes(k)&&c[k]===0))errors.push('Invalid value: '+k+'.');
 if(!MODES[c.mode]||!STRATEGIES[c.strategy]||![1,3].includes(c.phase))errors.push('Invalid system, strategy or phase.');
 if(c.pf>1||c.efficiency>100||c.pvEfficiency>100||c.pvLoss>100)errors.push('PF must be ≤1; efficiencies and losses must be ≤100%.');
 if(!(0<=c.minSoc&&c.minSoc<=c.initialSoc&&c.initialSoc<=c.maxSoc&&c.maxSoc<=100&&c.reserveSoc>=c.minSoc&&c.reserveSoc<=c.maxSoc))errors.push('SOC must satisfy 0 ≤ minimum ≤ initial ≤ maximum ≤ 100, with reserve inside minimum/maximum.');
 if(!Number.isInteger(c.outageStart)||c.outageStart>23||!Number.isInteger(c.outageDuration)||c.outageDuration>24)errors.push('Outage start must be an integer 0–23; duration 0–24.');
 if(c.profile&&(!Array.isArray(c.profile)||c.profile.length!==24||c.profile.some((r,i)=>!r||typeof r!=='object'||r.hour!==i||!Number.isFinite(r.load)||r.load<0||!Number.isFinite(r.solar)||r.solar<0)))errors.push('Imported profile must contain each hour 0–23 once, with non-negative load and solar kW.');
 if(!Array.isArray(c.generators)||c.generators.length>8)errors.push('Use at most eight generators.');
 else if(c.mode==='diesel')c.generators.forEach((g,i)=>{
  if(!g||typeof g!=='object'){errors.push('Invalid generator entry.');return;}
  if(typeof g.enabled!=='boolean'||typeof g.forceDay!=='boolean')errors.push('Invalid generator switch.');
  if(typeof g.name!=='string'||g.name.length>60)errors.push('Invalid generator name.');
  for(const k of ['kw','kva','max','derating','min','amps','intercept','slope','start','end'])if(!Number.isFinite(g[k])||g[k]<0)errors.push(`Generator ${i+1}: invalid ${k}.`);
  if(g.min>100||g.derating>100||g.start>23||g.end>23||!Number.isInteger(g.start)||!Number.isInteger(g.end))errors.push(`Generator ${i+1}: check percentages and hours.`);
  if(g.enabled&&g.kw*g.min/100>genCap(g,c)+1e-8)errors.push(`Generator ${i+1}: minimum stable output exceeds its effective equipment limit.`);
 });
 return errors;
}
// Exhaustive commitment selection for up to 8 units; linear fuel curves, no start/ramp dynamics.
function dispatch(c,h,target,mandatory){
 const units=c.generators.map((g,i)=>({...g,index:i,cap:genCap(g,c),floor:g.kw*g.min/100})).filter(g=>available(g,h)&&g.cap>0);
 let best=null;
 for(let mask=0;mask<(1<<units.length);mask++){
  if(units.some((g,j)=>mandatory&&g.forceDay&&!(mask&(1<<j))))continue;
  const chosen=units.filter((g,j)=>mask&(1<<j));let max=chosen.reduce((s,g)=>s+g.cap,0),min=chosen.reduce((s,g)=>s+g.floor,0);
  const total=Math.min(max,Math.max(min,target)),powers=Array(c.generators.length).fill(0);let remainder=total-min;
  chosen.forEach(g=>powers[g.index]=g.floor);
  [...chosen].sort((a,b)=>a.slope-b.slope||a.index-b.index).forEach(g=>{const increment=Math.min(remainder,g.cap-g.floor);powers[g.index]+=increment;remainder-=increment;});
  const fuel=chosen.reduce((s,g)=>s+g.intercept+g.slope*powers[g.index],0),shortfall=Math.max(0,target-total);
  const result={total,powers,fuel,shortfall,running:chosen.map(g=>g.index)};
  if(!best||shortfall<best.shortfall-1e-8||(Math.abs(shortfall-best.shortfall)<1e-8&&(fuel<best.fuel-1e-8||(Math.abs(fuel-best.fuel)<1e-8&&total<best.total))))best=result;
 }
 return best||{total:0,powers:Array(c.generators.length).fill(0),fuel:0,shortfall:target,running:[]};
}
function simulate(c,strategy=c.strategy){
 const errors=validate(c);if(errors.length)return {errors};
 const bat=c.mode!=='on-grid',grid=c.mode==='on-grid'||c.mode==='hybrid',diesel=c.mode==='diesel',eta=Math.sqrt(c.efficiency/100);
 const cap=bat?c.battery:0,floor=cap*c.minSoc/100,ceil=cap*c.maxSoc/100,reserve=cap*c.reserveSoc/100;
 const chargeLimit=bat?Math.min(c.chargeLimit,c.chargeAmps*c.batteryVoltage/(1000*eta)):0;
 const dischargeLimit=bat?Math.min(c.dischargeLimit,c.dischargeAmps*c.batteryVoltage*eta/1000):0;
 let stored=cap*c.initialSoc/100;const initial=stored,hours=[];
 for(let h=0;h<24;h++){
  const load=c.profile?c.profile[h].load:(h>=6&&h<18?c.dayLoad:c.nightLoad);
  const potential=c.profile?c.profile[h].solar:c.pv*SOLAR[h]*(1-c.pvLoss/100);
  const gridUp=grid&&!(c.outage&&(h-c.outageStart+24)%24<c.outageDuration);
  const pvAvailable=c.mode==='on-grid'&&!gridUp?0:Math.min(potential,c.pvInverter,c.combinedLimit);
  const activeFloor=diesel&&strategy==='reliability'?Math.max(floor,reserve):floor;
  const batteryAvailable=Math.min(dischargeLimit,Math.max(0,stored-activeFloor)*eta,Math.max(0,c.combinedLimit-pvAvailable));
  const recovery=diesel&&strategy==='reliability'?Math.min(chargeLimit,Math.max(0,reserve-stored)/eta):0;
  const target=Math.max(0,load-pvAvailable-batteryAvailable)+(recovery>0?Math.max(0,recovery-Math.max(0,pvAvailable-load)):0);
  const dg=diesel?dispatch(c,h,target,strategy==='day-min'&&h>=6&&h<18):{total:0,powers:[],fuel:0,running:[]};
  const gen=dg.total,genDirect=Math.min(load,gen),pvDirect=Math.min(pvAvailable,load-genDirect);
  let deficit=Math.max(0,load-genDirect-pvDirect);
  const discharge=Math.min(deficit,batteryAvailable);stored-=discharge/eta;deficit-=discharge;
  const room=Math.max(0,ceil-stored)/eta;
  const genCharge=discharge>1e-8?0:Math.min(Math.max(0,gen-genDirect),chargeLimit,room);
  const pvCharge=discharge>1e-8?0:Math.min(Math.max(0,pvAvailable-pvDirect),Math.max(0,chargeLimit-genCharge),Math.max(0,room-genCharge));
  const charge=genCharge+pvCharge;stored+=charge*eta;
  const imported=gridUp?Math.min(deficit,c.gridImport):0;deficit-=imported;
  const exported=gridUp&&c.exportAllowed?Math.min(Math.max(0,pvAvailable-pvDirect-pvCharge),c.gridExport):0;
  const pvUsed=pvDirect+pvCharge+exported,curtailed=Math.max(0,potential-pvUsed),spill=Math.max(0,gen-genDirect-genCharge),unmet=Math.max(0,deficit);
  const cost=dg.fuel*c.dieselPrice+imported*c.buy-exported*c.sell+discharge*c.cycling;
  const balance=pvUsed+gen+discharge+imported-load-charge-exported-spill+unmet;
  hours.push({hour:h,load,potential,pvAvailable,pvUsed,gen,genUnits:dg.powers,running:dg.running,fuel:dg.fuel,charge,discharge,genCharge,pvCharge,imported,exported,curtailed,spill,unmet,stored,soc:cap?stored/cap*100:0,cost,balance,gridUp,batteryChargeDC:charge*eta*1000/c.batteryVoltage,batteryDischargeDC:discharge*1000/(eta*c.batteryVoltage),pvDC:pvUsed*1000/(c.pvVoltage*c.pvEfficiency/100)});
 }
 const totals={};for(const k of ['load','potential','pvUsed','gen','fuel','charge','discharge','imported','exported','curtailed','spill','unmet','cost'])totals[k]=hours.reduce((s,r)=>s+r[k],0);
 totals.finalSoc=hours[23].soc;totals.energyChange=stored-initial;totals.maxBalanceError=Math.max(...hours.map(r=>Math.abs(r.balance)));totals.maxStorageError=Math.max(0,...hours.flatMap(r=>[floor-r.stored,r.stored-ceil]));
 return {errors:[],strategy,hours,totals,config:JSON.parse(JSON.stringify(c))};
}
function compare(c){return Object.fromEntries(Object.keys(STRATEGIES).map(k=>[k,simulate(c,k)]));}
function parseCSV(text){
 const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(x=>x.trim());if(lines.length!==25)throw Error('CSV needs one header and exactly 24 hourly rows.');
 const separator=lines[0].includes(';')?';':',';
 const header=lines.shift().split(separator).map(s=>s.trim().toLowerCase());const expected=['hour','load_kw','solar_kw'];
 if(header.length!==3||!expected.every(k=>header.includes(k)))throw Error('Use the headers hour,load_kw,solar_kw.');
 const rows=lines.map(line=>{const v=line.split(separator).map(s=>s.trim());if(v.length!==3||v.some(s=>s===''))throw Error('Each row needs three non-empty numeric values.');const hourText=v[header.indexOf('hour')];const h=/^\d{1,2}:00$/.test(hourText)?Number(hourText.split(':')[0]):Number(hourText);const load=Number(v[header.indexOf('load_kw')]),solar=Number(v[header.indexOf('solar_kw')]);if(!Number.isInteger(h)||h<0||h>23||!Number.isFinite(load)||load<0||!Number.isFinite(solar)||solar<0)throw Error('Hours must be 0–23 or HH:00; power must be non-negative kW.');return {hour:h,load,solar};}).sort((a,b)=>a.hour-b.hour);
 if(rows.some((r,i)=>!r||typeof r!=='object'||r.hour!==i))throw Error('Each hour 0–23 must appear exactly once.');return rows;
}
const sizingDefaults=()=>({dayEnergy:60,nightEnergy:30,peak:8,surge:12,surgeSeconds:5,psh:5,yield:80,panelW:550,dod:80,chargeEfficiency:96,dischargeEfficiency:96,autonomy:1,margin:20,moduleKwh:5.12,modulePower:5,moduleVoltage:51.2,moduleCurrent:100});
function size(s){
 if(!s||typeof s!=='object')throw Error('Sizing inputs are required.');
 for(const k of Object.keys(sizingDefaults()))if(!Number.isFinite(s[k])||s[k]<0)throw Error('Sizing inputs must be non-negative numbers: '+k);
 for(const k of ['psh','yield','panelW','dod','chargeEfficiency','dischargeEfficiency','autonomy','moduleKwh','modulePower','moduleVoltage','moduleCurrent'])if(s[k]<=0)throw Error(k+' must be greater than zero.');
 if(s.yield>100||s.dod>100||s.chargeEfficiency>100||s.dischargeEfficiency>100)throw Error('Sizing efficiencies and usable discharge must be ≤100%.');
 if(s.psh>24)throw Error('Peak-sun-hours cannot exceed 24 hours/day.');
 if(s.dayEnergy+s.nightEnergy>s.peak*24+1e-8)throw Error('Daily energy exceeds peak load multiplied by 24 hours. Check kWh/day and peak kW.');
 const margin=1+s.margin/100,ce=s.chargeEfficiency/100,de=s.dischargeEfficiency/100;
 const solarEnergy=s.dayEnergy+s.nightEnergy/(ce*de),pv=solarEnergy/(s.psh*s.yield/100)*margin,panels=Math.ceil(pv*1000/s.panelW),inverter=s.peak*margin;
 const battery=s.nightEnergy*s.autonomy/(s.dod/100*de)*margin,batteryACPower=Math.min(s.modulePower,s.moduleVoltage*s.moduleCurrent/1000)*de;
 const energyModules=Math.ceil(battery/s.moduleKwh),powerModules=s.nightEnergy>0?Math.ceil(inverter/batteryACPower):0,modules=Math.max(energyModules,powerModules);
 return {solarEnergy,pv,panels,installedPv:panels*s.panelW/1000,inverter,surge:Math.max(inverter,s.surge),battery,energyModules,powerModules,modules,installedBattery:modules*s.moduleKwh,batteryACPower,bankACPower:modules*batteryACPower,bankDCAmps:inverter*1000/(s.moduleVoltage*de)};
}
const api={SOLAR,MODES,STRATEGIES,defaults,ac,kwFromAmps,genCap,validate,dispatch,simulate,compare,parseCSV,sizingDefaults,size};root.EnergyModel=api;if(typeof module==='object')module.exports=api;
})(globalThis);
