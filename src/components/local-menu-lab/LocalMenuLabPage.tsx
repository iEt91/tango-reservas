import styles from "./LocalMenuLabPage.module.css";

type IconName =
  | "home"
  | "reservas"
  | "calendario"
  | "plano"
  | "crm"
  | "config"
  | "menu"
  | "web"
  | "reportes"
  | "eye"
  | "download"
  | "shuffle"
  | "plus"
  | "search"
  | "filter"
  | "chevronDown"
  | "star"
  | "edit"
  | "image"
  | "close"
  | "grip"
  | "check"
  | "trash"
  | "copy"
  | "clock"
  | "stock"
  | "category";

type Stat = {
  title: string;
  value: string;
  helper: string;
  sub?: string;
  link: string;
  icon: IconName;
  tone: "blue" | "cyan" | "red" | "amber" | "slate";
};

type Category = {
  name: string;
  count: number;
  icon: IconName;
  active?: boolean;
};

type Dish = {
  name: string;
  description: string;
  category: string;
  tag?: string;
  available: boolean;
  featured?: boolean;
  price: string;
  photo: string;
};

const stats: Stat[] = [
  { title: "Categorías", value: "9", helper: "activas", sub: "1 inactiva", link: "Ver todas", icon: "category", tone: "blue" },
  { title: "Total de platos", value: "56", helper: "en carta", sub: "3 borradores", link: "Ver todas", icon: "menu", tone: "cyan" },
  { title: "Fuera de stock", value: "2", helper: "platos", sub: "3,6% del total", link: "Ver todas", icon: "stock", tone: "red" },
  { title: "Destacados", value: "12", helper: "platos", sub: "21% del total", link: "Ver todas", icon: "star", tone: "amber" },
  { title: "Última actualización", value: "Hoy, 12:45", helper: "por Mariano Demuru", link: "Historial de cambios", icon: "clock", tone: "slate" },
];

const categories: Category[] = [
  { name: "Todas las categorías", count: 56, icon: "category", active: true },
  { name: "Entradas", count: 8, icon: "reservas" },
  { name: "Principales", count: 16, icon: "home" },
  { name: "Pastas", count: 7, icon: "menu" },
  { name: "Carnes", count: 7, icon: "stock" },
  { name: "Pescados", count: 6, icon: "web" },
  { name: "Postres", count: 6, icon: "star" },
  { name: "Vinos", count: 14, icon: "clock" },
  { name: "Cócteles", count: 5, icon: "crm" },
  { name: "Sin alcohol", count: 3, icon: "config" },
  { name: "Inactiva", count: 1, icon: "clock" },
];

