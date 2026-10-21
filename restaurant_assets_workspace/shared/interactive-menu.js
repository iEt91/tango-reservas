(function () {
  function visibleProductCount() {
    if (window.matchMedia('(max-width: 520px)').matches) return 1;
    if (window.matchMedia('(max-width: 760px)').matches) return 2;
    return 4;
  }

  function createProduct(product) {
    const article = document.createElement('article');
    article.className = 'menu-product';
    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.name;
    image.loading = 'lazy';
    image.decoding = 'async';
    const name = document.createElement('h3');
    name.textContent = product.name;
    const price = document.createElement('p');
    price.textContent = product.price;
    article.append(image, name, price);
    return article;
  }

  function initializeMenu(root, data) {
    const categories = Array.from(root.querySelectorAll('[data-menu-category]'));
    const panel = root.querySelector('[data-menu-panel]');
    const productsRoot = root.querySelector('[data-menu-products]');
    const previous = root.querySelector('[data-menu-previous]');
    const next = root.querySelector('[data-menu-next]');
    const status = root.querySelector('[data-menu-status]');
    if (!categories.length || !panel || !productsRoot || !previous || !next || !data?.categories) return;

    let activeCategory = null;
    let page = 0;
    const alwaysOpen = root.hasAttribute('data-menu-always-open');

    function productsForActiveCategory() {
      return activeCategory ? data.categories[activeCategory] || [] : [];
    }

    function render() {
      const products = productsForActiveCategory();
      const count = visibleProductCount();
      const pages = Math.max(1, Math.ceil(products.length / count));
      page = Math.min(page, pages - 1);
      const visible = products.slice(page * count, page * count + count);
      productsRoot.replaceChildren(...visible.map(createProduct));
      previous.hidden = products.length <= count;
      next.hidden = products.length <= count;
      previous.disabled = page === 0;
      next.disabled = page === pages - 1;
      status.textContent = products.length > count ? `${page + 1} de ${pages}` : '';
    }

    function setActive(category) {
      activeCategory = activeCategory === category && !alwaysOpen ? null : category;
      page = 0;
      categories.forEach((button) => {
        const isActive = button.dataset.menuCategory === activeCategory;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-expanded', String(isActive));
      });
      if (activeCategory) render();
      panel.classList.toggle('is-open', Boolean(activeCategory));
      panel.setAttribute('aria-hidden', String(!activeCategory));
    }

    categories.forEach((button) => button.addEventListener('click', () => setActive(button.dataset.menuCategory)));
    previous.addEventListener('click', () => { if (page > 0) { page -= 1; render(); } });
    next.addEventListener('click', () => {
      const pages = Math.ceil(productsForActiveCategory().length / visibleProductCount());
      if (page < pages - 1) { page += 1; render(); }
    });

    const initialCategory = root.dataset.menuInitial;
    if (initialCategory && data.categories[initialCategory]) setActive(initialCategory);

    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(() => { if (activeCategory) render(); });
    }, { passive: true });
  }

  document.querySelectorAll('[data-interactive-menu]').forEach((root) => initializeMenu(root, window.restaurantMenuData));
})();
