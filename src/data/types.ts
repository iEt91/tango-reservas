export type BusinessStatus = "active" | "draft" | "inactive";

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type PublicThemeId =
  | "restaurant_elegant"
  | "beach_club_dark"
  | "cafe_minimal";

export type PublicTemplateId =
  | "restaurant-elegant"
  | "compact-premium"
  | "minimal-cafe";

export type Business = {
  id: string;
  name: string;
  slug: string;
  category: string;
  city: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  websiteUrl: string;
  logoUrl: string;
  coverImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  themeId: PublicThemeId;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutText: string;
  menuTitle: string;
  reservationTitle: string;
  ctaLabel: string;
  showHero: boolean;
  showAbout: boolean;
  showGallery: boolean;
  showMenu: boolean;
  showLocation: boolean;
  showReservation: boolean;
  showWhatsappButton: boolean;
  autoConfirmReservations: boolean;
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
};

export type BusinessFormValues = Omit<Business, "id" | "createdAt" | "updatedAt">;

export type BusinessHours = {
  id: string;
  businessId: string;
  dayOfWeek: DayOfWeek;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStartTime?: string | null;
  breakEndTime?: string | null;
};

export type ReservationRules = {
  id: string;
  businessId: string;
  slotDurationMinutes: number;
  maxReservationsPerSlot: number;
  minNoticeMinutes: number;
  maxDaysAhead: number;
  requiresConfirmation: boolean;
  allowCancellation: boolean;
  cancellationLimitHours: number;
};

export type AvailabilitySlot = {
  time: string;
  available: boolean;
  remainingCapacity: number;
  reason?: string;
};

export type Service = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  durationMinutes: number;
  capacity: number;
  price?: number | null;
  isActive: boolean;
};

export type MenuCategory = {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MenuItem = {
  id: string;
  businessId: string;
  categoryId: string;
  name: string;
  description: string;
  price?: number | null;
  imageDataUrl?: string | null;
  imageUrl?: string | null;
  imagePlaceholder?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
  sortOrder: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type PublicWebGalleryItem = {
  id: string;
  businessId: string;
  title: string;
  description?: string | null;
  altText?: string | null;
  imageDataUrl?: string | null;
  imageUrl?: string | null;
  imagePlaceholder?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicWebContent = {
  businessId: string;
  publicName?: string | null;
  publicSubtitle?: string | null;
  publicDescription?: string | null;
  publicBadge?: string | null;
  publicAttributesText?: string | null;
  publicTemplateId?: PublicTemplateId | null;
  heroDescription?: string | null;
  publicCategory?: string | null;
  publicCity?: string | null;
  publicAddress?: string | null;
  publicPhone?: string | null;
  heroTitle: string;
  heroSubtitle: string;
  heroSecondaryCtaLabel?: string | null;
  menuTitle?: string | null;
  menuSubtitle?: string | null;
  aboutTitle?: string | null;
  aboutText?: string | null;
  presentationTitle: string;
  presentationText: string;
  aboutHighlights?: string[];
  featuredPhrase: string;
  mapLabel?: string | null;
  locationTitle: string;
  locationText: string;
  heroImageDataUrl?: string | null;
  heroImageUrl?: string | null;
  heroImagePlaceholder?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  websiteUrl?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  googleMapsUrl?: string | null;
  mapEmbedUrl?: string | null;
  ctaLabel: string;
  showHero: boolean;
  showAbout: boolean;
  showFeaturedMenu?: boolean;
  showGallery: boolean;
  showMenu: boolean;
  showLocation: boolean;
  showReservation: boolean;
  showReservations?: boolean;
  showWhatsappButton: boolean;
  showEmailButton?: boolean;
  showSocials?: boolean;
  updatedAt: string;
};

export type FloorTableStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "blocked"
  | "out_of_service";

export type FloorTableShape = "square" | "rectangle" | "round";

export type FloorPlanBackgroundFit = "contain" | "cover" | "stretch";

export type FloorPlanBackground = {
  businessId: string;
  backgroundImage: string | null;
  backgroundOpacity: number;
  backgroundBrightness: number;
  backgroundContrast: number;
  backgroundX: number;
  backgroundY: number;
  backgroundWidth: number;
  backgroundHeight: number;
  fit: FloorPlanBackgroundFit;
  updatedAt: string;
};

export type JoinedTableStatus = "active" | "released";

export type JoinedTable = {
  id: string;
  businessId: string;
  tableIds: string[];
  label: string;
  totalSeats: number;
  reservationId?: string | null;
  reservationDate?: string | null;
  reservationTime?: string | null;
  status: JoinedTableStatus;
  createdAt: string;
  updatedAt: string;
};

export type FloorTable = {
  id: string;
  businessId: string;
  label: string;
  seats: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status: FloorTableStatus;
  shape: FloorTableShape;
  cornerRadius: number;
  isJoinable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReservationSource = "web" | "whatsapp" | "instagram" | "manual" | "admin";

export type DepositStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type DepositProvider = "manual_transfer" | "mercado_pago" | "other";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type Reservation = {
  id: string;
  businessId: string;
  serviceId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  status: ReservationStatus;
  notes?: string | null;
  source: ReservationSource;
  tableId?: string | null;
  tableLabel?: string | null;
  joinedTableId?: string | null;
  joinedTableLabel?: string | null;
  assignedTableIds?: string[] | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  normalizedPhone?: string | null;
  requiresDeposit?: boolean;
  depositAmount?: number | null;
  depositStatus?: DepositStatus;
  depositProvider?: DepositProvider | null;
  isDemo?: boolean;
  demoBatch?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TableOccupancySummary = {
  businessId?: string;
  date?: string;
  time?: string;
  occupiedTableIds: string[];
  reservationsWithoutTable: Reservation[];
  assignmentsByTableId: Record<string, Reservation[]>;
  joinedTableByTableId: Record<string, JoinedTable | null>;
  availableTableIds?: string[];
  warningsByTableId?: Record<string, string[]>;
  conflictsByTableId?: Record<string, string[]>;
  capacityAvailable?: number;
  capacityOccupied?: number;
  reservationsWithoutTableCount?: number;
  conflictCount?: number;
};

export type Customer = {
  id: string;
  customerKey: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string | null;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  completedReservations: number;
  noShowReservations: number;
  lastReservationAt: string;
  nextReservationAt?: string | null;
  tags: string[];
  notes: string;
  preferences: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerNote = {
  id: string;
  customerId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerStats = {
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  completedReservations: number;
  noShowReservations: number;
  recurringReservations: number;
  lastReservationAt: string;
  nextReservationAt?: string | null;
};

export type CreateReservationInput = Omit<
  Reservation,
  "id" | "status" | "createdAt" | "updatedAt"
> & {
  customerEmail?: string | null;
  notes?: string | null;
  status?: ReservationStatus;
  source?: ReservationSource;
};

export type DashboardMetrics = {
  pending: number;
  confirmed: number;
  cancelled: number;
};

export type BusinessFiltersState = {
  search: string;
  status: BusinessStatus | "all";
  city: string;
  category: string;
  sortBy: "name" | "status" | "city" | "reservations" | "activity";
};
