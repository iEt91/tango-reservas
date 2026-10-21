(() => {
  const data = window.BORNEO_DATA;
  if (!data) throw new Error("No se pudo cargar BORNEO_DATA.");

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const setText = (selector, value) => { const el = $(selector); if (el) el.textContent = value ?? ""; };
  const setImage = (selector, source) => { const el = $(selector); if (el) el.src = source; };
  const escapeText = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

  const showNotice = (message) => {
    const notice = $("[data-notice]");
    notice.textContent = message;
    notice.hidden = false;
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => { notice.hidden = true; }, 3500);
  };

  const safeNavigate = (url, fallbackMessage) => {
    if (url) window.location.assign(url);
    else showNotice(fallbackMessage);
  };

  const applySectionVisibility = () => {
    const pairs = [
      ["menu", data.sections.showMenu],
      ["reservations", data.sections.showReservations],
      ["delivery", data.sections.showDelivery],
      ["gallery", data.sections.showGallery],
      ["map", data.sections.showMap],
    ];
    pairs.forEach(([name, visible]) => {
      const section = $(`[data-section="${name}"]`);
      if (section) section.hidden = !visible;
    });
    const services = $(".services");
    const visibleColumns = [data.sections.showMenu, data.sections.showReservations, data.sections.showDelivery].filter(Boolean).length;
    services.dataset.columns = String(visibleColumns);
    if (!visibleColumns) services.hidden = true;
    $(".contact").dataset.mapVisible = String(Boolean(data.sections.showMap));
  };

  const bindBusiness = () => {
    document.title = `${data.business.businessName} · Pinamar`;
    $$('[data-business-name]').forEach((el) => { el.textContent = data.business.businessName; });
    setText("[data-address]", data.business.address);
    setText("[data-hours-title]", data.contact.hoursTitle);
    setText("[data-hours]", data.contact.hours);
    setText("[data-contact-title]", data.contact.contactTitle);
    setText("[data-contact-text]", data.contact.contactText);
    setText("[data-year]", new Date().getFullYear());

    const instagramUrl = data.business.instagram ? `https://instagram.com/${data.business.instagram.replace(/^@/, "")}` : "#contacto";
    $$('[data-instagram-link]').forEach((link) => { link.href = instagramUrl; link.target = instagramUrl.startsWith("http") ? "_blank" : ""; link.rel = "noreferrer"; });
    const instagramText = $("[data-contact-instagram]");
    instagramText.textContent = data.business.instagram;
    instagramText.href = instagramUrl;
    instagramText.target = "_blank";
    instagramText.rel = "noreferrer";

    const whatsappLinks = $$('[data-whatsapp-link]');
    const whatsappNumber = String(data.business.whatsapp || "").replace(/\D/g, "");
    whatsappLinks.forEach((link) => {
      if (data.sections.showWhatsApp && whatsappNumber) link.href = `https://wa.me/${whatsappNumber}`;
      else link.hidden = true;
    });
    const map = $("[data-map-link]");
    map.href = data.actions.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.business.address)}`;
  };

  const renderHero = () => {
    setImage("[data-hero-left]", data.hero.leftImage);
    setImage("[data-hero-right]", data.hero.rightImage);
  };

  const renderFeatured = () => {
    const rotations = ["-4deg", "3deg", "-2deg", "4deg"];
    $("[data-featured-list]").innerHTML = data.featured.slice(0, 4).map((item, index) => `
      <article class="featured-card" style="--rotation:${rotations[index]}">
        <img src="${escapeText(item.image)}" alt="${escapeText(item.name)}" />
        <h3>${escapeText(item.name)}</h3>
        <p>${escapeText(item.description)}</p>
      </article>`).join("");
  };

  const renderProducts = (category) => {
    const products = data.menu.products.filter((product) => product.categoryId === category.id && product.visible && product.status === "active");
    setText("[data-products-eyebrow]", category.description);
    setText("[data-products-title]", category.name);
    $("[data-products-grid]").innerHTML = products.length ? products.map((product) => `
      <article class="product-card">
        <img src="${escapeText(product.imageUrl)}" alt="${escapeText(product.name)}" />
        <div class="product-copy"><h4>${escapeText(product.name)}</h4><p>${escapeText(product.description)}</p><strong>${escapeText(product.price)}</strong></div>
      </article>`).join("") : "<p>No hay productos disponibles en esta categoría.</p>";
    const panel = $("[data-menu-products]");
    panel.hidden = false;
    $$('[data-category-list] button').forEach((button) => button.setAttribute("aria-expanded", String(button.dataset.category === category.id)));
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const renderMenu = () => {
    setImage("[data-menu-image]", data.menu.image);
    const categories = [...data.menu.categories].filter((category) => category.active).sort((a, b) => a.order - b.order);
    $("[data-category-list]").innerHTML = categories.map((category) => `
      <button class="category-button" type="button" data-category="${escapeText(category.id)}" aria-expanded="false">
        <img src="${escapeText(category.icon)}" alt="" /><span>${escapeText(category.name)}</span><img src="./assets/23_chevron_derecha.png" alt="" />
      </button>`).join("");
    $$('[data-category]').forEach((button) => button.addEventListener("click", () => {
      const category = categories.find((item) => item.id === button.dataset.category);
      if (category) renderProducts(category);
    }));
    $("[data-products-close]").addEventListener("click", () => {
      $("[data-menu-products]").hidden = true;
      $$('[data-category]').forEach((button) => button.setAttribute("aria-expanded", "false"));
    });
  };

  const renderReservations = () => {
    setText("[data-reservation-title]", data.reservations.title);
    setText("[data-reservation-subtitle]", data.reservations.subtitle);
    setText("[data-reservation-button]", data.reservations.buttonLabel);
    $("[data-reservation-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      safeNavigate(data.actions.reservationUrl, "El flujo de reservas queda listo para conectar con Tango Reservas.");
    });
  };

  const renderDelivery = () => {
    setText("[data-delivery-title]", data.delivery.title);
    $("[data-delivery-options]").innerHTML = data.delivery.options.map((option) => `
      <button class="delivery-option" type="button" data-action="${escapeText(option.action)}">
        <img src="${escapeText(option.icon)}" alt="" /><span><strong>${escapeText(option.title)}</strong><small>${escapeText(option.description)}</small></span><img src="./assets/23_chevron_derecha.png" alt="" />
      </button>`).join("");
    $$('[data-action]').forEach((button) => button.addEventListener("click", () => {
      const key = `${button.dataset.action}Url`;
      safeNavigate(data.actions[key], "El flujo de pedidos queda listo para conectar con Tango Reservas.");
    }));
  };

  const renderGallery = () => {
    $("[data-gallery-list]").innerHTML = data.gallery.slice(0, 5).map((item) => `
      <figure class="gallery-card"><img src="${escapeText(item.image)}" alt="${escapeText(item.alt)}" /><figcaption>${escapeText(item.caption)}</figcaption></figure>`).join("");
  };

  const bindMobileNavigation = () => {
    const button = $(".mobile-menu-button");
    const menu = $("#mobile-nav");
    button.addEventListener("click", () => {
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!expanded));
      menu.hidden = expanded;
    });
    $$("a", menu).forEach((link) => link.addEventListener("click", () => { menu.hidden = true; button.setAttribute("aria-expanded", "false"); }));
  };

  applySectionVisibility();
  bindBusiness();
  renderHero();
  renderFeatured();
  renderMenu();
  renderReservations();
  renderDelivery();
  renderGallery();
  bindMobileNavigation();
})();
