const MESES_RENT = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ARS = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
let pagosRentabilidad = [];
let egresosRentabilidad = [];
let colectoresRentabilidad = [];
let movimientosVisibles = [];
let filtroAplicado = {periodo:'month',mes:new Date().getMonth()+1,anio:new Date().getFullYear(),tipo:'all',colector:'all'};

const esConfirmadoRent = p => p.confirmado === true || p.confirmado === 1 || p.confirmado === 'true';
const montoRent = p => Number(p.monto)||0;
const fechaRent = p => {
  const d = p.fecha ? new Date(`${String(p.fecha).slice(0,10)}T00:00:00`) : new Date(p.fechaPago);
  return Number.isNaN(d.getTime()) ? null : d;
};
const formatoFechaRent = p => {
  const d=fechaRent(p);
  return d ? d.toLocaleDateString('es-AR') : '—';
};
const escaparRent = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function apiRent(url, opciones={}){
  const res=await fetch(`${API_BASE}${url}`,{
    ...opciones,
    headers:{...authHeaders(),...(opciones.headers||{})}
  });
  if(!res.ok){
    let detalle={};
    try{detalle=await res.json();}catch(err){}
    throw new Error(detalle.title||`HTTP ${res.status}`);
  }
  if(res.status===204)return null;
  return await res.json();
}

function iniciarRentabilidad(){
  const hoy=new Date();
  const mes=document.getElementById('mes');
  mes.innerHTML=MESES_RENT.map((m,i)=>`<option value="${i+1}">${m}</option>`).join('');
  mes.value=String(hoy.getMonth()+1);
  const anio=document.getElementById('anio');
  const years=new Set([hoy.getFullYear()]);
  [...pagosRentabilidad,...egresosRentabilidad].forEach(p=>{
    const d=fechaRent(p);
    if(d)years.add(d.getFullYear());
    else if(p.periodoAnio)years.add(Number(p.periodoAnio));
  });
  anio.innerHTML=[...years].sort((a,b)=>b-a).map(y=>`<option value="${y}">${y}</option>`).join('');
  anio.value=String(hoy.getFullYear());
  document.getElementById('periodo').addEventListener('change',actualizarVisibilidadPeriodo);
  document.getElementById('aplicarFiltros').addEventListener('click',aplicarFiltrosRent);
  document.getElementById('limpiarFiltros').addEventListener('click',limpiarFiltrosRent);
  document.getElementById('buscarMovimiento').addEventListener('input',renderMovimientosRent);
  document.getElementById('estadoMovimiento').addEventListener('change',renderMovimientosRent);
  document.getElementById('clasificacionMovimiento').addEventListener('change',renderMovimientosRent);
  document.getElementById('tipoMovimiento').addEventListener('change',renderMovimientosRent);
  document.getElementById('colector').addEventListener('change',renderMovimientosRent);
  document.getElementById('btnCostos').addEventListener('click',abrirGestionColectoresRent);
  document.getElementById('btnInfoColectores').addEventListener('click',abrirGestionColectoresRent);
  document.getElementById('btnRegistrarEgreso').addEventListener('click',()=>abrirFormularioEgresoRent());
  document.getElementById('btnRegistrarMovimiento').addEventListener('click',()=>abrirFormularioEgresoRent());
  actualizarVisibilidadPeriodo();
  cargarSelectColectoresRent();
  aplicarFiltrosRent();
}

function actualizarVisibilidadPeriodo(){
  const periodo=document.getElementById('periodo').value;
  document.getElementById('mesField').style.display=periodo==='month'?'flex':'none';
}

async function cargarRentabilidad(){
  try{
    const resultados=await Promise.all([
      apiRent('/api/pagos'),
      apiRent('/api/egresos'),
      apiRent('/api/colectores-costos')
    ]);
    pagosRentabilidad=Array.isArray(resultados[0])?resultados[0]:[];
    egresosRentabilidad=Array.isArray(resultados[1])?resultados[1]:[];
    colectoresRentabilidad=Array.isArray(resultados[2])?resultados[2]:[];
    iniciarRentabilidad();
  }catch(err){
    pagosRentabilidad=[];
    egresosRentabilidad=[];
    colectoresRentabilidad=[];
    iniciarRentabilidad();
    showToast(`No se pudieron cargar los datos de rentabilidad: ${err.message}`,'error');
  }
}

