"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { CalendarDays, ChevronRight, MapPin, Phone, ShoppingBag, Sparkles } from "lucide-react";

export type RestaurantTemplateVariant =
  | "mediterraneo-costero"
  | "izakaya-japones"
  | "trattoria-italiana"
  | "parrilla-argentina"
  | "cafe-vegetal"
  | "menu-degustacion"
  | "pizzeria-napolitana"
  | "sushi-omakase"
  | "panaderia-brunch";

type MenuItem = { id: string; name: string; description: string; price: number; imageUrl?: string; imageSlot?: string };
type ReservationForm = { client: string; phone: string; email: string; people: number; date: string; time: string; note: string };

type Props = {
  variant: RestaurantTemplateVariant;
  businessName: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  address: string;
  phone: string;
  instagram: string;
  showMenu: boolean;
  showReservations: boolean;
  showDelivery: boolean;
  showGallery: boolean;
  bookingWindowDays: number;
  durationMinutes: number;
  capacity: number;
  menuItems: MenuItem[];
  imageValues: Record<string, string>;
  reservationForm: ReservationForm;
  availableTimes: string[];
  reservationError: string;
  onOpenOrder: () => void;
  onReservationChange: <K extends keyof ReservationForm>(field: K, value: ReservationForm[K]) => void;
  onReservationSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type Theme = { page: string; ink: string; dark: string; accent: string; soft: string; line: string; tag: string; rounded?: boolean };

const themes: Record<RestaurantTemplateVariant, Theme> = {
  "mediterraneo-costero": { page: "#fffaf0", ink: "#173b68", dark: "#124b91", accent: "#efbd2b", soft: "#e8f2f5", line: "#c6d7df", tag: "Sabores junto al mar", rounded: true },
  "izakaya-japones": { page: "#e9dfcb", ink: "#1b1714", dark: "#151313", accent: "#b7372f", soft: "#24201d", line: "#b9a98e", tag: "夜の台所" },
  "trattoria-italiana": { page: "#f6eedc", ink: "#303725", dark: "#53673e", accent: "#c55238", soft: "#efe0bc", line: "#d2b980", tag: "Fatto in casa", rounded: true },
  "parrilla-argentina": { page: "#171a18", ink: "#f5eddd", dark: "#0f1510", accent: "#d15a37", soft: "#274631", line: "#736d58", tag: "Brasas encendidas" },
  "cafe-vegetal": { page: "#f3f6ed", ink: "#314b3a", dark: "#4f7458", accent: "#d47f55", soft: "#dce9d4", line: "#b4c8ad", tag: "Café y cocina de día", rounded: true },
  "menu-degustacion": { page: "#0b1321", ink: "#f3ead6", dark: "#08101c", accent: "#c8a15c", soft: "#17243a", line: "#746340", tag: "Una cena en varios pasos" },
  "pizzeria-napolitana": { page: "#f7eedc", ink: "#1f3864", dark: "#1d477e", accent: "#d5503b", soft: "#f7cf57", line: "#1f3864", tag: "Impasto · forno · amore", rounded: true },
  "sushi-omakase": { page: "#f6f0e5", ink: "#152133", dark: "#142033", accent: "#c6453c", soft: "#ebe4d7", line: "#aab0ab", tag: "おまかせ · Omakase" },
  "panaderia-brunch": { page: "#fff4e8", ink: "#714530", dark: "#9b5b40", accent: "#e89167", soft: "#f7d6bf", line: "#e4b897", tag: "Hecho temprano, servido rico", rounded: true },
};

const gallerySlots = ["espacio1", "espacio2", "espacio3", "espacio4", "espacio5"];

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function hasLocalImage(source?: string) {
  return Boolean(source && !source.startsWith("/template-concepts/"));
}

function LocalImage({ source, alt, className = "" }: { source?: string; alt: string; className?: string }) {
  if (hasLocalImage(source)) return <Image src={source!} alt={alt} fill unoptimized className={`object-cover ${className}`} />;
  return <div className={`relative h-full w-full overflow-hidden bg-[linear-gradient(135deg,rgba(255,255,255,.24),transparent_45%),linear-gradient(135deg,#254638,#d28d55)] ${className}`} aria-label={alt}><div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.55),transparent_22%),radial-gradient(circle_at_78%_65%,rgba(0,0,0,.2),transparent_40%)]" /><span className="absolute bottom-4 left-4 border border-white/50 bg-black/25 px-3 py-2 text-xs font-semibold text-white">Foto del local</span></div>;
}

