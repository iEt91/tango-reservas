"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { CalendarDays, MapPin, Phone, ShoppingBag } from "lucide-react";

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

const ROOT = "/web-templates/pizzeria-mediterranea/assets";
const asset = (folder: string, file: string) => `${ROOT}/${folder}/${file}`;
const menuPanels = [
  "card_menu_01_tomate.png",
  "card_menu_02_aceituna.png",
  "card_menu_03_tomate_centro.png",
  "card_menu_04_hojas.png",
];
const galleryFrames = [
  "marco_polaroid_01_cinta_azulejo.png",
  "marco_polaroid_02_cinta_azul.png",
  "marco_polaroid_03_pin_rojo.png",
  "marco_polaroid_04_cinta_rayada.png",
];
const gallerySlots = ["espacio1", "espacio2", "espacio3", "espacio4"];

function money(value: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
}

function LocalPhoto({ source, alt }: { source?: string; alt: string }) {
  const hasUploadedPhoto =
    source &&
    !source.startsWith("/template-concepts/") &&
    !source.startsWith("/web-templates/pizzeria-mediterranea/assets/");

  if (hasUploadedPhoto) {
    return <Image src={source} alt={alt} fill unoptimized className="object-cover" />;
  }

  return <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(140deg,#e5d6bb,#f8f0df_48%,#b8d6df)]" aria-label={alt}>
    <div className="absolute inset-x-[14%] bottom-[49%] top-[13%]"><AssetImage folder="03_iconos_ingredientes" file="rama_olivas.png" className="object-contain" /></div>
    <div className="absolute bottom-[8%] left-[9%] right-[53%] top-[56%]"><AssetImage folder="07_adornos_mediterraneos_grandes" file="tomates_rama.png" className="object-contain object-left-bottom" /></div>
    <div className="absolute bottom-[15%] left-[66%] right-[10%] top-[61%]"><AssetImage folder="07_adornos_mediterraneos_grandes" file="sol_mediterraneo_pequeno.png" className="object-contain" /></div>
  </div>;
}

function AssetImage({ folder, file, className = "", alt = "" }: { folder: string; file: string; className?: string; alt?: string }) {
  return <Image src={asset(folder, file)} alt={alt} fill unoptimized className={className} />;
}

export function MediterraneanPizzeriaSite(props: Props) {
  const {
    businessName, eyebrow, title, subtitle, description, address, phone, instagram,
    showMenu, showReservations, showDelivery, showGallery, bookingWindowDays,
    durationMinutes, capacity, menuItems, imageValues, reservationForm, availableTimes,
    reservationError, onOpenOrder, onReservationChange, onReservationSubmit,
  } = props;
  const items = menuItems.slice(0, 4);

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6eddc] text-[#103e75]">
      <header className="sticky top-0 z-40 border-b-4 border-[#103e75] bg-[#f9f1df]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#inicio" className="font-serif text-xl font-black tracking-tight text-[#103e75]">{businessName}</a>
          <nav className="hidden items-center gap-6 text-xs font-black uppercase tracking-[.16em] md:flex">
            <a href="#inicio">Inicio</a>
            {showMenu ? <a href="#menu">Menú</a> : null}
            {showGallery ? <a href="#galeria">Galería</a> : null}
            <a href="#contacto">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            {showReservations ? <a href="#reservas" className="rounded-full border-2 border-[#103e75] px-3 py-2 text-xs font-black">Reservar</a> : null}
            {showDelivery ? <button type="button" onClick={onOpenOrder} className="rounded-full bg-[#d93827] px-3 py-2 text-xs font-black text-white shadow-[3px_3px_0_#103e75]">Pedir</button> : null}
          </div>
        </div>
      </header>

      <section id="inicio" className="relative isolate min-h-[680px] overflow-hidden bg-[#f6eddc] px-5 pb-20 pt-16 sm:px-8">
        <div className="absolute inset-x-0 top-0 h-20"><AssetImage folder="06_adornos_header_y_hero" file="franja_wave_superior_azul.png" className="object-fill" /></div>
        <div className="absolute -left-10 top-28 h-96 w-80 opacity-95"><AssetImage folder="07_adornos_mediterraneos_grandes" file="guirnalda_lateral_izquierda.png" className="object-contain object-left" /></div>
        <div className="absolute -right-8 top-24 h-[460px] w-80"><AssetImage folder="07_adornos_mediterraneos_grandes" file="guirnalda_lateral_derecha.png" className="object-contain object-right" /></div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[#0d478b]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 pt-16 lg:grid-cols-[1fr_.95fr]">
          <div className="relative z-10 max-w-xl">
            <div className="relative h-16 w-24"><AssetImage folder="06_adornos_header_y_hero" file="icono_sol_mar_header.png" className="object-contain object-left" /></div>
            <p className="mt-4 text-xs font-black uppercase tracking-[.28em] text-[#d93827]">{eyebrow || "Cocina mediterránea"}</p>
            <h1 className="mt-4 font-serif text-5xl font-black leading-[.9] text-[#103e75] sm:text-7xl">{title || "Pizza, sol y mesa larga."}</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[#244f7c]">{subtitle || description}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              {showReservations ? <a href="#reservas" className="inline-flex items-center gap-2 rounded-full bg-[#d93827] px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_#103e75]"><CalendarDays size={17} /> Reservar una mesa</a> : null}
              {showDelivery ? <button type="button" onClick={onOpenOrder} className="inline-flex items-center gap-2 rounded-full border-2 border-[#103e75] bg-[#f9f1df] px-6 py-3 text-sm font-black"><ShoppingBag size={17} /> Pedir online</button> : null}
            </div>
          </div>
          <div className="relative mx-auto h-[420px] w-full max-w-[540px]">
            <AssetImage folder="01_paneles_estructurales" file="hero_banner_principal.png" className="object-contain" alt="Portada mediterránea" />
            <div className="absolute inset-[14%_13%_12%_15%] overflow-hidden rounded-[42%_42%_30%_30%]">
              <LocalPhoto source={imageValues.hero} alt={`Portada de ${businessName}`} />
            </div>
            <div className="pointer-events-none absolute -bottom-5 -left-5 h-28 w-32"><AssetImage folder="07_adornos_mediterraneos_grandes" file="tomates_rama.png" className="object-contain" /></div>
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-32"><AssetImage folder="07_adornos_mediterraneos_grandes" file="sol_mediterraneo_pequeno.png" className="object-contain" /></div>
          </div>
        </div>
      </section>

      {showMenu ? <section id="menu" className="relative bg-[#f6eddc] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-xl text-center"><p className="text-xs font-black uppercase tracking-[.28em] text-[#d93827]">Recién salido del horno</p><h2 className="mt-3 font-serif text-4xl font-black sm:text-5xl">{"La pizza pide mesa."}</h2><div className="relative mx-auto mt-4 h-7 w-44"><AssetImage folder="06_adornos_header_y_hero" file="divider_principal_diamantes_rojos.png" className="object-contain" /></div></div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(items.length ? items : Array.from({ length: 4 }, (_, index) => ({ id: `m-${index}`, name: "Pizza de la casa", description: "Masa lenta, tomate y aceite de oliva.", price: 0 }))).map((item, index) => (
              <article key={item.id} className="relative overflow-hidden rounded-[2rem] border-2 border-[#103e75] bg-[#fff8ea] p-4 shadow-[5px_5px_0_#103e75]">
                <div className="relative aspect-square overflow-hidden rounded-[1.45rem]"><LocalPhoto source={item.imageUrl || imageValues[item.imageSlot || `menu${index + 1}`]} alt={item.name} /><div className="pointer-events-none absolute inset-0"><AssetImage folder="01_paneles_estructurales" file={menuPanels[index]} className="object-fill" /></div></div>
                <div className="px-2 pb-2 pt-5"><div className="flex gap-2"><h3 className="font-serif text-2xl font-black leading-tight">{item.name}</h3><strong className="ml-auto text-sm text-[#d93827]">{item.price ? money(item.price) : ""}</strong></div><p className="mt-2 text-sm leading-6 text-[#315783]">{item.description}</p></div>
              </article>
            ))}
          </div>
          {showDelivery ? <div className="mt-10 flex justify-center"><button type="button" onClick={onOpenOrder} className="rounded-full bg-[#103e75] px-7 py-3 text-sm font-black text-white shadow-[4px_4px_0_#d93827]">Ver menú y pedir →</button></div> : null}
        </div>
      </section> : null}

      <section className="relative overflow-hidden bg-[#fff7e8] px-5 py-12 sm:px-8">
        <div className="absolute inset-0 opacity-70"><AssetImage folder="01_paneles_estructurales" file="franja_ingredientes_horizontal.png" className="object-fill" /></div>
        <div className="relative mx-auto grid max-w-7xl gap-8 text-center sm:grid-cols-3"><div><p className="text-3xl">🍅</p><h3 className="mt-2 font-serif text-xl font-black">Producto noble</h3><p className="mt-1 text-sm">Tomate, oliva y estación.</p></div><div className="border-[#103e75]/25 sm:border-x sm:px-7"><p className="text-3xl">🔥</p><h3 className="mt-2 font-serif text-xl font-black">Horno encendido</h3><p className="mt-1 text-sm">Masa lenta y fuego alto.</p></div><div><p className="text-3xl">🌿</p><h3 className="mt-2 font-serif text-xl font-black">Mesa compartida</h3><p className="mt-1 text-sm">Para quedarse sin apuro.</p></div></div>
      </section>

      {showReservations ? <section id="reservas" className="relative bg-[#f6eddc] px-5 py-20 sm:px-8"><div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border-4 border-[#103e75] bg-[#fff8ea] lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative min-h-[520px] bg-[#e7d4b4]"><AssetImage folder="01_paneles_estructurales" file="widget_formulario_reservas.png" className="object-cover" /><div className="absolute inset-0 bg-[#103e75]/12" /><div className="absolute bottom-8 left-8 right-8"><p className="text-xs font-black uppercase tracking-[.22em] text-[#d93827]">Reserva online</p><h2 className="mt-3 font-serif text-4xl font-black">La mesa se prepara para vos.</h2><p className="mt-4 max-w-sm text-sm leading-6">Reservas con hasta {bookingWindowDays} días de anticipación. Turnos de {durationMinutes} minutos para hasta {capacity} personas.</p></div></div>
        <form onSubmit={onReservationSubmit} className="p-7 sm:p-10"><p className="text-xs font-black uppercase tracking-[.22em] text-[#d93827]">Elegí tu momento</p><h2 className="mt-3 font-serif text-4xl font-black">Reservá en un minuto.</h2><div className="mt-7 grid gap-4 sm:grid-cols-2">
          {(["client", "phone", "email"] as const).map((field) => <label key={field} className={field === "email" ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-black uppercase tracking-wide">{field === "client" ? "Nombre" : field === "phone" ? "Teléfono" : "Email"}</span><input required type={field === "email" ? "email" : "text"} value={reservationForm[field]} onChange={(event) => onReservationChange(field, event.target.value)} className="w-full rounded-xl border-2 border-[#103e75] bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#d93827]" /></label>)}
          <label><span className="mb-1.5 block text-xs font-black uppercase tracking-wide">Personas</span><input required min={1} type="number" value={reservationForm.people} onChange={(event) => onReservationChange("people", Number(event.target.value))} className="w-full rounded-xl border-2 border-[#103e75] bg-white px-3 py-3 text-sm" /></label>
          <label><span className="mb-1.5 block text-xs font-black uppercase tracking-wide">Fecha</span><input required type="date" value={reservationForm.date} onChange={(event) => onReservationChange("date", event.target.value)} className="w-full rounded-xl border-2 border-[#103e75] bg-white px-3 py-3 text-sm" /></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide">Horario</span><select required value={reservationForm.time} onChange={(event) => onReservationChange("time", event.target.value)} className="w-full rounded-xl border-2 border-[#103e75] bg-white px-3 py-3 text-sm"><option value="">Elegir horario</option>{availableTimes.map((time) => <option key={time}>{time}</option>)}</select></label>
        </div><label className="mt-4 block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wide">Nota opcional</span><textarea value={reservationForm.note} onChange={(event) => onReservationChange("note", event.target.value)} rows={3} className="w-full resize-none rounded-xl border-2 border-[#103e75] bg-white px-3 py-3 text-sm" /></label>{reservationError ? <p className="mt-3 text-sm font-bold text-[#d93827]">{reservationError}</p> : null}<button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d93827] px-6 py-3 text-sm font-black text-white shadow-[4px_4px_0_#103e75]"><CalendarDays size={17} /> Solicitar reserva</button></form>
      </div></section> : null}

      {showGallery ? <section id="galeria" className="bg-[#f6eddc] px-5 py-20 sm:px-8"><div className="mx-auto max-w-7xl"><div className="text-center"><p className="text-xs font-black uppercase tracking-[.26em] text-[#d93827]">Nuestro rincón mediterráneo</p><h2 className="mt-3 font-serif text-4xl font-black">Vení a conocer la casa.</h2></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{gallerySlots.map((slot, index) => <div key={slot} className="relative aspect-[4/5] -rotate-1 overflow-hidden"><LocalPhoto source={imageValues[slot]} alt={`Ambiente de ${businessName}`} /><div className="pointer-events-none absolute inset-0"><AssetImage folder="05_marcos_galeria" file={galleryFrames[index]} className="object-fill" /></div></div>)}</div></div></section> : null}

      <section className="relative overflow-hidden bg-[#d93827] px-5 py-16 text-[#fff7e8] sm:px-8"><div className="absolute inset-0 opacity-40"><AssetImage folder="01_paneles_estructurales" file="banner_promocional_rojo.png" className="object-fill" /></div><div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-7"><div><p className="text-xs font-black uppercase tracking-[.25em]">Delivery o retiro</p><h2 className="mt-3 max-w-xl font-serif text-4xl font-black sm:text-5xl">El Mediterráneo llega a tu mesa.</h2></div>{showDelivery ? <button type="button" onClick={onOpenOrder} className="rounded-full border-2 border-[#fff7e8] bg-[#103e75] px-7 py-4 text-sm font-black shadow-[4px_4px_0_#fff7e8]">Pedir ahora →</button> : null}</div></section>

      <section id="contacto" className="relative overflow-hidden bg-[#f6eddc] px-5 py-20 sm:px-8"><div className="absolute inset-0 opacity-45"><AssetImage folder="01_paneles_estructurales" file="widget_ubicacion_mapa.png" className="object-cover" /></div><div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_.85fr]"><div><p className="text-xs font-black uppercase tracking-[.24em] text-[#d93827]">Dónde estamos</p><h2 className="mt-3 font-serif text-5xl font-black">Una mesa cerca del mar.</h2><p className="mt-5 max-w-lg text-lg leading-8">{description}</p></div><div className="rounded-[2rem] border-4 border-[#103e75] bg-[#fff8ea] p-7 shadow-[6px_6px_0_#d93827]"><MapPin className="text-[#d93827]" /><p className="mt-3 font-serif text-2xl font-black">{address}</p><a href={`tel:${phone.replace(/\D/g, "")}`} className="mt-5 flex items-center gap-2 text-sm font-black"><Phone size={17} /> {phone}</a><p className="mt-4 text-sm">{instagram}</p></div></div></section>

      <footer className="relative overflow-hidden bg-[#103e75] px-5 py-14 text-[#fff8ea] sm:px-8"><div className="absolute inset-x-0 bottom-0 h-36 opacity-80"><AssetImage folder="01_paneles_estructurales" file="footer_azul_horno_y_tomates.png" className="object-fill object-bottom" /></div><div className="relative mx-auto flex max-w-7xl flex-wrap justify-between gap-6 pb-20"><div><p className="font-serif text-4xl font-black">{businessName}</p><p className="mt-3 max-w-sm text-sm leading-6 text-white/75">Pizza mediterránea, ingredientes simples y sobremesas largas.</p></div><div className="text-sm font-bold leading-8"><a href="#inicio">Inicio</a><br /><a href="#menu">Menú</a><br /><a href="#contacto">Contacto</a></div></div></footer>
    </div>
  );
}