function cargarSelectColectoresRent(){
  const select=document.getElementById('colector');
  const seleccionado=select.value||'all';
  select.innerHTML='<option value="all">Todos los colectores</option>'+colectoresRentabilidad.map(c=>`<option value="${c.idColector}">${escaparRent(c.nombre)}${c.activo?'':' (Inactivo)'}</option>`).join('');
  select.value=[...select.options].some(o=>o.value===seleccionado)?seleccionado:'all';
}

function limpiarFiltrosRent(){
  const hoy=new Date();
  document.getElementById('periodo').value='month';
  document.getElementById('mes').value=String(hoy.getMonth()+1);
  document.getElementById('anio').value=String(hoy.getFullYear());
  document.getElementById('tipoMovimiento').value='all';
  document.getElementById('colector').value='all';
  document.getElementById('buscarMovimiento').value='';
  document.getElementById('estadoMovimiento').value='all';
  document.getElementById('clasificacionMovimiento').value='all';
  actualizarVisibilidadPeriodo();
  aplicarFiltrosRent();
}

function dentroPeriodoRent(p){
  const d=fechaRent(p);
  const mes=d?d.getMonth()+1:Number(p.periodoMes);
  const anio=d?d.getFullYear():Number(p.periodoAnio);
  const {periodo,mes:mesFiltro,anio:anioFiltro}=filtroAplicado;
  if(periodo==='month')return mes===mesFiltro&&anio===anioFiltro;
  if(periodo==='quarter')return Math.ceil(mes/3)===Math.ceil(mesFiltro/3)&&anio===anioFiltro;
  if(periodo==='year')return anio===anioFiltro;
  return true;
}

function aplicarFiltrosRent(){
  filtroAplicado={
    periodo:document.getElementById('periodo').value,
    mes:Number(document.getElementById('mes').value),
    anio:Number(document.getElementById('anio').value),
    tipo:document.getElementById('tipoMovimiento').value,
    colector:document.getElementById('colector').value
  };
  const ingresos=pagosRentabilidad.filter(dentroPeriodoRent).map(p=>({...p,tipoMovimiento:'income',fechaMovimiento:p.fechaPago,conceptoMovimiento:p.observaciones||'Cobro de membresía',categoriaMovimiento:'Membresías',clasificacionMovimiento:'income',nombreColector:null}));
  const egresos=egresosRentabilidad.filter(dentroPeriodoRent).map(p=>({...p,tipoMovimiento:'expense',fechaMovimiento:p.fecha,conceptoMovimiento:p.concepto,categoriaMovimiento:p.categoria,clasificacionMovimiento:p.clasificacion}));
  movimientosVisibles=[...ingresos,...egresos].filter(p=>
    (filtroAplicado.tipo==='all'||filtroAplicado.tipo===p.tipoMovimiento)&&
    (filtroAplicado.colector==='all'||p.tipoMovimiento==='income'||String(p.idColector||'')===filtroAplicado.colector)
  );
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
  const ingresos=movimientosVisibles.filter(p=>p.tipoMovimiento==='income'&&esConfirmadoRent(p)).reduce((s,p)=>s+montoRent(p),0);
  const egresos=movimientosVisibles.filter(p=>p.tipoMovimiento==='expense'&&esConfirmadoRent(p)).reduce((s,p)=>s+montoRent(p),0);
  const resultado=ingresos-egresos;
  const margen=ingresos>0?(resultado/ingresos)*100:null;
  document.getElementById('totalIngresos').textContent=ARS.format(ingresos);
  document.getElementById('totalCostos').textContent=ARS.format(egresos);
  document.getElementById('resultadoEconomico').textContent=ARS.format(resultado);
  document.getElementById('resultadoEconomico').classList.toggle('unavailable',ingresos===0&&egresos===0);
  document.getElementById('margenRentabilidad').textContent=margen===null?'—':`${margen.toFixed(1).replace('.',',')}%`;
  document.getElementById('margenRentabilidad').classList.toggle('unavailable',margen===null);
  document.getElementById('resultadoNota').textContent=ingresos===0?'No hay ingresos confirmados en el período':`Ingresos menos egresos confirmados · ${margen===null?'':margen<0?'Resultado negativo':'Resultado del período'}`;
  document.getElementById('periodoEtiqueta').textContent=etiquetaPeriodoRent();
  document.getElementById('movimientosSubtitulo').textContent=`${movimientosVisibles.length} movimientos del período · ${etiquetaPeriodoRent()}`;
  renderGraficoRent();
  renderDistribucionRent();
  renderResumenColectoresRent();
}