const dishes: Dish[] = [
  {
    name: "Tartar de atún rojo",
    description: "Atún rojo, palta, sésamo tostado, aceite de oliva y cítricos.",
    category: "Entradas",
    tag: "Sin gluten",
    available: true,
    featured: true,
    price: "$ 18.500",
    photo: "tartar",
  },
  {
    name: "Burrata con tomates confitados",
    description: "Burrata cremosa, tomates confitados, albahaca y aceite de oliva.",
    category: "Entradas",
    tag: "Vegetariano",
    available: true,
    price: "$ 16.200",
    photo: "burrata",
  },
  {
    name: "Ravioles de calabaza",
    description: "Ravioles caseros de calabaza, manteca de salvia y parmesano.",
    category: "Pastas",
    tag: "Vegetariano",
    available: true,
    price: "$ 19.800",
    photo: "ravioles",
  },
  {
    name: "Risotto de hongos",
    description: "Arroz carnaroli, hongos de estación y aceite de trufa.",
    category: "Pastas",
    tag: "Sin gluten",
    available: true,
    featured: true,
    price: "$ 21.000",
    photo: "risotto",
  },
  {
    name: "Bife madurado 45 días",
    description: "Corte de bife madurado, papas rústicas y chimichurri.",
    category: "Carnes",
    available: true,
    price: "$ 29.500",
    photo: "bife",
  },
  {
    name: "Pesca del día",
    description: "Pesca fresca, vegetales asados y salsa de limón.",
    category: "Pescados",
    tag: "Sin gluten",
    available: true,
    price: "$ 24.000",
    photo: "pesca",
  },
  {
    name: "Volcán de chocolate",
    description: "Chocolate caliente, corazón cremoso y helado de vainilla.",
    category: "Postres",
    tag: "Vegetariano",
    available: false,
    featured: true,
    price: "$ 11.800",
    photo: "volcan",
  },
  {
    name: "Tiramisú",
    description: "Clásico tiramisú de mascarpone y café.",
    category: "Postres",
    tag: "Vegetariano",
    available: true,
    price: "$ 9.800",
    photo: "tiramisu",
  },
  {
    name: "Malbec Reserva",
    description: "Bodega Catena Zapata, Mendoza.",
    category: "Vinos",
    available: true,
    price: "$ 32.000",
    photo: "malbec",
  },
  {
    name: "Negroni de autor",
    description: "Gin macerado, vermut rosso y bitter artesanal.",
    category: "Cócteles",
    available: true,
    price: "$ 12.500",
    photo: "negroni",
  },
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
    case "home":
      return <svg className={className} {...common}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-6h5v6" /></svg>;
    case "reservas":
      return <svg className={className} {...common}><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M8 3.5v3M16 3.5v3M4 9h16" /></svg>;
    case "calendario":
      return <svg className={className} {...common}><rect x="4" y="4.5" width="16" height="15.5" rx="2.5" /><path d="M8 3v3M16 3v3M8 12h8M8 16h5" /></svg>;
    case "plano":
      return <svg className={className} {...common}><path d="M4 5h5l6 3h5v11h-5l-6-3H4V5Z" /><path d="M9 5v11M15 8v11" /></svg>;
    case "crm":
      return <svg className={className} {...common}><path d="M7 11a4 4 0 1 1 4-4" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M17 9v8M13 13h8" /></svg>;
    case "config":
      return <svg className={className} {...common}><circle cx="12" cy="12" r="3.2" /><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-1.9-1.1L14.3 3h-4.6l-.4 2.8a7.5 7.5 0 0 0-1.9 1.1l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 2 3.5 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2.8h4.6l.4-2.8c.7-.3 1.3-.6 1.9-1.1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1.1Z" /></svg>;
    case "menu":
      return <svg className={className} {...common}><path d="M8 4v16M16 4v16M4 8h16M4 16h16" /></svg>;
    case "web":
      return <svg className={className} {...common}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2 2.3 3 5.3 3 9s-1 6.7-3 9M12 3c-2 2.3-3 5.3-3 9s1 6.7 3 9" /></svg>;
    case "reportes":
      return <svg className={className} {...common}><path d="M5 20V9M12 20V4M19 20v-7" /><path d="M3 20h18" /></svg>;
    case "eye":
      return <svg className={className} {...common}><path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6Z" /><circle cx="12" cy="12" r="2.6" /></svg>;
    case "download":
      return <svg className={className} {...common}><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 20h14" /></svg>;
    case "shuffle":
      return <svg className={className} {...common}><path d="M16 3h5v5" /><path d="M4 7h2.6c2.5 0 4.1 2 5.3 4.5 1.2 2.5 2.8 4.5 5.5 4.5H20" /><path d="M16 21h5v-5" /></svg>;
    case "plus":
      return <svg className={className} {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case "search":
      return <svg className={className} {...common}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>;
    case "filter":
      return <svg className={className} {...common}><path d="M4 6h16l-6 7v5l-4 2v-7L4 6Z" /></svg>;
    case "chevronDown":
      return <svg className={className} {...common}><path d="m6 9 6 6 6-6" /></svg>;
    case "star":
      return <svg className={className} {...common}><path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3Z" /></svg>;
    case "edit":
      return <svg className={className} {...common}><path d="m4 20 4.8-1 9.9-9.9a1.7 1.7 0 0 0 0-2.4l-.4-.4a1.7 1.7 0 0 0-2.4 0L6 15.8 4 20Z" /></svg>;
    case "image":
      return <svg className={className} {...common}><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="m7 14 2.5-2.5 3 3 2-2 2.5 2.5" /><circle cx="9" cy="9" r="1.2" /></svg>;
    case "close":
      return <svg className={className} {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
    case "grip":
      return <svg className={className} {...common}><path d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" /></svg>;
    case "check":
      return <svg className={className} {...common}><path d="m5 12 4 4 10-10" /></svg>;
    case "trash":
      return <svg className={className} {...common}><path d="M5 7h14" /><path d="M9 7V5.5h6V7" /><path d="M8 7.5v11h8v-11" /></svg>;
    case "copy":
      return <svg className={className} {...common}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" /></svg>;
    case "clock":
      return <svg className={className} {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
    case "stock":
      return <svg className={className} {...common}><path d="M6 19 19 6M8 6h10v10" /><path d="M5 5l14 14" /></svg>;
    case "category":
      return <svg className={className} {...common}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;
    default:
      return null;
  }
}

function TopAction({ icon, label, primary = false }: { icon: IconName; label: string; primary?: boolean }) {
  return (
    <button type="button" className={`${styles.topAction} ${primary ? styles.primaryTopAction : ""}`}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function DishPhoto({ photo, large = false }: { photo: string; large?: boolean }) {
  return (
    <div className={`${styles.dishPhoto} ${large ? styles.largePhoto : ""} ${styles[`dish_${photo}`]}`} aria-hidden="true">
      <span className={styles.photoBase} />
      <span className={styles.photoFoodA} />
      <span className={styles.photoFoodB} />
      <span className={styles.photoFoodC} />
      <span className={styles.photoLeafA} />
      <span className={styles.photoLeafB} />
    </div>
  );
}

function Switch({ checked = true }: { checked?: boolean }) {
  return (
    <button type="button" className={`${styles.switch} ${checked ? styles.switchOn : ""}`} aria-pressed={checked}>
      <span />
    </button>
  );
}

export function LocalMenuLabPage() {
  const selectedDish = dishes[0];

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Gestiona la carta del restaurante <span>🍴</span></h1>
            <p>Administra categorías, platos y opciones de tu carta para ofrecer la mejor experiencia.</p>
          </div>

          <div className={styles.actions}>
            <TopAction icon="eye" label="Vista previa" />
            <TopAction icon="download" label="Importar" />
            <TopAction icon="shuffle" label="Reordenar" />
            <TopAction icon="plus" label="Nuevo plato" primary />
          </div>
        </header>

        <section className={styles.stats}>
          {stats.map((stat) => (
            <article key={stat.title} className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles[`tone_${stat.tone}`]}`}>
                <Icon name={stat.icon} />
              </div>
              <div className={styles.statCopy}>
                <span>{stat.title}</span>
                <strong>{stat.value} <em>{stat.helper}</em></strong>
                {stat.sub ? <small>{stat.sub}</small> : <small>{stat.helper}</small>}
              </div>
              <button type="button">{stat.link} →</button>
            </article>
          ))}
        </section>

        <section className={styles.board}>
          <aside className={styles.categories}>
            <div className={styles.categoryHeader}>
              <h2>Categorías</h2>
              <button type="button">+ Nueva categoría</button>
            </div>

            <div className={styles.categoryList}>
              {categories.map((category) => (
                <button
                  type="button"
                  key={category.name}
                  className={`${styles.category} ${category.active ? styles.categoryActive : ""}`}
                >
                  <Icon name={category.icon} />
                  <strong>{category.name}</strong>
                  <em>{category.count}</em>
                </button>
              ))}
            </div>
          </aside>

          <section className={styles.dishes}>
            <div className={styles.filters}>
              <label className={styles.search}>
                <Icon name="search" />
                <input placeholder="Buscar plato o ingrediente..." />
              </label>

              <button type="button" className={styles.selectFilter}>
                <span>Estado <strong>Todos</strong></span>
                <Icon name="chevronDown" />
              </button>

              <button type="button" className={styles.selectFilter}>
                <span>Disponibilidad <strong>Todas</strong></span>
                <Icon name="chevronDown" />
              </button>

              <button type="button" className={styles.filterButton}>
                <Icon name="filter" />
                Filtros
              </button>
            </div>

            <div className={styles.resultBar}>
              <span>56 platos encontrados</span>
              <button type="button">Ordenar por: <strong>Orden personalizado</strong> <Icon name="chevronDown" /></button>
            </div>

            <div className={styles.dishList}>
              {dishes.map((dish, index) => (
                <article key={dish.name} className={`${styles.dishRow} ${index === 0 ? styles.selectedDish : ""}`}>
                  <Icon name="grip" className={styles.grip} />
                  <DishPhoto photo={dish.photo} />

                  <div className={styles.dishCopy}>
                    <div>
                      <strong>{dish.name}</strong>
                      {dish.featured ? <Icon name="star" /> : null}
                    </div>
                    <p>{dish.description}</p>
                  </div>

                  <span className={styles.categoryBadge}>{dish.category}</span>
                  {dish.tag ? <span className={styles.tagBadge}>{dish.tag}</span> : <span className={styles.emptyBadge}>—</span>}
                  <span className={`${styles.stockBadge} ${dish.available ? styles.available : styles.unavailable}`}>
                    {dish.available ? "Disponible" : "Sin stock"}
                  </span>
                  <strong className={styles.price}>{dish.price}</strong>

                  <div className={styles.rowActions}>
                    <button type="button" aria-label={`Editar ${dish.name}`}><Icon name="edit" /></button>
                    <button type="button" aria-label={`Más acciones ${dish.name}`}>...</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.details}>
            <div className={styles.detailsHeader}>
              <h2>Detalles del plato</h2>
              <button type="button" aria-label="Cerrar"><Icon name="close" /></button>
            </div>

            <div className={styles.imageRow}>
              <DishPhoto photo={selectedDish.photo} large />
              <div>
                <button type="button"><Icon name="image" /> Cambiar imagen</button>
                <span>JPG, PNG o WebP. Máx 5MB</span>
              </div>
            </div>

            <div className={styles.form}>
              <label className={styles.field}>
                <span>Nombre del plato</span>
                <div>{selectedDish.name}</div>
              </label>

              <label className={`${styles.field} ${styles.description}`}>
                <span>Descripción</span>
                <textarea defaultValue={selectedDish.description} />
              </label>

              <div className={styles.formPair}>
                <label className={styles.field}><span>Precio</span><div>{selectedDish.price}</div></label>
                <label className={styles.field}><span>Categoría</span><div>Entradas <Icon name="chevronDown" /></div></label>
              </div>

              <div className={styles.formPair}>
                <label className={styles.field}><span>Disponibilidad</span><div><i />Disponible <Icon name="chevronDown" /></div></label>
                <label className={styles.field}><span>Tipo de servicio</span><div className={styles.segmented}><b>Sala</b><em>Delivery</em><em>Take away</em></div></label>
              </div>

              <label className={styles.chipsField}>
                <span>Etiquetas</span>
                <div><strong>Sin gluten ×</strong><strong>Alta demanda ×</strong><button type="button">+</button></div>
              </label>

              <label className={styles.chipsField}>
                <span>Alérgenos</span>
                <div><strong>Pescado ×</strong><strong>Sésamo ×</strong><button type="button">+</button></div>
              </label>

              <div className={styles.toggles}>
                <label><Switch /> Destacado</label>
                <label><Switch checked={false} /> Mostrar en menú degustación</label>
                <label><Switch /> Mostrar en web</label>
              </div>
            </div>

            <div className={styles.detailActions}>
              <button type="button" className={styles.delete}><Icon name="trash" /> Eliminar</button>
              <button type="button" className={styles.duplicate}><Icon name="copy" /> Duplicar</button>
              <button type="button" className={styles.save}>Guardar cambios</button>
            </div>

            <p className={styles.meta}>Creado: 15/03/2025 11:20 · Actualizado: Hoy, 12:45</p>
          </aside>
        </section>

        <footer className={styles.footer}>
          <Icon name="check" />
          <span>Todos los cambios se guardan automáticamente. Último guardado: Hoy, 12:45</span>
        </footer>
      </div>
    </main>
  );
}
