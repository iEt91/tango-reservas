(()=>{
  const extensions=[".png",".webp",".jpg",".jpeg",".svg"];
  const aliases={
    "01_logo_marbella":["01_logo_mar_bella"],
    "03_lettering_mar_sabores_encuentros":["03_lettering_mar_sabores_encuentros","03_lettering_mar_sabores_y_encuentros"],
    "06_rama_azul_destacados_derecha":["06_rama_azul_destacados_derecha","06_rama_azul_de_stacados_derecha"],
    "31_lettering_pinamar_buena_compania":["31_lettering_pinamar_buena_compania","31_lettering_pinamar_se_vive_mejor_en_buena_compania","31_lettering_pinamar_se_vive_mejor_compania"],
    "33_paisaje_costero_footer":["33_paisaje_costero_footer","33_paisaje_costero_o_footer"],
    "34_lettering_mar_gente_marbella":["34_lettering_mar_gente_mar_bella"]
  };
  const tryLoad=(img,candidates,i=0)=>{if(i>=candidates.length){img.style.display='none';return;}img.onerror=()=>tryLoad(img,candidates,i+1);img.src=candidates[i];};
  const loadAssets=()=>document.querySelectorAll('img[data-asset-base]:not([data-asset-loaded])').forEach(img=>{img.dataset.assetLoaded='true';const names=aliases[img.dataset.assetBase]||[img.dataset.assetBase];const candidates=[];names.forEach(n=>extensions.forEach(ext=>candidates.push(`./assets/${n}${ext}`)));tryLoad(img,candidates);});
  loadAssets();
  window.addEventListener('marbella:assets-added',loadAssets);
})();