function obtenerGruposGraficoRent(){
  const groups=[];
  if(filtroAplicado.periodo==='all'){
    const years=[...new Set(movimientosVisibles.map(p=>{const d=fechaRent(p);return d?d.getFullYear():Number(p.periodoAnio);}).filter(Number.isFinite))].sort((a,b)=>a-b);
    years.forEach(year=>groups.push({label:String(year),year,income:0,expense:0}));
  }else if(filtroAplicado.periodo==='month'){
    const start=new Date(filtroAplicado.anio,filtroAplicado.mes-6,1);
    for(let i=0;i<6;i++){const d=new Date(start.getFullYear(),start.getMonth()+i,1);groups.push({label:MESES_RENT[d.getMonth()].slice(0,3),month:d.getMonth()+1,year:d.getFullYear(),income:0,expense:0});}
  }else if(filtroAplicado.periodo==='quarter'){
    const first=(Math.ceil(filtroAplicado.mes/3)-1)*3;
    for(let i=0;i<3;i++)groups.push({label:MESES_RENT[first+i].slice(0,3),month:first+i+1,year:filtroAplicado.anio,income:0,expense:0});
  }else{
    for(let i=0;i<12;i++)groups.push({label:MESES_RENT[i].slice(0,3),month:i+1,year:filtroAplicado.anio,income:0,expense:0});
  }
  movimientosVisibles.filter(esConfirmadoRent).forEach(p=>{
    const d=fechaRent(p);const month=d?d.getMonth()+1:Number(p.periodoMes),year=d?d.getFullYear():Number(p.periodoAnio);
    const group=filtroAplicado.periodo==='all'?groups.find(x=>x.year===year):groups.find(x=>x.month===month&&x.year===year);
    if(group)group[p.tipoMovimiento]+=montoRent(p);
  });
  return groups;
}

function renderGraficoRent(){
  const canvas=document.getElementById('comparacionChart');
  const msg=document.getElementById('chartMessage');
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  const w=Math.max(280,rect.width),h=Math.max(130,rect.height);
  canvas.width=w*dpr;canvas.height=h*dpr;
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const groups=obtenerGruposGraficoRent();
  const max=Math.max(...groups.flatMap(g=>[g.income,g.expense]),0);
  msg.hidden=max>0;
  if(!max)return;
  const pad={l:38,r:10,t:14,b:25},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b;
  ctx.font='9px DM Sans';ctx.fillStyle='#737388';ctx.strokeStyle='rgba(107,107,128,.22)';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const y=pad.t+ph*i/4;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    const val=max*(1-i/4);ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(val>=1000000?`$${(val/1000000).toFixed(1)}M`:val>=1000?`$${Math.round(val/1000)}k`:`$${Math.round(val)}`,2,y);
  }
  const step=pw/groups.length,bw=Math.min(13,step*.28);
  groups.forEach((g,i)=>{
    const center=pad.l+i*step+step/2;
    const incomeHeight=g.income/max*ph*.9,expenseHeight=g.expense/max*ph*.9;
    ctx.fillStyle='#e8ff47';
    if(incomeHeight>0)ctx.fillRect(center-bw-1,pad.t+ph-incomeHeight,bw,incomeHeight);
    ctx.fillStyle='#596a70';
    if(expenseHeight>0)ctx.fillRect(center+1,pad.t+ph-expenseHeight,bw,expenseHeight);
    ctx.fillStyle='#85859a';ctx.textAlign='center';ctx.textBaseline='alphabetic';ctx.fillText(g.label,center,h-7);
  });
}

