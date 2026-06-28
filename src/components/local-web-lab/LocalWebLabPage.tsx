import styles from "./LocalWebLabPage.module.css";

type IconName =
  | "globe" | "check" | "external" | "edit" | "palette" | "image" | "sections"
  | "drag" | "home" | "story" | "menu" | "star" | "gallery" | "contact"
  | "plus" | "map" | "phone" | "mail" | "instagram" | "facebook" | "whatsapp"
  | "seo" | "desktop" | "mobile" | "chevronDown" | "eye" | "save" | "publish"
  | "sparkle";

type SectionItem = { label: string; icon: IconName };

const sections: SectionItem[] = [
  { label: "Portada", icon: "home" },
  { label: "Historia del restaurante", icon: "story" },
  { label: "Menú destacado", icon: "menu" },
  { label: "Experiencia", icon: "star" },
  { label: "Galería", icon: "gallery" },
  { label: "Contacto y reservas", icon: "contact" },
];

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "globe": return <svg className={className} {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21M12 3c-2.2 2.4-3.3 5.4-3.3 9S9.8 18.6 12 21" /></svg>;
    case "check": return <svg className={className} {...common}><path d="m5 12 4 4 10-10" /></svg>;
    case "external": return <svg className={className} {...common}><path d="M14 5h5v5" /><path d="M10 14 19 5" /><path d="M19 14v5H5V5h5" /></svg>;
    case "edit": return <svg className={className} {...common}><path d="m4 20 4.8-1 9.9-9.9a1.7 1.7 0 0 0 0-2.4l-.4-.4a1.7 1.7 0 0 0-2.4 0L6 15.8 4 20Z" /></svg>;
    case "palette": return <svg className={className} {...common}><path d="M12 4a8 8 0 0 0 0 16h1.5a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.2-3.1H18a6 6 0 0 0 0-12Z" /><path d="M7.5 11h.01M9.5 7.5h.01M14 7.5h.01" /></svg>;
    case "image": return <svg className={className} {...common}><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="m7 14 2.5-2.5 3 3 2-2 2.5 2.5" /><circle cx="9" cy="9" r="1.2" /></svg>;
    case "sections": return <svg className={className} {...common}><path d="M5 6h14M5 12h14M5 18h14" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></svg>;
    case "drag": return <svg className={className} {...common}><path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" /></svg>;
    case "home": return <svg className={className} {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /></svg>;
    case "story": return <svg className={className} {...common}><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
    case "menu": return <svg className={className} {...common}><path d="M8 4v16M16 4v16M4 8h16M4 16h16" /></svg>;
    case "star": return <svg className={className} {...common}><path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3Z" /></svg>;
    case "gallery": return <svg className={className} {...common}><rect x="4" y="6" width="16" height="13" rx="2" /><path d="M8 4h8M8 14l2-2 2 2 2.5-3 2.5 3" /></svg>;
    case "contact": return <svg className={className} {...common}><path d="M5 6h14v12H5z" /><path d="m5 7 7 6 7-6" /></svg>;
    case "plus": return <svg className={className} {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "map": return <svg className={className} {...common}><path d="M12 21s7-4.7 7-11a7 7 0 0 0-14 0c0 6.3 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case "phone": return <svg className={className} {...common}><path d="M6.6 4.8 9 4l2 4-1.7 1.3a10 10 0 0 0 5.4 5.4L16 13l4 2-.8 2.4c-.4 1.2-1.6 1.9-2.9 1.6C10.8 17.8 6.2 13.2 5 7.7c-.3-1.3.4-2.5 1.6-2.9Z" /></svg>;
    case "mail": return <svg className={className} {...common}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="m4 8 8 5 8-5" /></svg>;
    case "instagram": return <svg className={className} {...common}><rect x="5" y="5" width="14" height="14" rx="4" /><circle cx="12" cy="12" r="3" /><path d="M16.4 7.6h.01" /></svg>;
    case "facebook": return <svg className={className} {...common}><path d="M14 8h2V4h-2c-2.2 0-4 1.8-4 4v2H8v4h2v6h4v-6h2.5l.5-4h-3V8c0-.1 0 0 0 0Z" /></svg>;
    case "whatsapp": return <svg className={className} {...common}><path d="M5 20 6.3 16.6A8 8 0 1 1 9 19.1L5 20Z" /><path d="M9.2 8.8c.3 2.6 2.1 4.5 4.8 5.1l1.2-1.2" /></svg>;
    case "seo": return <svg className={className} {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /><path d="M8.5 10.5h4" /></svg>;
    case "desktop": return <svg className={className} {...common}><rect x="3.5" y="5" width="17" height="11" rx="2" /><path d="M8 21h8M12 16v5" /></svg>;
    case "mobile": return <svg className={className} {...common}><rect x="8" y="3.5" width="8" height="17" rx="2" /><path d="M11 17.5h2" /></svg>;
    case "chevronDown": return <svg className={className} {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "eye": return <svg className={className} {...common}><path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
    case "save": return <svg className={className} {...common}><path d="M5 4h12l2 2v14H5z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></svg>;
    case "publish": return <svg className={className} {...common}><path d="M12 19V5" /><path d="m7 10 5-5 5 5" /><path d="M5 19h14" /></svg>;
    case "sparkle": return <svg className={className} {...common}><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" /></svg>;
    default: return null;
  }
}

function Switch({ checked = true }: { checked?: boolean }) {
  return <button type="button" className={`${styles.switch} ${checked ? styles.switchOn : ""}`}><span /></button>;
}

function ColorDot({ color }: { color: string }) {
  return <span className={`${styles.colorDot} ${styles[color]}`} />;
}

function GalleryThumb({ variant }: { variant: string }) {
  return <div className={`${styles.galleryThumb} ${styles[variant]}`}><span /><i /><b /></div>;
}

function FoodCard({ variant, title, description }: { variant: string; title: string; description: string }) {
  return (
    <article className={styles.foodCard}>
      <GalleryThumb variant={variant} />
      <strong>{title}</strong>
      <p>{description}</p>
    </article>
  );
}

function SitePreview() {
  return (
    <section className={styles.previewCard}>
      <div className={styles.siteHero}>
        <div className={styles.siteNav}>
          <strong>DEMURU <span>RESTAURANTE DE AUTOR</span></strong>
          <nav><a>Inicio</a><a>Menú</a><a>Experiencia</a><a>Galería</a><a>Contacto</a><button>Reservar</button></nav>
        </div>
        <div className={styles.heroText}>
          <h2>Cocina de autor<br />junto al mar</h2>
          <p>Productos locales, técnicas contemporáneas y una experiencia única en Pinamar.</p>
          <button>Reservar ahora</button>
        </div>
        <span className={styles.heroArrow}>⌄</span>
      </div>
      <div className={styles.previewMenu}>
        <h3>Menú destacado</h3>
        <p>Una propuesta en constante evolución, donde cada plato cuenta una historia.</p>
        <div className={styles.previewFoods}>
          <FoodCard variant="foodOne" title="Vieira sellada" description="Puré de coliflor, beurre blanc de limón y alcaparras" />
          <FoodCard variant="foodTwo" title="Cordero patagónico" description="Cordero braseado, cremoso de boniato y reducción de malbec" />
          <FoodCard variant="foodThree" title="Texturas de chocolate" description="Cremoso de chocolate 70%, crumble y helado de café" />
        </div>
      </div>
    </section>
  );
}

function MobilePreview() {
  return (
    <aside className={styles.mobilePanel}>
      <span className={styles.panelEyebrow}>Vista móvil</span>
      <div className={styles.phoneFrame}>
        <div className={styles.mobileHero}>
          <div className={styles.mobileNav}><strong>DEMURU</strong><span>☰</span></div>
          <h3>Cocina de autor<br />junto al mar</h3>
          <p>Productos locales, técnicas contemporáneas y una experiencia única en Pinamar.</p>
          <button>Reservar ahora</button>
          <span className={styles.mobileDown}>⌄</span>
        </div>
        <div className={styles.mobileMenu}>
          <h4>Menú destacado</h4>
          <p>Una propuesta en constante evolución, donde cada plato cuenta una historia.</p>
          <GalleryThumb variant="foodOne" />
          <strong>Vieira sellada</strong>
          <span>Puré de coliflor, beurre blanc de limón y alcaparras</span>
          <div className={styles.mobileDots}><i /><i /><i /><i /><i /></div>
        </div>
      </div>
      <p className={styles.responsiveCopy}>El diseño es 100% responsive<br />y se adapta a todos los dispositivos.</p>
      <button type="button" className={styles.openTab}>Probar en nueva pestaña <Icon name="external" /></button>
    </aside>
  );
}

export function LocalWebLabPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1><Icon name="globe" /> Web del local <span>Publicado</span></h1>
            <p>Gestioná la presencia online de tu restaurante y cómo te ven tus clientes.</p>
          </div>
          <div className={styles.headerActions}>
  <button type="button" className={styles.ghostButton}>Vista previa <Icon name="external" /></button>
  <button type="button" className={styles.ghostButton}>Guardar borrador</button>
  <button type="button" className={styles.publishButton}>Publicar cambios <Icon name="chevronDown" /></button>

  <div className={styles.deviceToggle}>
    <button className={styles.deviceActive} type="button"><Icon name="desktop" /></button>
    <button type="button"><Icon name="mobile" /></button>
  </div>

  <button type="button" className={styles.ghostButton}>Ver sitio publicado <Icon name="external" /></button>
  <small>Última publicación: 22/05/2026 15:42</small>
</div>
        </header>

        <section className={styles.layout}>
          <aside className={styles.leftColumn}>
            <article className={styles.card}>
              <h2>Estado del sitio</h2>
              <div className={styles.statusRow}><span className={styles.statusIcon}><Icon name="check" /></span><div><strong>Publicado</strong><p>Tu sitio está online y visible para todos.</p></div></div>
              <button type="button" className={styles.cardButton}>Ver sitio publicado <Icon name="external" /></button>
            </article>

            <article className={styles.card}>
              <h2>Dominio público</h2>
              <div className={styles.domainRow}><span>demuru.rest</span><strong>Conectado</strong></div>
              <div className={styles.cardDivider} />
              <div className={styles.domainEdit}><div><span>Slug público</span><strong>demuru</strong></div><button type="button"><Icon name="edit" /></button></div>
            </article>

            <article className={styles.card}>
              <h2>Apariencia visual</h2>
              <div className={styles.themeRow}><div className={styles.themePreview}>DEMURU</div><div><span>Tema</span><strong>Autor Elegante</strong></div><button type="button">Cambiar</button></div>
              <div className={styles.paletteRow}><span>Paleta de colores</span><ColorDot color="cream" /><ColorDot color="gold" /><ColorDot color="black" /><ColorDot color="blue" /><ColorDot color="dark" /></div>
            </article>

            <article className={styles.card}>
              <h2>Hero principal</h2>
              <div className={styles.heroConfig}><GalleryThumb variant="interior" /><div><span>Imagen de portada</span><strong>hero-demuru.jpg</strong><span>Título</span><strong>Cocina de autor<br />junto al mar</strong></div><button type="button">Editar</button></div>
            </article>

            <article className={`${styles.card} ${styles.sectionsCard}`}>
              <h2>Secciones activas</h2>
              <p>Ordená las secciones que se muestran en tu sitio web.</p>
              <div className={styles.sectionList}>
                {sections.map((section) => (
                  <div key={section.label} className={styles.sectionItem}><Icon name="drag" /><Icon name={section.icon} /><strong>{section.label}</strong><span>Visible</span><Switch /><b>›</b></div>
                ))}
              </div>
              <button type="button" className={styles.addSection}><Icon name="plus" /> Agregar sección</button>
            </article>

            <article className={styles.card}><h2>Galería destacada</h2><div className={styles.galleryRow}><GalleryThumb variant="interior" /><GalleryThumb variant="foodOne" /><GalleryThumb variant="foodTwo" /><GalleryThumb variant="bar" /><button type="button"><Icon name="plus" />Agregar</button></div></article>

            <article className={styles.card}><h2>Menú destacado</h2><div className={styles.featuredMenu}><GalleryThumb variant="foodOne" /><div><strong>Menú Degustación</strong><span>8 pasos · Maridaje opcional</span></div><button type="button">Cambiar</button></div></article>

            <article className={styles.card}>
              <div className={styles.cardTitleLine}><h2>Reservas online / CTA</h2><span>Activo</span></div>
              <div className={styles.ctaRows}><div><span>Botón principal</span><strong>Reservar ahora</strong></div><div><span>Destino</span><strong>Sistema de reservas de Tango</strong></div><button type="button">Editar</button></div>
            </article>

            <article className={styles.card}><h2>Contacto y horarios</h2><div className={styles.contactRows}><p><Icon name="map" /> Av. del Libertador 1234, Pinamar <button>Ver en mapa ↗</button></p><p><Icon name="phone" /> +54 9 11 6677 8899</p><p><Icon name="mail" /> reservas@demuru.com</p></div><button type="button" className={styles.smallEdit}>Editar</button></article>

            <article className={styles.card}><h2>SEO básico</h2><div className={styles.seoRows}><span>Título del sitio</span><strong>Demuru | Restaurante de autor en Pinamar</strong><span>Descripción</span><strong>Cocina de autor, productos locales y una experiencia frente al mar en Pinamar.</strong></div><button type="button" className={styles.smallEdit}>Editar</button></article>

            <article className={styles.card}><h2>Redes sociales</h2><div className={styles.socialRows}><p><Icon name="instagram" /> Instagram <strong>@demuru.restaurant</strong></p><p><Icon name="facebook" /> Facebook <strong>/demururestaurant</strong></p><p><Icon name="whatsapp" /> WhatsApp <strong>+54 9 11 6677 8899</strong></p></div><button type="button" className={styles.smallEdit}>Editar</button></article>
          </aside>

          <section className={styles.centerColumn}>
            <div className={styles.previewHeader}><h2>Vista previa del sitio</h2><p>Así se ve tu sitio para tus clientes</p></div>
            <SitePreview />
          </section>

          <MobilePreview />
        </section>
      </div>
    </main>
  );
}
