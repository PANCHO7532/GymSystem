async function aplicarConfiguracionSitio(){
  try{
    const respuesta=await fetch(`${window.location.origin}/api/config`);
    if(!respuesta.ok)throw new Error(`HTTP ${respuesta.status}`);
    const configuracion=await respuesta.json();
    const sitio=configuracion.website||{};
    const titulo=sitio.title||'GymSystem';
    const separador=' — ';
    const seccion=document.title.includes(separador)?document.title.split(separador).slice(1).join(separador):'';
    document.title=seccion?`${titulo}${separador}${seccion}`:titulo;
    document.querySelectorAll('.logo-text, .brand-name').forEach(elemento=>elemento.textContent=titulo.toUpperCase());
    const pieMarca=document.getElementById('brandFooter');
    if(pieMarca)pieMarca.textContent=`${titulo} v1.0`;
    if(sitio.logoPath){
      const url=new URL(sitio.logoPath,`${window.location.origin}/`);
      document.querySelectorAll('.logo-icon, .brand-icon').forEach(elemento=>elemento.hidden=true);
      document.querySelectorAll('.logo-image, .brand-image').forEach(elemento=>{
        elemento.src=url.href;
        elemento.hidden=false;
        elemento.onerror=()=>{
          elemento.hidden=true;
          const icono=elemento.parentElement.querySelector('.logo-icon, .brand-icon');
          if(icono)icono.hidden=false;
        };
      });
    }
  }catch(error){
    console.error('No se pudo cargar la configuración del sitio:',error);
  }
}

document.addEventListener('DOMContentLoaded',aplicarConfiguracionSitio);