function renderDistribucionRent(){
  const container=document.getElementById('distribucionEgresos');
  const agrupados={};
  movimientosVisibles.filter(p=>p.tipoMovimiento==='expense'&&esConfirmadoRent(p)).forEach(p=>{
    const categoria=p.categoria||'Sin categoría';
    agrupados[categoria]=(agrupados[categoria]||0)+montoRent(p);
  });
  const rows=Object.entries(agrupados).sort((a,b)=>b[1]-a[1]);
  if(!rows.length){
    container.innerHTML='<div class="empty-ring"><span>—</span></div><div class="cost-empty-copy"><strong>Sin egresos confirmados</strong><p>Los egresos registrados aparecerán agrupados por categoría.</p></div>';
    return;
  }
  const total=rows.reduce((s,r)=>s+r[1],0);
  container.innerHTML=`<div class="distribution-list">${rows.map(([nombre,monto])=>`<div class="distribution-row"><div><strong>${escaparRent(nombre)}</strong><span>${(monto/total*100).toFixed(1).replace('.',',')}%</span></div><div class="distribution-track"><i style="width:${monto/total*100}%"></i></div><small>${ARS.format(monto)}</small></div>`).join('')}</div>`;
}

function renderResumenColectoresRent(){
  const container=document.getElementById('resumenColectores');
  const agrupados={};
  movimientosVisibles.filter(p=>p.tipoMovimiento==='expense'&&esConfirmadoRent(p)).forEach(p=>{
    const nombre=p.nombreColector||'Sin colector';
    agrupados[nombre]=(agrupados[nombre]||0)+montoRent(p);
  });
  const rows=Object.entries(agrupados).sort((a,b)=>b[1]-a[1]);
  if(!rows.length){
    container.innerHTML='<span class="empty-icon">◎</span><div><strong>Sin egresos asignados</strong><p>Los egresos asociados a colectores aparecerán aquí.</p></div>';
    return;
  }
  container.innerHTML=`<div class="collector-summary-list">${rows.map(([nombre,monto])=>`<div class="collector-summary-row"><span>${escaparRent(nombre)}</span><strong>${ARS.format(monto)}</strong></div>`).join('')}</div>`;
}