function ReservationFormBlock({ theme, form, times, error, onChange, onSubmit }: { theme: Theme; form: ReservationForm; times: string[]; error: string; onChange: Props["onReservationChange"]; onSubmit: Props["onReservationSubmit"] }) {
  const input = "w-full border bg-white/75 px-3 py-3 text-sm outline-none transition focus:ring-2";
  return <form onSubmit={onSubmit} className="p-6 sm:p-8" style={{ backgroundColor: theme.page, color: theme.ink, border: `1px solid ${theme.line}` }}>
    <p className="text-xs font-black uppercase tracking-[.18em]" style={{ color: theme.accent }}>Reservas online</p>
    <h2 className="mt-2 font-serif text-3xl">Elegí fecha, hora y mesa.</h2>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {(["client", "phone", "email"] as const).map((field) => <label key={field} className={field === "email" ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">{field === "client" ? "Nombre" : field === "phone" ? "Teléfono" : "Email"}</span><input required type={field === "email" ? "email" : "text"} value={form[field]} onChange={(e) => onChange(field, e.target.value)} className={input} style={{ borderColor: theme.line, color: theme.ink, boxShadow: `0 0 0 0 ${theme.accent}` }} /></label>)}
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">Personas</span><input required min={1} type="number" value={form.people} onChange={(e) => onChange("people", Number(e.target.value))} className={input} style={{ borderColor: theme.line, color: theme.ink }} /></label>
      <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">Fecha</span><input required type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} className={input} style={{ borderColor: theme.line, color: theme.ink }} /></label>
      <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">Horario</span><select required value={form.time} onChange={(e) => onChange("time", e.target.value)} className={input} style={{ borderColor: theme.line, color: theme.ink }}><option value="">Elegir horario</option>{times.map((time) => <option key={time}>{time}</option>)}</select></label>
    </div>
    <label className="mt-3 block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide">Nota opcional</span><textarea value={form.note} onChange={(e) => onChange("note", e.target.value)} rows={3} className={`${input} resize-none`} style={{ borderColor: theme.line, color: theme.ink }} /></label>
    {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
    <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 px-5 py-3 text-sm font-black uppercase tracking-wide text-white" style={{ backgroundColor: theme.accent }}><CalendarDays className="h-4 w-4" /> Solicitar reserva</button>
  </form>;
}

function Gallery({ theme, businessName, imageValues }: Pick<Props, "businessName" | "imageValues"> & { theme: Theme }) {
  return <section id="espacio" className="px-5 py-20 sm:px-8" style={{ backgroundColor: theme.soft, color: theme.ink }}><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: theme.accent }}>El espacio</p><h2 className="mt-3 font-serif text-4xl">Un lugar para volver.</h2><div className="mt-9 grid grid-cols-2 gap-3 md:grid-cols-5">{gallerySlots.map((slot, index) => <div key={slot} className={`relative min-h-44 overflow-hidden ${index === 0 ? "col-span-2 row-span-2 min-h-[360px]" : ""}`} style={{ borderRadius: theme.rounded ? 24 : 0 }}><LocalImage source={imageValues[slot]} alt={`Foto de ${businessName}`} /></div>)}</div></div></section>;
}

export function RestaurantTemplateSite(props: Props) {
  const { variant, businessName, eyebrow, title, subtitle, description, address, phone, instagram, showMenu, showReservations, showDelivery, showGallery, bookingWindowDays, durationMinutes, capacity, menuItems, imageValues, reservationForm, availableTimes, reservationError, onOpenOrder, onReservationChange, onReservationSubmit } = props;
  const theme = themes[variant];
  const items = menuItems.slice(0, 4);
  const isDark = ["izakaya-japones", "parrilla-argentina", "menu-degustacion"].includes(variant);
  const nav = <header className="sticky top-0 z-30 border-b backdrop-blur" style={{ backgroundColor: `${theme.page}ed`, color: theme.ink, borderColor: theme.line }}><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8"><a href="#inicio" className="font-serif text-xl font-bold">{businessName}</a><nav className="hidden gap-5 text-xs font-black uppercase tracking-[.12em] md:flex"><a href="#inicio">Inicio</a>{showMenu ? <a href="#menu">Menú</a> : null}{showGallery ? <a href="#espacio">Galería</a> : null}<a href="#contacto">Contacto</a></nav><div className="flex gap-2">{showReservations ? <a href="#reservas" className="border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.line }}>Reservar</a> : null}{showDelivery ? <button type="button" onClick={onOpenOrder} className="px-3 py-2 text-xs font-black text-white" style={{ backgroundColor: theme.accent }}>Pedir</button> : null}</div></div></header>;

  const card = (item: MenuItem, index: number) => <article key={item.id} className="overflow-hidden border" style={{ borderColor: theme.line, backgroundColor: theme.page, borderRadius: theme.rounded ? 22 : 0 }}><div className="relative aspect-[5/4]"><LocalImage source={item.imageUrl || (item.imageSlot ? imageValues[item.imageSlot] : imageValues[`menu${index + 1}`])} alt={item.name} /></div><div className="p-4"><div className="flex gap-3"><h3 className="font-serif text-xl">{item.name}</h3><strong className="ml-auto whitespace-nowrap" style={{ color: theme.accent }}>{money(item.price)}</strong></div><p className="mt-2 text-sm leading-6 opacity-75">{item.description}</p></div></article>;

  const menu = showMenu ? <section id="menu" className="px-5 py-20 sm:px-8" style={{ backgroundColor: theme.page, color: theme.ink }}><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: theme.accent }}>{theme.tag}</p><h2 className="mt-3 font-serif text-4xl sm:text-5xl">La carta del local.</h2></div>{showDelivery ? <button type="button" onClick={onOpenOrder} className="inline-flex items-center gap-2 text-sm font-black" style={{ color: theme.accent }}>Pedir online <ChevronRight className="h-4 w-4" /></button> : null}</div>{items.length ? <div className={`mt-10 grid gap-4 ${variant === "menu-degustacion" || variant === "sushi-omakase" ? "md:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>{items.map(card)}</div> : <p className="mt-8 border border-dashed p-5 text-sm" style={{ borderColor: theme.line }}>Cuando el local cargue productos, aparecerán aquí con sus fotos y precios.</p>}</div></section> : null;

  const info = <section className="px-5 py-14 sm:px-8" style={{ backgroundColor: theme.dark, color: isDark ? theme.ink : "#fff" }}><div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[.85fr_1.15fr]"><div><Sparkles className="h-6 w-6" style={{ color: theme.accent }} /><p className="mt-5 text-xs font-black uppercase tracking-[.2em]" style={{ color: theme.accent }}>{theme.tag}</p><h2 className="mt-3 font-serif text-4xl">{description}</h2></div><div className="grid gap-3 sm:grid-cols-3">{[[`${bookingWindowDays}`, "días para reservar"], [`${durationMinutes}`, "minutos por turno"], [`${capacity}`, "personas por horario"]].map(([value, label]) => <div key={label} className="border p-4" style={{ borderColor: `${theme.line}aa` }}><strong className="font-serif text-3xl">{value}</strong><p className="mt-1 text-sm opacity-75">{label}</p></div>)}</div></div></section>;

  const reservation = showReservations ? <section id="reservas" className="px-5 py-20 sm:px-8" style={{ backgroundColor: variant === "izakaya-japones" || variant === "menu-degustacion" ? theme.dark : theme.soft, color: variant === "izakaya-japones" || variant === "menu-degustacion" ? theme.ink : theme.ink }}><div className={`mx-auto grid max-w-7xl overflow-hidden ${variant === "sushi-omakase" ? "lg:grid-cols-[1.15fr_.85fr]" : "lg:grid-cols-[.85fr_1.15fr]"}`} style={{ border: `1px solid ${theme.line}`, borderRadius: theme.rounded ? 28 : 0 }}><div className="relative min-h-[390px]"><LocalImage source={imageValues.espacio1} alt={`Ambiente de ${businessName}`} /><div className="absolute inset-0 bg-black/35" /><div className="absolute bottom-0 p-8 text-white"><p className="text-xs font-black uppercase tracking-[.2em]">Tu próxima visita</p><h2 className="mt-3 max-w-md font-serif text-4xl">Reservá directo con el local.</h2></div></div><ReservationFormBlock theme={theme} form={reservationForm} times={availableTimes} error={reservationError} onChange={onReservationChange} onSubmit={onReservationSubmit} /></div></section> : null;

  const contact = <section id="contacto" className="px-5 py-16 sm:px-8" style={{ backgroundColor: isDark ? theme.page : theme.dark, color: isDark ? theme.ink : "#fff" }}><div className="mx-auto grid max-w-7xl gap-7 md:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[.2em]" style={{ color: theme.accent }}>Contacto</p><h2 className="mt-3 font-serif text-4xl">Te esperamos.</h2><p className="mt-4 max-w-md leading-7 opacity-75">{description}</p></div><div className="grid gap-3 sm:grid-cols-2"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="border p-5" style={{ borderColor: `${theme.line}99` }}><MapPin className="h-5 w-5" style={{ color: theme.accent }} /><p className="mt-4 text-sm font-bold">{address}</p></a><a href={`tel:${phone.replace(/\D/g, "")}`} className="border p-5" style={{ borderColor: `${theme.line}99` }}><Phone className="h-5 w-5" style={{ color: theme.accent }} /><p className="mt-4 text-sm font-bold">{phone}</p><p className="mt-1 text-xs opacity-65">{instagram}</p></a></div></div><p className="mx-auto mt-10 max-w-7xl border-t pt-5 text-xs opacity-55" style={{ borderColor: `${theme.line}77` }}>© 2026 {businessName}. Todos los derechos reservados.</p></section>;

  const hero = <section id="inicio" className="relative isolate overflow-hidden" style={{ minHeight: variant === "sushi-omakase" ? 610 : 680, backgroundColor: theme.dark, color: isDark ? theme.ink : "#fff" }}><LocalImage source={imageValues.hero} alt={`Portada de ${businessName}`} className="absolute inset-0 h-full w-full" /><div className="absolute inset-0" style={{ background: variant === "mediterraneo-costero" ? "linear-gradient(90deg,rgba(10,61,118,.9),rgba(10,61,118,.25))" : variant === "panaderia-brunch" ? "linear-gradient(90deg,rgba(255,244,232,.92),rgba(255,244,232,.18))" : variant === "cafe-vegetal" ? "linear-gradient(90deg,rgba(243,246,237,.92),rgba(243,246,237,.2))" : "linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.2))" }} /><div className={`relative mx-auto flex max-w-7xl px-5 py-20 sm:px-8 ${variant === "sushi-omakase" ? "min-h-[610px] items-center justify-center text-center" : "min-h-[680px] items-end"}`}><div className={variant === "sushi-omakase" ? "max-w-2xl" : "max-w-2xl"}><p className="text-xs font-black uppercase tracking-[.24em]" style={{ color: theme.accent }}>{eyebrow || theme.tag}</p><h1 className="mt-5 font-serif text-5xl leading-[.94] sm:text-7xl">{title}</h1><p className="mt-6 max-w-xl text-lg leading-7 opacity-90">{subtitle || description}</p><div className={`mt-8 flex flex-wrap gap-3 ${variant === "sushi-omakase" ? "justify-center" : ""}`}>{showReservations ? <a href="#reservas" className="inline-flex items-center gap-2 px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: theme.accent }}><CalendarDays className="h-4 w-4" /> Reservar ahora</a> : null}{showDelivery ? <button type="button" onClick={onOpenOrder} className="inline-flex items-center gap-2 border border-white/70 px-5 py-3 text-sm font-black text-white"><ShoppingBag className="h-4 w-4" /> Pedir online</button> : null}</div></div></div></section>;

  const layout = variant === "izakaya-japones" ? <>{hero}{info}{menu}{reservation}{showGallery ? <Gallery theme={theme} businessName={businessName} imageValues={imageValues} /> : null}{contact}</> : variant === "trattoria-italiana" || variant === "pizzeria-napolitana" ? <>{hero}{menu}{info}{reservation}{showGallery ? <Gallery theme={theme} businessName={businessName} imageValues={imageValues} /> : null}{contact}</> : variant === "parrilla-argentina" || variant === "menu-degustacion" ? <>{hero}{info}{reservation}{menu}{showGallery ? <Gallery theme={theme} businessName={businessName} imageValues={imageValues} /> : null}{contact}</> : <>{hero}{menu}{showGallery ? <Gallery theme={theme} businessName={businessName} imageValues={imageValues} /> : null}{reservation}{info}{contact}</>;

  return <div className="overflow-hidden" style={{ backgroundColor: theme.page }}>{nav}{layout}</div>;
}
