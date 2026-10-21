const REFERENCE_WIDTH=941;

function syncReferenceScale(){
  const scale=window.innerWidth>REFERENCE_WIDTH?window.innerWidth/REFERENCE_WIDTH:1;
  document.documentElement.style.setProperty('--page-scale',String(scale));
}

syncReferenceScale();
window.addEventListener('resize',syncReferenceScale,{passive:true});

const header=document.querySelector('.header');
const toggle=document.querySelector('.header__toggle');
toggle?.addEventListener('click',()=>{
  const open=header.classList.toggle('open');
  toggle.setAttribute('aria-expanded',String(open));
  toggle.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
});
document.querySelectorAll('.header__nav a').forEach(link=>link.addEventListener('click',()=>{
  header.classList.remove('open');
  toggle?.setAttribute('aria-expanded','false');
  toggle?.setAttribute('aria-label','Abrir menú');
}));
