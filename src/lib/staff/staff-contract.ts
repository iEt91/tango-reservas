export const STAFF_ACCESS_LEVELS = [
  "none",
  "view",
  "manage",
  "full",
] as const;

export type StaffAccessLevel =
  (typeof STAFF_ACCESS_LEVELS)[number];

export const STAFF_MODULE_DEFINITIONS = [
  { key: "home", label: "Inicio", group: "General" },
  { key: "reservations", label: "Reservas", group: "Salón" },
  { key: "floor_plan", label: "Plano", group: "Salón" },
  { key: "customers", label: "Clientes", group: "Salón" },
  { key: "shipping", label: "Envíos", group: "Pedidos" },
  { key: "kitchen", label: "Cocina", group: "Cocina" },
  { key: "menu", label: "Menú", group: "Cocina" },
  { key: "recipes", label: "Recetas", group: "Cocina" },
  { key: "products", label: "Productos", group: "Cocina" },
  { key: "stock", label: "Stock", group: "Cocina" },
  {
    key: "stock_history",
    label: "Historial de stock",
    group: "Cocina",
  },
  { key: "cash", label: "Caja", group: "Finanzas" },
  { key: "expenses", label: "Gastos", group: "Finanzas" },
  { key: "history", label: "Historial", group: "Finanzas" },
  { key: "reports", label: "Reportes", group: "Finanzas" },
  { key: "web", label: "Web", group: "Administración" },
] as const;

export type StaffModuleKey =
  (typeof STAFF_MODULE_DEFINITIONS)[number]["key"];

export type StaffPermissionMap = Record<
  StaffModuleKey,
  StaffAccessLevel
>;

export const STAFF_ACCESS_LEVEL_OPTIONS: ReadonlyArray<{
  value: StaffAccessLevel;
  label: string;
  description: string;
}> = [
  {
    value: "none",
    label: "Sin acceso",
    description: "No ve ni puede ingresar al módulo.",
  },
  {
    value: "view",
    label: "Solo lectura",
    description: "Puede consultar, pero no modificar.",
  },
  {
    value: "manage",
    label: "Gestión",
    description: "Puede ver, agregar y editar, sin eliminar.",
  },
  {
    value: "full",
    label: "Acceso total",
    description: "Puede ver, agregar, editar y eliminar.",
  },
];

export type StaffRoleEditor = {
  id: string;
  name: string;
  presetKey: string | null;
  isPreset: boolean;
  permissions: StaffPermissionMap;
};

export type StaffMemberStatus =
  | "active"
  | "invited"
  | "disabled";

export type StaffMemberEditor = {
  id: string;
  userId: string | null;
  email: string;
  displayName: string;
  phone: string;
  notes: string;
  staffRoleId: string | null;
  status: StaffMemberStatus;
};

export type BusinessStaffSnapshot = {
  roles: StaffRoleEditor[];
  members: StaffMemberEditor[];
};

export function createNoAccessStaffPermissions(): StaffPermissionMap {
  return Object.fromEntries(
    STAFF_MODULE_DEFINITIONS.map(({ key }) => [
      key,
      "none",
    ]),
  ) as StaffPermissionMap;
}

export function createFullStaffPermissions(): StaffPermissionMap {
  return Object.fromEntries(
    STAFF_MODULE_DEFINITIONS.map(({ key }) => [
      key,
      "full",
    ]),
  ) as StaffPermissionMap;
}

export function isStaffAccessLevel(
  value: unknown,
): value is StaffAccessLevel {
  return (
    typeof value === "string"
    && STAFF_ACCESS_LEVELS.includes(
      value as StaffAccessLevel,
    )
  );
}

export function isStaffModuleKey(
  value: unknown,
): value is StaffModuleKey {
  return STAFF_MODULE_DEFINITIONS.some(
    ({ key }) => key === value,
  );
}

