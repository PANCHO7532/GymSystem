/**
 * Rentabilidad — datos reales desde GET /api/pagos.
 * La API actual no ofrece costos, gastos ni colectores; por eso no se inventan
 * importes y el resultado/margen neto se muestran como no calculables.
 */
const MESES_RENT = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ARS = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
let pagosRentabilidad = [];
let movimientosVisibles = [];
let filtroAplicado = {periodo:'month',mes:new Date().getMonth()+1,anio:new Date().getFullYear(),tipo:'all'};

const esConfirmadoRent = p => p.confirmado === true || p.confirmado === 1 || p.confirmado === 'true';
const montoRent = p => Number(p.monto)||0;
const fechaRent = p => {
  const d = new Date(p.fechaPago);
  return Number.isNaN(d.getTime()) ? null : d;
};
const formatoFechaRent = p => {
  const d=fechaRent(p);
  return d ? d.toLocaleDateString('es-AR') : '—';
};
const escaparRent = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function iniciarRentabilidad(){
  const hoy=new Date();
  const mes=document.getElementById('mes');
  mes.innerHTML=MESES_RENT.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  mes.value=String(hoy.getMonth()+1);
  const anio=document.getElementById('anio');
  const years=new Set([hoy.getFullYear()]);
  pagosRentabilidad.forEach(p=>{if(p.periodoAnio)years.add(Number(p.periodoAnio));});
  anio.innerHTML=[...years].sort((a,b)=>b-a).map(y=>`<option value="${y}">${y}</option>`).join('');
  anio.value=String(hoy.getFullYear());
  document.getElementById('periodo').addEventListener('change',actualizarVisibilidadPeriodo);
  document.getElementById('aplicarFiltros').addEventListener('click',aplicarFiltrosRent);
  document.getElementById('limpiarFiltros').addEventListener('click',limpiarFiltrosRent);
  document.getElementById('buscarMovimiento').addEventListener('input',renderMovimientosRent);
  document.getElementById('estadoMovimiento').addEventListener('change',renderMovimientosRent);
  document.getElementById('clasificacionMovimiento').addEventListener('change',renderMovimientosRent);
  document.getElementById('btnCostos').addEventListener('click',informarCostosNoDisponibles);
  document.getElementById('btnInfoColectores').addEventListener('click',informarCostosNoDisponibles);
  actualizarVisibilidadPeriodo();
  aplicarFiltrosRent();
}
function actualizarVisibilidadPeriodo(){
  const periodo=document.getElementById('periodo').value;
  document.getElementById('mesField').style.display=periodo==='month'?'flex':'none';
}
async function cargarPagosRent(){
  try{
    const res=await fetch(`${API_BASE}/api/pagos`,{headers:authHeaders()});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const data=await res.json();
    pagosRentabilidad=Array.isArray(data)?data:[];
    iniciarRentabilidad();
  }catch(err){
    pagosRentabilidad=[];
    iniciarRentabilidad();
    showToast('No se pudieron cargar los pagos desde la API','error');
  }
}
function limpiarFiltrosRent(){
  const hoy=new Date();
  document.getElementById('periodo').value='month';
  document.getElementById('mes').value=String(hoy.getMonth()+1);
  document.getElementById('anio').value=String(hoy.getFullYear());
  document.getElementById('tipoMovimiento').value='all';
  document.getElementById('buscarMovimiento').value='';
  document.getElementById('estadoMovimiento').value='all';
  document.getElementById('clasificacionMovimiento').value='all';
  actualizarVisibilidadPeriodo();
  aplicarFiltrosRent();
}
function aplicarFiltrosRent(){
  filtroAplicado={
    periodo:document.getElementById('periodo').value,
    mes:Number(document.getElementById('mes').value),
    anio:Number(document.getElementById('anio').value),
    tipo:document.getElementById('tipoMovimiento').value
  };
  const {periodo,mes,anio}=filtroAplicado;
  movimientosVisibles=pagosRentabilidad.filter(p=>{
    const d=fechaRent(p);
    const pMes=d?d.getMonth()+1:Number(p.periodoMes);
    const pAnio=d?d.getFullYear():Number(p.periodoAnio);
    if(periodo==='month')return pMes===mes&&pAnio===anio;
    if(periodo==='quarter')return Math.ceil(pMes/3)===Math.ceil(mes/3)&&pAnio===anio;
    if(periodo==='year')return pAnio===anio;
    return true;
  });
  actualizarDashboardRent();
  renderMovimientosRent();
}
function etiquetaPeriodoRent(){
  const {periodo,mes,anio}=filtroAplicado;
  if(periodo==='month')return `${MESES_RENT[mes-1]} ${anio}`;
  if(periodo==='quarter')return `Trimestre ${Math.ceil(mes/3)} · ${anio}`;
  if(periodo==='year')return String(anio);
  return 'Todo el período';
}
function actualizarDashboardRent(){
  const confirmados=movimientosVisibles.filter(esConfirmadoRent);
  const ingresos=confirmados.reduce((s,p)=>s+montoRent(p),0);
  document.getElementById('totalIngresos').textContent=ARS.format(ingresos);
  // No hay API/modelo para egresos: no se calcula una utilidad ficticia.
  document.getElementById('totalCostos').textContent='No disponible';
  document.getElementById('resultadoEconomico').textContent='No calculable';
  document.getElementById('margenRentabilidad').textContent='—';
  document.getElementById('resultadoNota').textContent='Requiere ingresos y costos';
  document.getElementById('periodoEtiqueta').textContent=etiquetaPeriodoRent();
  document.getElementById('movimientosSubtitulo').textContent=`${movimientosVisibles.length} movimientos visibles · ${etiquetaPeriodoRent()}`;
  renderGraficoRent(pagosRentabilidad.filter(esConfirmadoRent));
}
function renderGraficoRent(confirmados){
  const canvas=document.getElementById('comparacionChart');
  const msg=document.getElementById('chartMessage');
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const w=Math.max(280,rect.width),h=Math.max(130,rect.height);
  canvas.width=w*dpr;canvas.height=h*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const max=Math.max(...confirmados.map(montoRent),0);
  msg.hidden=max>0;
  if(!max)return;
  const pad={l:35,r:10,t:14,b:25},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  ctx.font='9px DM Sans';ctx.fillStyle='#737388';ctx.strokeStyle='rgba(107,107,128,.22)';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pad.t+ph*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    const val=max*(1-i/4);ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(val>=1000000?`$${(val/1000000).toFixed(1)}M`:val>=1000?`$${Math.round(val/1000)}k`:`$${Math.round(val)}`,2,y);
  }
  // Agrupar ingresos por mes (período mensual) o por los 12 meses del año.
  const groups=[];
  if(filtroAplicado.periodo==='month'){
    const start=new Date(filtroAplicado.anio,filtroAplicado.mes-6,1);
    for(let i=0;i<6;i++){const d=new Date(start.getFullYear(),start.getMonth()+i,1);groups.push({label:MESES_RENT[d.getMonth()].slice(0,3),month:d.getMonth()+1,year:d.getFullYear(),value:0});}
  }else if(filtroAplicado.periodo==='quarter'){
    const first=(Math.ceil(filtroAplicado.mes/3)-1)*3;
    for(let i=0;i<3;i++)groups.push({label:MESES_RENT[first+i].slice(0,3),month:first+i+1,year:filtroAplicado.anio,value:0});
  }else{
    for(let i=0;i<12;i++)groups.push({label:MESES_RENT[i].slice(0,3),month:i+1,year:filtroAplicado.anio,value:0});
  }
  confirmados.forEach(p=>{
    const d=fechaRent(p);const m=d?d.getMonth()+1:Number(p.periodoMes),y=d?d.getFullYear():Number(p.periodoAnio);
    const g=groups.find(x=>x.month===m&&x.year===y);if(g)g.value+=montoRent(p);
  });
  const step=pw/groups.length,bw=Math.min(27,step*.5);
  groups.forEach((g,i)=>{
    const bh=g.value/max*ph*.9,x=pad.l+i*step+(step-bw)/2,y=pad.t+ph-bh;
    const grad=ctx.createLinearGradient(0,y,0,pad.t+ph);grad.addColorStop(0,'#e8ff47');grad.addColorStop(1,'rgba(232,255,71,.2)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,bw,bh,4):ctx.rect(x,y,bw,bh);ctx.fill();
    ctx.fillStyle='#85859a';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(g.label,x+bw/2,h-7);
  });
}
function renderMovimientosRent(){
  const q=document.getElementById('buscarMovimiento').value.trim().toLowerCase();
  const estado=document.getElementById('estadoMovimiento').value;
  const clasif=document.getElementById('clasificacionMovimiento').value;
  const rows=movimientosVisibles.filter(p=>{
    const text=[p.nombreSocio,p.nombrePlan,p.medioPago,p.observaciones].join(' ').toLowerCase();
    const status=esConfirmadoRent(p)?'confirmed':'pending';
    return (!q||text.includes(q))&&(estado==='all'||estado===status)&&(clasif==='all'||clasif==='income');
  }).sort((a,b)=>(fechaRent(b)?.getTime()||0)-(fechaRent(a)?.getTime()||0));
  const tbody=document.getElementById('tablaMovimientos');
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9"><div class="empty-state"><span>▤</span><h3>Sin movimientos</h3><p>No hay pagos que coincidan con los filtros seleccionados.</p></div></td></tr>';
  }else{
    tbody.innerHTML=rows.map(p=>{
      const ok=esConfirmadoRent(p);
      const concepto=p.observaciones||'Cobro de membresía';
      return `<tr>
        <td>${formatoFechaRent(p)}</td>
        <td><span class="movement-concept">${escaparRent(concepto)}</span><br><span>${escaparRent(p.nombreSocio||'Socio')} · ${escaparRent(p.nombrePlan||'')}</span></td>
        <td><span class="movement-type">Ingreso</span></td>
        <td>Membresías</td><td>—</td><td>—</td>
        <td class="movement-amount">${ARS.format(montoRent(p))}</td>
        <td><span class="movement-status ${ok?'':'pending'}">${ok?'Confirmado':'Pendiente'}</span></td>
        <td><button class="movement-detail" title="Ver pagos" onclick="window.location.href='pagos.html'">◉</button></td>
      </tr>`;
    }).join('');
  }
  document.getElementById('movimientosFooter').textContent=`${rows.length} registros visibles. Los pagos pendientes se muestran en la tabla, pero no se computan como ingresos.`;
}
function informarCostosNoDisponibles(){
  showToast('La API actual no contempla costos, gastos ni colectores','error');
}
let resizeRentTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeRentTimer);resizeRentTimer=setTimeout(()=>renderGraficoRent(pagosRentabilidad.filter(esConfirmadoRent)),120);});
cargarPagosRent();
