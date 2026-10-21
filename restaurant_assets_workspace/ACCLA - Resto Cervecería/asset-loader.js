(() => {
  const data = window.ACCLA_DATA || {};
  const assetDir = data.assetDir || "./assets";
  const extensions = [".png", ".webp", ".jpg", ".jpeg", ".svg"];

  function resolve(img) {
    const base = img.dataset.assetBase;
    if (!base) return;
    let index = 0;

    const tryNext = () => {
      if (index >= extensions.length) {
        img.style.display = "none";
        const fallback = img.parentElement && img.parentElement.querySelector(".brand-fallback");
        if (fallback) fallback.style.display = "inline-flex";
        return;
      }
      img.src = `${assetDir}/${base}${extensions[index++]}`;
    };

    img.addEventListener("error", tryNext);
    img.addEventListener("load", () => {
      const fallback = img.parentElement && img.parentElement.querySelector(".brand-fallback");
      if (fallback) fallback.style.display = "none";
    });
    tryNext();
  }

  document.querySelectorAll("img[data-asset-base]").forEach(resolve);
})();
