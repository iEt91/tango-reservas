const REFERENCE_WIDTH=941;
function syncReferenceScale(){const scale=window.innerWidth>REFERENCE_WIDTH?window.innerWidth/REFERENCE_WIDTH:1;document.documentElement.style.setProperty('--page-scale',String(scale))}
syncReferenceScale();window.addEventListener('resize',syncReferenceScale,{passive:true});
const header=document.querySelector('.header');const toggle=document.querySelector('.header__toggle');toggle?.addEventListener('click',()=>{const open=header.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open))});document.querySelectorAll('.header__nav a').forEach(a=>a.addEventListener('click',()=>header.classList.remove('open')));
document.querySelector('form')?.addEventListener('submit',e=>{e.preventDefault();const b=e.currentTarget.querySelector('button');const text=b.textContent;b.textContent='Solicitud preparada';setTimeout(()=>b.textContent=text,1800)});
