(function () {
  const data = window.ACCLA_DATA;
  const categories = Object.keys(data.menu);

  const tabsContainer = document.getElementById("menuTabs");
  const carousel = document.getElementById("menuCarousel");
  const panel = document.getElementById("menuPanel");
  const panelTitle = document.getElementById("menuPanelTitle");
  const toggleButton = document.getElementById("toggleMenu");
  const closeButton = document.getElementById("menuClose");
  const prevButton = document.getElementById("prevSlide");
  const nextButton = document.getElementById("nextSlide");

  let currentCategory = categories[0];
  let startIndex = 0;

  function renderTabs() {
    tabsContainer.innerHTML = "";
    categories.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "menu-tab" + (category === currentCategory ? " active" : "");
      button.textContent = category.toUpperCase();
      button.addEventListener("click", () => {
        currentCategory = category;
        startIndex = 0;
        renderTabs();
        renderCarousel();
      });
      tabsContainer.appendChild(button);
    });
  }

  function visibleCount() {
    if (window.innerWidth <= 620) return 1;
    if (window.innerWidth <= 980) return 2;
    if (window.innerWidth <= 1300) return 3;
    return 4;
  }

  function renderCarousel() {
    const items = data.menu[currentCategory] || [];
    const amount = visibleCount();
    const maxStart = Math.max(0, items.length - amount);
    startIndex = Math.min(startIndex, maxStart);

    panelTitle.textContent = currentCategory.toUpperCase();
    carousel.innerHTML = "";

    items.slice(startIndex, startIndex + amount).forEach((item) => {
      const article = document.createElement("article");
      article.className = "menu-item";
      article.innerHTML = `
        <img src="${item.image}" alt="${item.name}">
        <h4>${item.name}</h4>
        <p>${item.price}</p>
      `;
      carousel.appendChild(article);
    });

    prevButton.disabled = startIndex <= 0;
    nextButton.disabled = startIndex >= maxStart;

    prevButton.style.opacity = prevButton.disabled ? ".35" : "1";
    nextButton.style.opacity = nextButton.disabled ? ".35" : "1";
  }

  function openPanel() {
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
  }

  function closePanel() {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  }

  toggleButton.addEventListener("click", openPanel);
  closeButton.addEventListener("click", closePanel);

  prevButton.addEventListener("click", () => {
    startIndex = Math.max(0, startIndex - 1);
    renderCarousel();
  });

  nextButton.addEventListener("click", () => {
    const items = data.menu[currentCategory] || [];
    const maxStart = Math.max(0, items.length - visibleCount());
    startIndex = Math.min(maxStart, startIndex + 1);
    renderCarousel();
  });

  window.addEventListener("resize", renderCarousel);

  renderTabs();
  renderCarousel();
})();
