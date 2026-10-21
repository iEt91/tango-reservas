(() => {
  const data = window.MARBELLA_DATA;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const get = (path) => path.split(".").reduce((value, key) => value?.[key], data);
  const lines = (value = "") => String(value).split("\n").map((line) => `<span>${line}</span>`).join("<br>");

  document.title = `${data.business.businessName} | Pinamar`;
  $('meta[name="description"]').content = data.business.description;
  $$('[data-bind]').forEach((element) => { element.textContent = get(element.dataset.bind) ?? ""; });
  $$('[data-bind-lines]').forEach((element) => { element.innerHTML = lines(get(element.dataset.bindLines)); });
  $$('[data-bind-src]').forEach((element) => { element.src = get(element.dataset.bindSrc) ?? ""; });
  $$('[data-bind-alt]').forEach((element) => { element.alt = get(element.dataset.bindAlt) ?? ""; });
  $('[data-bind-src="hero.image"]').style.objectPosition = data.hero.imagePosition;
  $$('[data-section]').forEach((element) => { if (!data.sections[element.dataset.section]) element.hidden = true; });
  $('.experience-grid').style.gridTemplateColumns = ["2fr", data.sections.showReservations && "1fr", data.sections.showDelivery && "2fr"].filter(Boolean).join(" ");
  $('.info-shell').style.gridTemplateColumns = [".96fr", data.sections.showMap && "1.48fr", ".82fr", ".92fr", ".92fr"].filter(Boolean).join(" ");

  $('#heroRightList').innerHTML = data.hero.rightItems.map((item) => `<li>${item}</li>`).join("");
  $('#featuredGrid').innerHTML = data.featured.map((item) => `<article><img src="${item.image}" alt="${item.imageAlt}"><h3>${item.title}</h3><p>${lines(item.description)}</p></article>`).join("");
  $('#galleryGrid').innerHTML = data.gallery.map((item) => `<article class="polaroid"><img src="${item.image}" alt="${item.alt}"><p>${item.caption}</p></article>`).join("");

  const activeCategories = data.menu.categories.filter((category) => category.active).sort((a, b) => a.order - b.order);
  $('#menuCategories').innerHTML = activeCategories.map((category) => `<button class="menu-icon-btn" data-category="${category.id}"><img data-asset-base="${category.iconAsset}" alt=""><span>${lines(category.displayName)}</span></button>`).join("");
  window.dispatchEvent(new Event('marbella:assets-added'));
  $('#reservationFields').innerHTML = data.reservations.fields.map((field, index) => `<label><img data-asset-base="${["18_icono_calendario", "19_icono_personas", "20_icono_reloj_formulario"][index]}" alt=""><span>${field}</span></label>`).join("");
  window.dispatchEvent(new Event('marbella:assets-added'));
  $('[data-bind-address]').innerHTML = data.business.address.replace(", ", ",<br>");
  $('#hoursText').innerHTML = `${data.contact.hours[0]}<br><strong>${data.contact.hours[1]}</strong>`;
  $('[data-phone-link]').href = `tel:${data.business.phone.replace(/[^+\d]/g, "")}`;
  $('[data-instagram-link]').href = `https://instagram.com/${data.business.instagram.replace(/^@/, "")}`;
  $('[data-whatsapp-link]').href = `https://wa.me/${data.business.whatsapp}`;
  $('[data-action-link="map"]').href = data.actions.mapUrl;
  $('[data-action-link="map"]').target = "_blank";

  const mobileToggle = $('#mobileToggle');
  const mainNav = $('#mainNav');
  mobileToggle.addEventListener('click', () => { const open = mainNav.classList.toggle('is-open'); mobileToggle.setAttribute('aria-expanded', String(open)); });
  $$('#mainNav a').forEach((link) => link.addEventListener('click', () => mainNav.classList.remove('is-open')));

  const panel = $('#menuPanel');
  const title = $('#menuPanelTitle');
  const tabs = $('#menuTabs');
  const carousel = $('#menuCarousel');
  let active = activeCategories[0]?.id;
  const productsFor = (categoryId) => data.menu.products.filter((product) => product.categoryId === categoryId && product.visible && product.status === 'active');
  const syncButtons = () => $$('.menu-icon-btn').forEach((button) => button.classList.toggle('is-active', button.dataset.category === active));
  const renderMenu = () => {
    const category = activeCategories.find((item) => item.id === active);
    title.textContent = category?.name ?? '';
    tabs.innerHTML = activeCategories.map((item) => `<button class="menu-tab ${item.id === active ? 'is-active' : ''}" data-tab="${item.id}">${item.name}</button>`).join('');
    carousel.innerHTML = productsFor(active).map((item) => `<article class="menu-item-card"><img src="${item.imageUrl}" alt="${item.name}"><div class="menu-item-copy"><h4>${item.name}</h4><p class="menu-description">${item.description}</p><strong>${item.price}</strong></div></article>`).join('') || '<p class="menu-empty">No hay productos visibles en esta categoría.</p>';
    $$('.menu-tab', tabs).forEach((button) => button.addEventListener('click', () => { active = button.dataset.tab; renderMenu(); syncButtons(); }));
  };
  const openMenu = (categoryId) => { active = categoryId; renderMenu(); syncButtons(); panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false'); };
  $$('.menu-icon-btn').forEach((button) => button.addEventListener('click', () => openMenu(button.dataset.category)));
  $('#menuClose').addEventListener('click', () => { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); });
  $('#prevSlide').addEventListener('click', () => carousel.scrollBy({ left: -260, behavior: 'smooth' }));
  $('#nextSlide').addEventListener('click', () => carousel.scrollBy({ left: 260, behavior: 'smooth' }));
  renderMenu();

  const booking = $('#bookingModal');
  const order = $('#orderModal');
  const openFlow = (type) => {
    const configuredUrl = type === 'reservation' ? data.actions.reservationUrl : data.actions.deliveryUrl;
    if (configuredUrl) { window.location.href = configuredUrl; return; }
    (type === 'reservation' ? booking : order).classList.add('is-open');
  };
  $$('[data-action]').forEach((button) => button.addEventListener('click', () => openFlow(button.dataset.action)));
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => { booking.classList.remove('is-open'); order.classList.remove('is-open'); }));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { booking.classList.remove('is-open'); order.classList.remove('is-open'); } });
})();
