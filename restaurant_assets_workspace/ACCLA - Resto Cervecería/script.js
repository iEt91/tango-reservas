(function () {
  const data = window.ACCLA_DATA;

  // Horarios
  const hoursList = document.getElementById("hoursList");
  data.hours.forEach(([day, time]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = day;
    dd.textContent = time;
    hoursList.appendChild(dt);
    hoursList.appendChild(dd);
  });

  // Menú mobile
  const nav = document.getElementById("mainNav");
  const mobileToggle = document.getElementById("mobileToggle");
  mobileToggle?.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    mobileToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      mobileToggle?.setAttribute("aria-expanded", "false");
    });
  });

  // Modal
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const modalContent = document.getElementById("modalContent");

  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.getAttribute("data-open-modal");
      const config = data.modalContent[key];
      if (!config) return;

      modalTitle.textContent = config.title;
      modalContent.innerHTML = config.html;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }
  });
})();