export function normalizeStaffPermissionMap(
  value: unknown,
): StaffPermissionMap {
  const normalized = createNoAccessStaffPermissions();

  if (!value || typeof value !== "object") {
    return normalized;
  }

  for (const { key } of STAFF_MODULE_DEFINITIONS) {
    const candidate = (
      value as Record<string, unknown>
    )[key];

    if (isStaffAccessLevel(candidate)) {
      normalized[key] = candidate;
    }
  }

  return normalized;
}

export function normalizeStaffRoleName(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new Error("El nombre del rol es obligatorio.");
  }

  const normalized = value.trim().replace(/\s+/gu, " ");

  if (normalized.length < 2 || normalized.length > 80) {
    throw new Error(
      "El nombre del rol debe tener entre 2 y 80 caracteres.",
    );
  }

  return normalized;
}

export function normalizeStaffEmail(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new Error("El email del empleado es obligatorio.");
  }

  const normalized = value.trim().toLowerCase();

  if (
    normalized.length > 254
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)
  ) {
    throw new Error("El email del empleado no es válido.");
  }

  return normalized;
}

export function normalizeStaffDisplayName(
  value: unknown,
): string {
  if (typeof value !== "string") {
    throw new Error(
      "El nombre y apellido del empleado son obligatorios.",
    );
  }

  const normalized = value.trim().replace(/\s+/gu, " ");

  if (normalized.length < 2 || normalized.length > 120) {
    throw new Error(
      "El nombre debe tener entre 2 y 120 caracteres.",
    );
  }

  return normalized;
}

export function normalizeStaffOptionalText(
  value: unknown,
  maxLength: number,
  label: string,
): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    throw new Error(`${label} no es válido.`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new Error(
      `${label} no puede superar ${maxLength} caracteres.`,
    );
  }

  return normalized;
}

export function normalizeStaffEntityId(
  value: unknown,
  label: string,
  options: {
    nullable?: boolean;
  } = {},
): string | null {
  if (
    options.nullable
    && (value === null || value === undefined || value === "")
  ) {
    return null;
  }

  if (
    typeof value !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    )
  ) {
    throw new Error(`${label} no es válido.`);
  }

  return value;
}

const ACCESS_LEVEL_WEIGHT: Record<StaffAccessLevel, number> = {
  none: 0,
  view: 1,
  manage: 2,
  full: 3,
};

export function hasStaffAccess(
  permissions: StaffPermissionMap | undefined,
  moduleKey: StaffModuleKey,
  minimum: StaffAccessLevel = "view",
) {
  const current = permissions?.[moduleKey] ?? "none";

  return (
    ACCESS_LEVEL_WEIGHT[current]
    >= ACCESS_LEVEL_WEIGHT[minimum]
  );
}

export function getStaffModuleForPathname(
  pathname: string,
): StaffModuleKey | null {
  if (pathname === "/local") return "home";

  if (
    pathname === "/local/menu/recetas"
    || pathname.startsWith("/local/menu/recetas/")
  ) {
    return "recipes";
  }

  if (
    pathname === "/local/stock/historial"
    || pathname.startsWith("/local/stock/historial/")
  ) {
    return "stock_history";
  }

  const routePrefixes: ReadonlyArray<
    readonly [string, StaffModuleKey]
  > = [
    ["/local/reservas", "reservations"],
    ["/local/plano", "floor_plan"],
    ["/local/clientes", "customers"],
    ["/local/envios", "shipping"],
    ["/local/cocina", "kitchen"],
    ["/local/menu", "menu"],
    ["/local/productos", "products"],
    ["/local/stock", "stock"],
    ["/local/caja", "cash"],
    ["/local/gastos", "expenses"],
    ["/local/historial", "history"],
    ["/local/reportes", "reports"],
    ["/local/web", "web"],
  ];

  for (const [prefix, moduleKey] of routePrefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return moduleKey;
    }
  }

  return null;
}