function renderMovimientosRent(){
  const q=document.getElementById('buscarMovimiento').value.trim().toLowerCase();
  const estado=document.getElementById('estadoMovimiento').value;
  const clasif=document.getElementById('clasificacionMovimiento').value;
  const tipo=document.getElementById('tipoMovimiento').value;
  const colector=document.getElementById('colector').value;
  const rows=movimientosVisibles.filter(p=>{
    const text=[p.conceptoMovimiento,p.nombreSocio,p.nombrePlan,p.medioPago,p.categoriaMovimiento,p.nombreColector].join(' ').toLowerCase();
    const status=esConfirmadoRent(p)?'confirmed':'pending';
    const clasificacion=p.tipoMovimiento==='income'?'income':p.clasificacion;
    return (!q||text.includes(q))&&(estado==='all'||estado===status)&&(tipo==='all'||tipo===p.tipoMovimiento)&&(clasif==='all'||clasif===clasificacion)&&(colector==='all'||String(p.idColector||'')===colector);
  }).sort((a,b)=>(new Date(b.fechaMovimiento).getTime()||0)-(new Date(a.fechaMovimiento).getTime()||0));
  const tbody=document.getElementById('tablaMovimientos');
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9"><div class="empty-state"><span>▤</span><h3>Sin movimientos</h3><p>No hay movimientos que coincidan con los filtros seleccionados.</p></div></td></tr>';
  }else{
    tbody.innerHTML=rows.map(p=>{
      const ok=esConfirmadoRent(p),ingreso=p.tipoMovimiento==='income';
      const concepto=p.conceptoMovimiento||'Movimiento';
      const detalle=ingreso?`${escaparRent(p.nombreSocio||'Socio')} · ${escaparRent(p.nombrePlan||'')}`:'';
      const estadoTexto=ok?'Confirmado':'Pendiente';
      return `<tr>
        <td>${formatoFechaRent({fechaPago:p.fechaMovimiento})}</td>
        <td><span class="movement-concept">${escaparRent(concepto)}</span>${detalle?`<br><span>${detalle}</span>`:''}</td>
        <td><span class="movement-type ${ingreso?'':'expense-type'}">${ingreso?'Ingreso':'Egreso'}</span></td>
        <td>${escaparRent(p.categoriaMovimiento||'Membresías')}</td>
        <td>${ingreso?'Ingreso':p.clasificacion==='directo'?'Costo directo':'Costo indirecto'}</td>
        <td>${escaparRent(p.nombreColector||'—')}</td>
        <td class="movement-amount ${ingreso?'':'expense-amount'}">${ingreso?'+':'−'} ${ARS.format(montoRent(p))}</td>
        <td><span class="movement-status ${ok?'':'pending'}">${estadoTexto}</span></td>
        <td>${ingreso?'<button class="movement-detail" title="Ver pagos" onclick="window.location.href=\'pagos.html\'">◉</button>':`<button class="movement-detail" title="Editar egreso" onclick="editarEgresoRent(${p.idEgreso})">✎</button> <button class="movement-detail" title="Eliminar egreso" onclick="eliminarEgresoRent(${p.idEgreso})">×</button>`}</td>
      </tr>`;
    }).join('');
  }
  document.getElementById('movimientosFooter').textContent=`${rows.length} registros visibles. Los movimientos pendientes se muestran en la tabla, pero no se computan en los totales.`;
}

function prepararDialogosRent(){
  document.body.insertAdjacentHTML('beforeend', `
    <dialog class="rent-dialog" id="dialogEgresoRent">
      <form id="formEgresoRent" class="rent-dialog-form">
        <div class="rent-dialog-heading"><div><h2 id="tituloEgresoRent">Registrar egreso</h2><p>Los egresos confirmados se incluyen en el resultado económico.</p></div><button type="button" class="rent-dialog-close" data-cerrar="dialogEgresoRent">×</button></div>
        <input type="hidden" id="idEgresoRent" />
        <label>Concepto<input id="conceptoEgresoRent" maxlength="255" required /></label>
        <div class="rent-form-grid"><label>Categoría<input id="categoriaEgresoRent" maxlength="100" placeholder="Alquiler, servicios, mantenimiento..." required /></label><label>Clasificación<select id="clasificacionEgresoRent" required><option value="directo">Costo directo</option><option value="indirecto">Costo indirecto</option></select></label></div>
        <div class="rent-form-grid"><label>Importe<input id="montoEgresoRent" type="number" min="0.01" step="0.01" required /></label><label>Fecha<input id="fechaEgresoRent" type="date" required /></label></div>
        <label>Colector de costos<select id="colectorEgresoRent"><option value="">Sin colector</option></select></label>
        <label class="rent-checkbox"><input id="confirmadoEgresoRent" type="checkbox" checked /> Movimiento confirmado</label>
        <div class="rent-dialog-actions"><button type="button" class="btn-secondary" data-cerrar="dialogEgresoRent">Cancelar</button><button type="submit" class="btn-primary">Guardar egreso</button></div>
      </form>
    </dialog>
    <dialog class="rent-dialog" id="dialogColectoresRent">
      <div class="rent-dialog-form">
        <div class="rent-dialog-heading"><div><h2>Colectores de costos</h2><p>Organizá los egresos por área o responsable.</p></div><button type="button" class="rent-dialog-close" data-cerrar="dialogColectoresRent">×</button></div>
        <form id="formColectorRent" class="rent-inline-form"><input type="hidden" id="idColectorRent" /><label>Nombre<input id="nombreColectorRent" maxlength="150" required /></label><label>Descripción<input id="descripcionColectorRent" maxlength="255" /></label><button type="submit" class="btn-primary" id="guardarColectorRent">Agregar</button></form>
        <div id="listaColectoresRent" class="rent-collector-list"></div>
      </div>
    </dialog>`);
  document.querySelectorAll('[data-cerrar]').forEach(btn=>btn.addEventListener('click',()=>document.getElementById(btn.dataset.cerrar).close()));
  document.getElementById('formEgresoRent').addEventListener('submit',guardarEgresoRent);
  document.getElementById('formColectorRent').addEventListener('submit',crearColectorRent);
}

