"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  MapPin,
  Phone,
  ShoppingBag,
  Wine,
} from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  imageSlot?: string;
};

type ReservationForm = {
  client: string;
  phone: string;
  email: string;
  people: number;
  date: string;
  time: string;
  note: string;
};

type BistroContemporaryPublicSiteProps = {
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

const gallerySlots = ["espacio1", "espacio2", "espacio3", "espacio4", "espacio5"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function usableImage(source?: string) {
  return Boolean(source && !source.startsWith("/template-concepts/"));
}

function EditorialImage({
  source,
  alt,
  className = "",
}: {
  source?: string;
  alt: string;
  className?: string;
}) {
  if (usableImage(source)) {
    return <Image src={source!} alt={alt} fill className={`object-cover ${className}`} unoptimized />;
  }

  return (
    <div className={className} aria-label={alt}>
      <div className="relative h-full w-full overflow-hidden bg-[#1b3325]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(237,223,188,0.2),transparent_24%),radial-gradient(circle_at_78%_78%,rgba(184,84,43,0.3),transparent_34%),linear-gradient(130deg,#17271d,#30472e_48%,#856043)]" />
        <div className="absolute inset-x-8 bottom-8 border border-[#f3eadc]/35 p-4 text-[#f3eadc]/80">
          <Camera className="mb-2 h-5 w-5" />
          <p className="font-serif text-lg">La imagen del local va acá</p>
        </div>
      </div>
    </div>
  );
}

export function BistroContemporaryPublicSite({
  businessName,
  eyebrow,
  title,
  subtitle,
  description,
  address,
  phone,
  instagram,
  showMenu,
  showReservations,
  showDelivery,
  showGallery,
  bookingWindowDays,
  durationMinutes,
  capacity,
  menuItems,
  imageValues,
  reservationForm,
  availableTimes,
  reservationError,
  onOpenOrder,
  onReservationChange,
  onReservationSubmit,
}: BistroContemporaryPublicSiteProps) {
  const featuredItems = menuItems.slice(0, 4);
  const menuLines = featuredItems.length > 0 ? featuredItems : [];
  const heroImage = imageValues.hero;

  return (
    <div className="overflow-hidden bg-[#f4eee1] text-[#19231b]">
      <header className="sticky top-0 z-30 border-b border-[#d9cfbc] bg-[#10251a]/95 text-[#f6efdf] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <a href="#inicio" className="font-serif text-xl tracking-wide sm:text-2xl">{businessName}</a>
          <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-[0.16em] md:flex">
            <a href="#inicio" className="transition hover:text-[#e8c998]">Inicio</a>
            {showMenu ? <a href="#menu" className="transition hover:text-[#e8c998]">Menú</a> : null}
            {showGallery ? <a href="#espacio" className="transition hover:text-[#e8c998]">El espacio</a> : null}
            <a href="#contacto" className="transition hover:text-[#e8c998]">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            {showReservations ? (
              <a href="#reservas" className="hidden border border-[#e7d7b9] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition hover:bg-[#e7d7b9] hover:text-[#17271d] sm:inline-flex">
                Reservar
              </a>
            ) : null}
            {showDelivery ? (
              <button type="button" onClick={onOpenOrder} className="inline-flex items-center gap-2 bg-[#be5d38] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#a84d2e]">
                <ShoppingBag className="h-4 w-4" /> Pedir
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section id="inicio" className="relative isolate min-h-[680px] overflow-hidden bg-[#173022] text-[#f8f1e4]">
        <EditorialImage source={heroImage} alt={`Interior de ${businessName}`} className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,23,15,0.94)_0%,rgba(10,28,18,0.78)_44%,rgba(10,23,16,0.22)_100%)]" />
        <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-end px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-[#e9c894]">{eyebrow || "Cocina de estación"}</p>
            <h1 className="max-w-xl font-serif text-5xl leading-[0.92] sm:text-7xl">{title}</h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#f8f1e4]/82 sm:text-lg">{subtitle || description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              {showReservations ? <a href="#reservas" className="inline-flex items-center gap-2 bg-[#f3eadc] px-5 py-3 text-sm font-bold text-[#173022] transition hover:bg-white"><CalendarDays className="h-4 w-4" /> Reservá tu mesa</a> : null}
              {showMenu ? <a href="#menu" className="inline-flex items-center gap-2 border border-[#f3eadc]/70 px-5 py-3 text-sm font-semibold transition hover:bg-[#f3eadc]/10">Conocé el menú <ChevronRight className="h-4 w-4" /></a> : null}
            </div>
          </div>
        </div>
      </section>

      {showMenu ? (
        <section id="menu" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.23em] text-[#a24d2d]">Platos de estación</p><h2 className="mt-3 font-serif text-4xl text-[#193020] sm:text-5xl">Una carta para quedarse.</h2></div>
            <button type="button" onClick={onOpenOrder} className="inline-flex items-center gap-2 text-sm font-bold text-[#8e4229] hover:underline"><ShoppingBag className="h-4 w-4" /> Pedir online</button>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredItems.map((item, index) => {
              const slotImage = item.imageSlot ? imageValues[item.imageSlot] : imageValues[`menu${index + 1}`];
              return <article key={item.id} className="group border border-[#d9cfbc] bg-[#fbf7ef] p-3 shadow-[0_10px_30px_rgba(25,48,32,0.06)]"><div className="relative aspect-[4/5] overflow-hidden"><EditorialImage source={item.imageUrl || slotImage} alt={item.name} className="h-full w-full transition duration-500 group-hover:scale-105" /></div><div className="px-1 pb-2 pt-4"><div className="flex gap-3"><h3 className="font-serif text-xl">{item.name}</h3><span className="ml-auto whitespace-nowrap text-sm font-bold text-[#a24d2d]">{formatCurrency(item.price)}</span></div><p className="mt-2 text-sm leading-6 text-[#5d655c]">{item.description}</p></div></article>;
            })}
          </div>
          {featuredItems.length === 0 ? <p className="mt-5 border border-dashed border-[#cfc3aa] p-5 text-sm text-[#5d655c]">Cuando el local cargue productos, aparecerán acá con sus fotos y precios.</p> : null}
        </section>
      ) : null}

      <section className="bg-[#143021] text-[#f4eee1]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="border-l border-[#d8b477] pl-5"><Wine className="h-6 w-6 text-[#e2bf82]" /><h2 className="mt-5 font-serif text-4xl leading-tight">Cocina honesta, vinos elegidos y una mesa que invita a volver.</h2><p className="mt-5 max-w-md leading-7 text-[#f4eee1]/75">{description}</p></div>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{menuLines.map((item) => <div key={item.id} className="border-b border-[#f4eee1]/20 py-3"><div className="flex gap-4"><h3 className="font-serif text-lg">{item.name}</h3><span className="ml-auto text-sm text-[#e2bf82]">{formatCurrency(item.price)}</span></div><p className="mt-1 text-sm text-[#f4eee1]/65">{item.description}</p></div>)}{menuLines.length === 0 ? <p className="text-[#f4eee1]/70">La carta se actualiza desde el panel del local.</p> : null}</div>
        </div>
      </section>

      {showReservations ? (
        <section id="reservas" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="relative min-h-[420px] overflow-hidden"><EditorialImage source={imageValues.espacio1} alt={`Espacio de ${businessName}`} className="absolute inset-0 h-full w-full" /><div className="absolute inset-0 bg-[#173022]/55" /><div className="absolute bottom-0 p-8 text-[#f4eee1]"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#e8c998]">Reservas online</p><h2 className="mt-3 font-serif text-4xl">Tu próxima mesa empieza acá.</h2><div className="mt-7 grid grid-cols-3 gap-2 text-center text-sm"><span className="border border-white/25 p-3"><b className="block font-serif text-xl">{bookingWindowDays}</b>días</span><span className="border border-white/25 p-3"><b className="block font-serif text-xl">{durationMinutes}</b>min</span><span className="border border-white/25 p-3"><b className="block font-serif text-xl">{capacity}</b>personas</span></div></div></div>
          <form onSubmit={onReservationSubmit} className="border border-[#d9cfbc] bg-[#fbf7ef] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a24d2d]">Reserva tu mesa</p><h2 className="mt-3 font-serif text-4xl text-[#193020]">Elegí el momento.</h2><div className="mt-7 grid gap-4 sm:grid-cols-2">{[["client","Nombre"],["phone","Teléfono"],["email","Email"]].map(([field,label]) => <label key={field} className={field === "email" ? "sm:col-span-2" : ""}><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#516154]">{label}</span><input required type={field === "email" ? "email" : "text"} value={reservationForm[field as "client" | "phone" | "email"]} onChange={(event) => onReservationChange(field as "client" | "phone" | "email", event.target.value)} className="w-full border border-[#d9cfbc] bg-white px-3 py-3 outline-none transition focus:border-[#a24d2d]" /></label>)}</div><div className="mt-4 grid gap-4 sm:grid-cols-3"><label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#516154]">Personas</span><input required min={1} type="number" value={reservationForm.people} onChange={(event) => onReservationChange("people", Number(event.target.value))} className="w-full border border-[#d9cfbc] bg-white px-3 py-3 outline-none focus:border-[#a24d2d]" /></label><label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#516154]">Fecha</span><input required type="date" value={reservationForm.date} onChange={(event) => onReservationChange("date", event.target.value)} className="w-full border border-[#d9cfbc] bg-white px-3 py-3 outline-none focus:border-[#a24d2d]" /></label><label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#516154]">Horario</span><select required value={reservationForm.time} onChange={(event) => onReservationChange("time", event.target.value)} className="w-full border border-[#d9cfbc] bg-white px-3 py-3 outline-none focus:border-[#a24d2d]"><option value="">Elegir</option>{availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select></label></div><label className="mt-4 block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#516154]">Nota opcional</span><textarea value={reservationForm.note} onChange={(event) => onReservationChange("note", event.target.value)} rows={3} className="w-full resize-none border border-[#d9cfbc] bg-white px-3 py-3 outline-none focus:border-[#a24d2d]" /></label>{reservationError ? <p className="mt-4 text-sm text-red-700">{reservationError}</p> : null}<button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-[#a74e2e] px-5 py-3 font-bold text-white transition hover:bg-[#893d25]"><CalendarDays className="h-4 w-4" /> Solicitar reserva</button></form>
        </section>
      ) : null}

      {showDelivery ? <section className="bg-[#b35834] text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-5 py-10 sm:px-8"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">También en tu casa</p><h2 className="mt-2 font-serif text-3xl">Pedí la carta del día.</h2></div><button type="button" onClick={onOpenOrder} className="inline-flex items-center gap-2 border border-white px-5 py-3 text-sm font-bold transition hover:bg-white hover:text-[#a74e2e]"><ShoppingBag className="h-4 w-4" /> Hacer pedido</button></div></section> : null}

      {showGallery ? <section id="espacio" className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="mb-9"><p className="text-xs font-bold uppercase tracking-[0.23em] text-[#a24d2d]">El espacio</p><h2 className="mt-3 font-serif text-4xl text-[#193020]">Hecho para demorarse.</h2></div><div className="grid grid-cols-2 gap-3 md:grid-cols-5">{gallerySlots.map((slot, index) => <div key={slot} className={`relative min-h-48 overflow-hidden ${index === 0 ? "col-span-2 row-span-2 min-h-[390px]" : ""}`}><EditorialImage source={imageValues[slot]} alt={`Foto de ${businessName}`} className="absolute inset-0 h-full w-full" /></div>)}</div></section> : null}

      <section id="contacto" className="bg-[#10251a] text-[#f4eee1]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e2bf82]">Contacto</p><h2 className="mt-3 font-serif text-4xl">Te esperamos.</h2><p className="mt-4 max-w-md leading-7 text-[#f4eee1]/70">{description}</p></div><div className="grid gap-4 sm:grid-cols-2"><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="border border-white/20 p-5 transition hover:bg-white/10"><MapPin className="h-5 w-5 text-[#e2bf82]" /><p className="mt-4 text-sm font-semibold">{address}</p></a><a href={`tel:${phone.replace(/\D/g, "")}`} className="border border-white/20 p-5 transition hover:bg-white/10"><Phone className="h-5 w-5 text-[#e2bf82]" /><p className="mt-4 text-sm font-semibold">{phone}</p><p className="mt-1 text-xs text-[#f4eee1]/60">{instagram}</p></a></div></div><div className="mx-auto max-w-7xl border-t border-white/15 px-5 py-5 text-xs text-[#f4eee1]/55 sm:px-8">© 2026 {businessName}. Todos los derechos reservados.</div></section>
    </div>
  );
}
