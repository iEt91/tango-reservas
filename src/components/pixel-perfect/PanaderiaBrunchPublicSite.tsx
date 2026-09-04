"use client";

import Image from "next/image";
import type { FormEvent, ReactNode } from "react";
import { CalendarDays, Clock3, MapPin, Phone, ShoppingBag, UserRound } from "lucide-react";

type MenuItem = { id: string; name: string; description: string; price: number; imageUrl?: string; imageSlot?: string };
type ReservationForm = { client: string; phone: string; email: string; people: number; date: string; time: string; note: string };

type Props = {
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

const assetRoot = "/web-templates/10-panaderia-brunch/assets";
const gallerySlots = ["espacio1", "espacio2", "espacio3", "espacio4", "espacio5"];

function currency(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function LocalPhoto({ source, alt, className = "" }: { source?: string; alt: string; className?: string }) {
  if (source) return <Image src={source} alt={alt} fill unoptimized className={`object-cover ${className}`} />;
  return <div aria-label={alt} className={`h-full w-full bg-[radial-gradient(circle_at_25%_20%,#fff8ec,transparent_24%),linear-gradient(135deg,#c78a58,#f8d6b6_48%,#e9b688)] ${className}`}><span className="absolute bottom-3 left-3 rounded-full bg-[#543c24]/75 px-3 py-1 text-xs font-semibold text-white">Foto del local</span></div>;
}

function Dots({ className = "" }: { className?: string }) {
  return <span className={`inline-flex gap-1 ${className}`}>{Array.from({ length: 4 }, (_, index) => <i key={index} className="h-1.5 w-1.5 rounded-full bg-current" />)}</span>;
}

function Field({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return <label className="flex min-w-0 items-center gap-2 border border-[#e4ccb4] bg-white/70 px-3 py-2 text-[#543c24]"><span className="text-[#b48454]">{icon}</span>{children}</label>;
}

export function PanaderiaBrunchPublicSite({ businessName, eyebrow, title, subtitle, description, address, phone, instagram, showMenu, showReservations, showDelivery, showGallery, bookingWindowDays, durationMinutes, capacity, menuItems, imageValues, reservationForm, availableTimes, reservationError, onOpenOrder, onReservationChange, onReservationSubmit }: Props) {
  const featured = menuItems.slice(0, 4);
  const gallery = gallerySlots.map((slot) => imageValues[slot]);

  return <div className="overflow-hidden bg-[#fcfcfc] text-[#543c24] [font-family:ui-rounded,system-ui,sans-serif]">
    <header className="relative z-30 h-[68px] border-b border-[#fce4cc] bg-[#fffdf9]">
      <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <a href="#inicio" className="flex items-center gap-2 text-sm font-black tracking-tight"><Image src={`${assetRoot}/ornaments/ornament_01.png`} alt="" width={35} height={37} className="h-9 w-auto" unoptimized />{businessName}</a>
        <nav className="hidden items-center gap-7 text-[11px] font-black uppercase tracking-[.18em] md:flex"><a href="#inicio">Inicio</a>{showMenu ? <a href="#menu">Menú</a> : null}{showGallery ? <a href="#galeria">Galería</a> : null}<a href="#contacto">Contacto</a></nav>
        <div className="flex items-center gap-3">{showReservations ? <a href="#reservas" className="rounded-full bg-[#f3a47f] px-4 py-2 text-xs font-black text-white">Reservar</a> : null}{showDelivery ? <button type="button" onClick={onOpenOrder} className="hidden rounded-full border border-[#b48454] px-4 py-2 text-xs font-black sm:block">Pedir</button> : null}</div>
      </div>
    </header>

    <section id="inicio" className="relative min-h-[410px] overflow-hidden bg-[#fce4cc]">
      <LocalPhoto source={imageValues.hero} alt={`Portada de ${businessName}`} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,250,244,.95)_0%,rgba(255,250,244,.78)_42%,rgba(255,250,244,.12)_75%)]" />
      <Image src={`${assetRoot}/ornaments/ornament_02.png`} alt="" width={162} height={222} className="absolute bottom-[-16px] left-[8%] hidden h-auto w-[100px] opacity-75 sm:block" unoptimized />
      <div className="relative mx-auto flex min-h-[410px] max-w-[1180px] items-center px-8 py-14 sm:px-12"><div className="max-w-[440px]"><p className="text-xs font-black uppercase tracking-[.2em] text-[#b48454]">{eyebrow || "Pan recién hecho"}</p><h1 className="mt-4 font-serif text-5xl leading-[.92] text-[#543c24] sm:text-6xl">{title}</h1><p className="mt-5 max-w-md leading-7 text-[#543c24]/80">{subtitle || description}</p><div className="mt-7 flex gap-3">{showReservations ? <a href="#reservas" className="rounded-full bg-[#f3a47f] px-5 py-3 text-sm font-black text-white">Reservá ahora</a> : null}{showMenu ? <a href="#menu" className="rounded-full border border-[#b48454] bg-white/70 px-5 py-3 text-sm font-black">Ver menú</a> : null}</div></div></div>
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-[#fcfcfc] [clip-path:polygon(0_55%,14%_95%,30%_56%,48%_95%,63%_57%,80%_94%,100%_53%,100%_100%,0_100%)]" />
    </section>

    {showMenu ? <section id="menu" className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8"><div className="text-center"><Dots className="text-[#f3a47f]" /><h2 className="mt-3 font-serif text-4xl">Recién salido del horno.</h2><p className="mt-2 text-sm text-[#543c24]/70">La carta se actualiza desde el menú del local.</p></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{featured.map((item, index) => <article key={item.id} className="overflow-hidden rounded-t-xl border border-[#f0d5bd] bg-[#fffaf5]"><div className="relative aspect-[1.08]"><LocalPhoto source={item.imageUrl || (item.imageSlot ? imageValues[item.imageSlot] : imageValues[`menu${index + 1}`])} alt={item.name} /></div><div className="relative p-4 text-center"><span className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-[#f3b18f] text-white"><Dots /></span><h3 className="mt-3 font-serif text-xl">{item.name}</h3><p className="mt-2 min-h-10 text-sm text-[#543c24]/70">{item.description}</p><strong className="mt-3 block text-sm text-[#9c6c3c]">{currency(item.price)}</strong></div></article>)}</div>{featured.length === 0 ? <p className="mt-7 border border-dashed border-[#e4ccb4] p-5 text-center text-sm">Cuando el local cargue productos, se mostrarán acá.</p> : null}</section> : null}

    <section className="bg-[#fff8ef] py-7"><div className="mx-auto grid max-w-[1180px] overflow-hidden sm:grid-cols-[.82fr_1.18fr]"><div className="relative min-h-[230px]"><LocalPhoto source={imageValues.espacio1} alt={`Brunch en ${businessName}`} /></div><div className="grid content-center gap-5 px-7 py-8 sm:px-10"><div><Dots className="text-[#f3a47f]" /><h2 className="mt-3 font-serif text-3xl">Una pausa rica para todos los días.</h2></div><div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{featured.slice(0, 4).map((item, index) => <div key={item.id} className="flex items-baseline gap-2 border-b border-dotted border-[#cbb49b] pb-2 text-sm"><span className="text-[#f3a47f]">{index % 2 ? "☕" : "✦"}</span><span className="font-semibold">{item.name}</span><span className="ml-auto text-[#9c6c3c]">{currency(item.price)}</span></div>)}</div></div></div></section>

    {showReservations ? <section id="reservas" className="mx-auto max-w-[1180px] px-5 py-9 sm:px-8"><form onSubmit={onReservationSubmit} className="relative grid gap-4 overflow-hidden rounded-2xl border-[12px] border-[#f8cfb2] bg-[#fffaf5] p-5 lg:grid-cols-[1.1fr_repeat(4,minmax(0,1fr))_auto] lg:items-end"><Image src={`${assetRoot}/ornaments/ornament_04.png`} alt="" width={353} height={251} className="pointer-events-none absolute right-0 top-0 hidden w-56 opacity-35 lg:block" unoptimized /><div className="relative z-10 lg:col-span-6"><Dots className="text-[#f3a47f]" /><h2 className="mt-2 font-serif text-3xl">Reservá tu mesa.</h2><p className="mt-1 text-sm text-[#543c24]/70">{bookingWindowDays} días de anticipación · {durationMinutes} min · hasta {capacity} personas por horario.</p></div><Field icon={<UserRound size={15} />}><input required value={reservationForm.client} onChange={(e) => onReservationChange("client", e.target.value)} placeholder="Nombre" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></Field><Field icon={<CalendarDays size={15} />}><input required type="date" value={reservationForm.date} onChange={(e) => onReservationChange("date", e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></Field><Field icon={<Clock3 size={15} />}><select required value={reservationForm.time} onChange={(e) => onReservationChange("time", e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none"><option value="">Horario</option>{availableTimes.map((time) => <option key={time}>{time}</option>)}</select></Field><Field icon={<UserRound size={15} />}><input required min={1} type="number" value={reservationForm.people} onChange={(e) => onReservationChange("people", Number(e.target.value))} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></Field><button type="submit" className="rounded-full bg-[#73401f] px-6 py-3 text-sm font-black text-white">Reservar</button>{reservationError ? <p className="lg:col-span-6 text-sm font-medium text-red-700">{reservationError}</p> : null}</form></section> : null}

    {showDelivery ? <section className="mx-auto max-w-[1180px] px-5 py-4 sm:px-8"><div className="grid overflow-hidden rounded-xl border border-[#f1d5bd] bg-[#fff7ed] md:grid-cols-2"><div className="relative min-h-48 p-7"><Image src={`${assetRoot}/ornaments/ornament_05.png`} alt="" width={274} height={246} className="pointer-events-none absolute bottom-0 left-0 h-auto w-44 opacity-70" unoptimized /><div className="relative ml-36"><p className="text-xs font-black uppercase tracking-[.16em] text-[#b48454]">Para llevar</p><h2 className="mt-2 font-serif text-3xl">Tu brunch, donde quieras.</h2><button type="button" onClick={onOpenOrder} className="mt-5 rounded-full bg-[#f3a47f] px-5 py-2 text-xs font-black text-white">Hacer pedido</button></div></div><div className="relative min-h-48 border-t border-[#f1d5bd] p-7 md:border-l md:border-t-0"><Image src={`${assetRoot}/ornaments/ornament_04.png`} alt="" width={353} height={251} className="pointer-events-none absolute bottom-0 right-0 h-auto w-48 opacity-70" unoptimized /><div className="relative max-w-xs"><p className="text-xs font-black uppercase tracking-[.16em] text-[#b48454]">En el local</p><h2 className="mt-2 font-serif text-3xl">Quedate un rato más.</h2><a href="#reservas" className="mt-5 inline-block rounded-full bg-[#d5b47e] px-5 py-2 text-xs font-black text-white">Reservar mesa</a></div></div></div></section> : null}

    {showGallery ? <section id="galeria" className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8"><div className="text-center"><Dots className="text-[#f3a47f]" /><h2 className="mt-3 font-serif text-3xl">Un poco de lo que pasa acá.</h2></div><div className="mt-7 grid grid-cols-3 gap-2 sm:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="relative aspect-square overflow-hidden"> <LocalPhoto source={gallery[index % gallery.length]} alt={`Galería de ${businessName}`} /></div>)}</div></section> : null}

    <section id="contacto" className="border-t border-[#f0ddca] bg-[#fffaf4]"><div className="mx-auto grid max-w-[1180px] overflow-hidden md:grid-cols-[.9fr_1.1fr_.9fr]"><div className="relative min-h-56 bg-[repeating-linear-gradient(45deg,#f5eee4_0_2px,transparent_2px_12px)]"><MapPin className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-[#73401f]" /></div><div className="p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-[#b48454]">Contacto</p><h2 className="mt-2 font-serif text-3xl">Te esperamos.</h2><div className="mt-5 space-y-2 text-sm"><p><MapPin className="mr-2 inline h-4 w-4 text-[#f3a47f]" />{address}</p><p><Phone className="mr-2 inline h-4 w-4 text-[#f3a47f]" />{phone}</p><p className="pl-6 text-[#543c24]/70">{instagram}</p></div></div><div className="relative min-h-56"><LocalPhoto source={imageValues.espacio5} alt={`Interior de ${businessName}`} /></div></div><footer className="bg-[#543c24] px-5 py-6 text-center text-xs text-[#fce4cc]">© 2026 {businessName}. Hecho con Tango Reservas.</footer></section>
  </div>;
}