function actualizarSelectEgresoRent(seleccionado=''){
  const select=document.getElementById('colectorEgresoRent');
  select.innerHTML='<option value="">Sin colector</option>'+colectoresRentabilidad.map(c=>`<option value="${c.idColector}" ${!c.activo&&String(c.idColector)!==String(seleccionado)?'disabled':''}>${escaparRent(c.nombre)}${c.activo?'':' (Inactivo)'}</option>`).join('');
  select.value=String(seleccionado||'');
}

function abrirFormularioEgresoRent(id=null){
  const egreso=id?egresosRentabilidad.find(p=>p.idEgreso===id):null;
  document.getElementById('formEgresoRent').reset();
  document.getElementById('idEgresoRent').value=egreso?egreso.idEgreso:'';
  document.getElementById('tituloEgresoRent').textContent=egreso?'Editar egreso':'Registrar egreso';
  document.getElementById('conceptoEgresoRent').value=egreso?egreso.concepto:'';
  document.getElementById('categoriaEgresoRent').value=egreso?egreso.categoria:'';
  document.getElementById('clasificacionEgresoRent').value=egreso?egreso.clasificacion:'directo';
  document.getElementById('montoEgresoRent').value=egreso?egreso.monto:'';
  const hoy=new Date();
  const fechaLocal=egreso?String(egreso.fecha).slice(0,10):`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  document.getElementById('fechaEgresoRent').value=fechaLocal;
  document.getElementById('confirmadoEgresoRent').checked=egreso?esConfirmadoRent(egreso):true;
  actualizarSelectEgresoRent(egreso?egreso.idColector:'');
  document.getElementById('dialogEgresoRent').showModal();
}

async function guardarEgresoRent(event){
  event.preventDefault();
  const id=document.getElementById('idEgresoRent').value;
  const datos={
    concepto:document.getElementById('conceptoEgresoRent').value.trim(),
    categoria:document.getElementById('categoriaEgresoRent').value.trim(),
    clasificacion:document.getElementById('clasificacionEgresoRent').value,
    monto:Number(document.getElementById('montoEgresoRent').value),
    fecha:document.getElementById('fechaEgresoRent').value,
    idColector:document.getElementById('colectorEgresoRent').value||null,
    confirmado:document.getElementById('confirmadoEgresoRent').checked
  };
  try{
    await apiRent(id?`/api/egresos/${id}`:'/api/egresos',{method:id?'PUT':'POST',body:JSON.stringify(datos)});
    document.getElementById('dialogEgresoRent').close();
    await recargarDatosRent();
    showToast(id?'Egreso actualizado correctamente':'Egreso registrado correctamente');
  }catch(err){showToast(`No se pudo guardar el egreso: ${err.message}`,'error');}
}

function editarEgresoRent(id){abrirFormularioEgresoRent(id);}

async function eliminarEgresoRent(id){
  if(!confirm('¿Deseás eliminar este egreso? Esta acción no se puede deshacer.'))return;
  try{
    await apiRent(`/api/egresos/${id}`,{method:'DELETE'});
    await recargarDatosRent();
    showToast('Egreso eliminado correctamente');
  }catch(err){showToast(`No se pudo eliminar el egreso: ${err.message}`,'error');}
}

function abrirGestionColectoresRent(){
  renderListaColectoresRent();
  document.getElementById('formColectorRent').reset();
  document.getElementById('idColectorRent').value='';
  document.getElementById('guardarColectorRent').textContent='Agregar';
  document.getElementById('dialogColectoresRent').showModal();
}

function renderListaColectoresRent(){
  const container=document.getElementById('listaColectoresRent');
  if(!colectoresRentabilidad.length){container.innerHTML='<p class="rent-empty-list">Todavía no hay colectores registrados.</p>';return;}
  container.innerHTML=colectoresRentabilidad.map(c=>`<div class="rent-collector-item"><div><strong>${escaparRent(c.nombre)}</strong><small>${escaparRent(c.descripcion||'Sin descripción')} · ${c.activo?'Activo':'Inactivo'}</small></div><div><button type="button" class="movement-detail" title="Editar colector" onclick="editarColectorRent(${c.idColector})">✎</button> <button type="button" class="movement-detail" title="${c.activo?'Desactivar':'Activar'}" onclick="cambiarEstadoColectorRent(${c.idColector},${!c.activo})">${c.activo?'−':'+'}</button> <button type="button" class="movement-detail" title="Eliminar colector" onclick="eliminarColectorRent(${c.idColector})">×</button></div></div>`).join('');
}

async function crearColectorRent(event){
  event.preventDefault();
  const id=document.getElementById('idColectorRent').value;
  const datos={nombre:document.getElementById('nombreColectorRent').value.trim(),descripcion:document.getElementById('descripcionColectorRent').value.trim()};
  try{
    await apiRent(id?`/api/colectores-costos/${id}`:'/api/colectores-costos',{method:id?'PUT':'POST',body:JSON.stringify(datos)});
    document.getElementById('formColectorRent').reset();
    document.getElementById('guardarColectorRent').textContent='Agregar';
    await recargarDatosRent();
    renderListaColectoresRent();
    showToast(id?'Colector actualizado correctamente':'Colector creado correctamente');
  }catch(err){showToast(`No se pudo crear el colector: ${err.message}`,'error');}
}

function editarColectorRent(id){
  const colector=colectoresRentabilidad.find(c=>c.idColector===id);
  if(!colector)return;
  document.getElementById('idColectorRent').value=colector.idColector;
  document.getElementById('nombreColectorRent').value=colector.nombre;
  document.getElementById('descripcionColectorRent').value=colector.descripcion||'';
  document.getElementById('guardarColectorRent').textContent='Guardar cambios';
  document.getElementById('nombreColectorRent').focus();
}

async function cambiarEstadoColectorRent(id,activo){
  try{
    await apiRent(`/api/colectores-costos/${id}`,{method:'PUT',body:JSON.stringify({activo})});
    await recargarDatosRent();
    renderListaColectoresRent();
    showToast('Estado del colector actualizado');
  }catch(err){showToast(`No se pudo actualizar el colector: ${err.message}`,'error');}
}

async function eliminarColectorRent(id){
  if(!confirm('¿Eliminar este colector? Los egresos asociados se conservarán sin colector.'))return;
  try{
    await apiRent(`/api/colectores-costos/${id}`,{method:'DELETE'});
    await recargarDatosRent();
    renderListaColectoresRent();
    showToast('Colector eliminado correctamente');
  }catch(err){showToast(`No se pudo eliminar el colector: ${err.message}`,'error');}
}

async function recargarDatosRent(){
  const resultados=await Promise.all([apiRent('/api/pagos'),apiRent('/api/egresos'),apiRent('/api/colectores-costos')]);
  pagosRentabilidad=Array.isArray(resultados[0])?resultados[0]:[];
  egresosRentabilidad=Array.isArray(resultados[1])?resultados[1]:[];
  colectoresRentabilidad=Array.isArray(resultados[2])?resultados[2]:[];
  cargarSelectColectoresRent();
  actualizarSelectEgresoRent(document.getElementById('colectorEgresoRent')?.value||'');
  aplicarFiltrosRent();
}

prepararDialogosRent();
window.addEventListener('resize',()=>renderGraficoRent());
cargarRentabilidad();
