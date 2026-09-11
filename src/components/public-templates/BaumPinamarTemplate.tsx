"use client";

import Image from "next/image";
import type { ComponentProps } from "react";
import type { RestaurantPublicTemplateRenderer } from "./RestaurantPublicTemplateRenderer";

type Props = ComponentProps<typeof RestaurantPublicTemplateRenderer> & { preview?: boolean };
const money = (price: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(price);

export function BaumPinamarTemplate(props: Props) {
  const { businessName, eyebrow, title, subtitle, address, phone, instagram, imageValues, menuItems, showMenu, showReservations, showDelivery, showGallery, reservationForm, availableTimes, reservationError, onReservationChange, onReservationSubmit, onOpenOrder, preview = false } = props;
  const gallery = ["espacio1", "espacio2", "espacio3", "espacio4", "espacio5"].filter((slot) => imageValues[slot]);
  const inputClass = "mt-2 w-full rounded-none border border-[#e0ceba]/30 bg-[#251e18] px-4 py-3 text-base text-[#f5eee5] focus:border-[#e0ceba] focus:outline-none";
  return (
    <div className="overflow-x-clip bg-[#251e18] text-[#f5eee5] [font-family:Arial,sans-serif] selection:bg-[#e0ceba] selection:text-[#251e18]">
      {preview && <div className="bg-[#e0ceba] px-4 py-2 text-center text-xs font-semibold text-[#251e18]">Propuesta de Tango Reservas para Baum Pinamar · Vista previa, reservas sin enviar</div>}
      <header className="border-b border-[#e0ceba]/20">
        <div className="mx-auto flex min-h-24 max-w-7xl flex-wrap items-center justify-between gap-5 px-6 py-5 lg:px-12">
          <a href="#inicio" aria-label={businessName} className="flex items-center gap-4">
            {imageValues.logo ? <Image src={imageValues.logo} alt={businessName} width={150} height={51} unoptimized className="h-12 w-36 object-contain" /> : <span className="text-2xl font-black uppercase">{businessName}</span>}
            <span className="hidden border-l border-[#e0ceba]/30 pl-4 text-[10px] uppercase tracking-[.22em] sm:block">{businessName}</span>
          </a>
          <nav aria-label="Navegación principal" className="flex flex-wrap items-center gap-5 text-xs font-bold uppercase tracking-widest">
            {showMenu && <a href="#menu" className="hover:text-[#e0ceba]">La carta</a>}
            <a href="#contacto" className="hover:text-[#e0ceba]">Encontranos</a>
            {showReservations && <a href="#reservas" className="border border-[#e0ceba] bg-[#e0ceba] px-5 py-3 text-[#251e18]">Reservar mesa ↗</a>}
          </nav>
        </div>
      </header>

      <main>
        <section id="inicio" className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 pb-16 pt-14 lg:min-h-[620px] lg:grid-cols-[1.1fr_1fr] lg:px-12 lg:py-20">
          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[.25em] text-[#e0ceba]">{eyebrow}</p>
            <h1 className="mt-7 max-w-xl text-[clamp(3.1rem,6.5vw,6rem)] font-black uppercase leading-[.95] tracking-[-.055em]">{title}</h1>
            <p className="mt-7 max-w-md text-base leading-7 text-[#e0ceba]">{subtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest">
              {showReservations && <a href="#reservas" className="bg-[#e0ceba] px-7 py-4 text-[#251e18]">Reservá tu mesa ↗</a>}
              {showMenu && <a href="#menu" className="border border-[#e0ceba]/50 px-7 py-4">Explorá la carta</a>}
              {showDelivery && <button type="button" onClick={onOpenOrder} className="border border-[#e0ceba]/50 px-7 py-4">Hacé tu pedido</button>}
            </div>
          </div>
          <div className="relative flex min-h-[340px] items-center justify-center sm:min-h-[440px]">
            <div aria-hidden="true" className="absolute aspect-square w-[85%] rounded-full border border-[#e0ceba]/15 bg-[radial-gradient(circle,#5d4b3b_0%,#392e24_60%,transparent_72%)]" />
            {imageValues.hero && <Image src={imageValues.hero} alt={preview ? "Lata Blonde de la marca Baum" : `Imagen principal de ${businessName}`} width={600} height={700} priority unoptimized className="relative z-10 h-[340px] w-full -rotate-12 object-contain drop-shadow-2xl sm:h-[460px]" />}
            <span className="absolute bottom-4 right-0 border border-[#e0ceba]/30 px-4 py-3 text-[10px] font-bold uppercase tracking-[.2em]">{businessName}</span>
          </div>
        </section>
        <div className="border-y border-[#e0ceba]/25 bg-[#392e24] px-6 py-5 text-center text-xs font-bold uppercase tracking-[.2em]">{businessName} <span className="mx-5 text-[#8c8273]">/</span> {eyebrow}</div>

        {showMenu && <section id="menu" className="bg-[#e0ceba] px-6 py-16 text-[#251e18] lg:px-12 lg:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em]">Para elegir y compartir</p><h2 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">La carta.</h2></div>{preview && <p className="max-w-sm text-sm leading-6">Selección de cervezas de la marca. Disponibilidad y precios en Pinamar a confirmar.</p>}</div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {menuItems.map((item, index) => <article key={item.id} className="border border-[#251e18]/20 p-5">
                {(item.imageUrl || imageValues[item.imageSlot || `menu${index + 1}`]) && <Image src={item.imageUrl || imageValues[item.imageSlot || `menu${index + 1}`]} alt={item.name} width={300} height={360} unoptimized className="h-56 w-full object-contain transition-transform duration-300 hover:-rotate-6" />}
                <h3 className="mt-6 text-xl font-black uppercase">{item.name}</h3><p className="mt-3 text-sm leading-6 opacity-80">{item.description}</p>
                {!preview && <p className="mt-4 font-bold">{money(item.price)}</p>}
              </article>)}
            </div>
            {menuItems.length === 0 && <p className="border border-[#251e18]/20 p-6">La carta se publicará próximamente.</p>}
          </div>
        </section>}

        {showReservations && <section id="reservas" className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-2 lg:px-12 lg:py-24">
          <div><p className="text-xs font-bold uppercase tracking-[.22em] text-[#e0ceba]">Nos encontramos acá</p><h2 className="mt-5 text-5xl font-black uppercase leading-none tracking-tight sm:text-6xl">Una mesa.<br />Tu gente.</h2><p className="mt-7 max-w-md leading-7 text-[#e0ceba]">Elegí cuándo venir y con quién compartir el próximo encuentro.</p>{preview && <p className="mt-6 max-w-md border-l-2 border-[#e0ceba] pl-4 text-sm leading-6 text-[#e0ceba]">Este formulario es una demostración. No envía datos ni confirma reservas con el local.</p>}</div>
          <form onSubmit={onReservationSubmit} className="grid content-start gap-5 border border-[#e0ceba]/25 p-6 sm:grid-cols-2 sm:p-8">
            <label className="text-sm sm:col-span-2">Nombre<input required autoComplete="name" value={reservationForm.client} onChange={e => onReservationChange("client", e.target.value)} className={inputClass} /></label>
            <label className="text-sm">Teléfono<input required type="tel" autoComplete="tel" value={reservationForm.phone} onChange={e => onReservationChange("phone", e.target.value)} className={inputClass} /></label>
            <label className="text-sm">Personas<input required type="number" min={1} max={Math.max(1, props.capacity)} value={reservationForm.people} onChange={e => onReservationChange("people", Number(e.target.value))} className={inputClass} /></label>
            <label className="text-sm">Fecha<input required type="date" value={reservationForm.date} onChange={e => onReservationChange("date", e.target.value)} className={`${inputClass} [color-scheme:dark]`} /></label>
            <label className="text-sm">Horario<select required value={reservationForm.time} onChange={e => onReservationChange("time", e.target.value)} className={inputClass}><option value="">Elegí un horario</option>{availableTimes.map(time => <option key={time} value={time}>{time}</option>)}</select></label>
            <button type="submit" className="bg-[#e0ceba] px-6 py-4 text-sm font-bold uppercase tracking-widest text-[#251e18] sm:col-span-2">{preview ? "Probar reserva de ejemplo" : "Solicitar reserva"} ↗</button>
            {reservationError && <p role="status" className="text-sm leading-6 text-[#e0ceba] sm:col-span-2">{reservationError}</p>}
          </form>
        </section>}

        {showGallery && gallery.length > 0 && <section id="galeria" className="mx-auto max-w-7xl px-6 pb-16 lg:px-12"><h2 className="mb-6 text-3xl font-black uppercase">El lugar</h2><div className="grid gap-4 sm:grid-cols-3">{gallery.map(slot => <Image key={slot} src={imageValues[slot]} alt={`Ambiente de ${businessName}`} width={600} height={450} unoptimized className="aspect-[4/3] w-full object-cover" />)}</div></section>}
        <section id="contacto" className="border-y border-[#e0ceba]/20 bg-[#392e24] px-6 py-14 lg:px-12"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-8"><div><p className="text-xs font-bold uppercase tracking-widest text-[#e0ceba]">Encontranos</p><h2 className="mt-3 text-3xl font-black uppercase">{businessName}</h2>{address && <p className="mt-4 text-[#e0ceba]">{address}</p>}{phone && <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="mt-3 block underline">{phone}</a>}</div><div className="flex flex-wrap gap-4 text-sm">{address && <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName} ${address}`)}`} className="border border-[#e0ceba]/40 px-5 py-4">Cómo llegar ↗</a>}{instagram && <a target="_blank" rel="noreferrer" href={`https://www.instagram.com/${instagram.replace(/^.*instagram\.com\//, "").replace(/^@/, "").replace(/\/$/, "")}/`} className="border border-[#e0ceba]/40 px-5 py-4">Instagram ↗</a>}</div></div></section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-6 py-7 text-xs text-[#e0ceba] lg:px-12"><span>{businessName} · Tango Reservas</span><span>Beber con moderación. Prohibida la venta a menores de 18 años.</span></footer>
    </div>
  );
}
