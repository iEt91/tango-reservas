"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import {
  CalendarDays,
  Camera,
  Heart,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
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

type PopArtPublicSiteProps = {
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
  bookingWindowDays: number;
  durationMinutes: number;
  capacity: number;
  menuItems: MenuItem[];
  reservationForm: ReservationForm;
  availableTimes: string[];
  reservationError: string;
  onOpenOrder: () => void;
  onReservationChange: <K extends keyof ReservationForm>(field: K, value: ReservationForm[K]) => void;
  onReservationSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const asset = (path: string) => `/web-templates/pop-art-maximalista/${path}`;

const dessertImages = [
  asset("02_postres/cono_helado_chocolate.png"),
  asset("02_postres/torta_arcoiris.png"),
  asset("02_postres/pancakes_frutos_rojos.png"),
  asset("02_postres/copa_helado_gafas_rosas.png"),
];

const galleryImages = [
  asset("05_galeria/galeria_cafeteria_retro_01.png"),
  asset("05_galeria/galeria_milkshakes_02.png"),
  asset("05_galeria/galeria_cafeteria_neon_03.png"),
  asset("05_galeria/galeria_sundae_chocolate_04.png"),
  asset("05_galeria/galeria_postres_coloridos_05.png"),
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function SectionTape({ children, color = "bg-[#ff5c93]" }: { children: React.ReactNode; color?: string }) {
  return (
    <div className={`inline-flex -rotate-1 border-2 border-black px-4 py-2 ${color} shadow-[4px_4px_0_#111]`}>
      <span className="font-black uppercase tracking-[0.14em] text-black">{children}</span>
    </div>
  );
}

export function PopArtPublicSite({
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
  bookingWindowDays,
  durationMinutes,
  capacity,
  menuItems,
  reservationForm,
  availableTimes,
  reservationError,
  onOpenOrder,
  onReservationChange,
  onReservationSubmit,
}: PopArtPublicSiteProps) {
  const featuredItems = menuItems.slice(0, 4);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f9e7d0] font-sans text-black selection:bg-[#ff5c93] selection:text-white">
      <header className="sticky top-0 z-40 border-b-4 border-black bg-[#fff6e9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 py-3 sm:px-6">
          <a href="#inicio" className="relative flex items-center gap-2" aria-label={`Inicio de ${businessName}`}>
            <span className="absolute -left-4 -top-3 h-10 w-10 rotate-12 rounded-full bg-[#ffd13b]" />
            <span className="relative font-[Impact,Arial_Black,sans-serif] text-2xl uppercase tracking-wide sm:text-3xl">
              {businessName}
            </span>
            <Image src={asset("04_stickers_principales/corazon_rosa_feliz.png")} alt="" width={34} height={34} className="relative rotate-12" />
          </a>

          <nav className="hidden items-center gap-6 text-xs font-black uppercase tracking-[0.13em] lg:flex">
            <a href="#inicio" className="hover:text-[#ed2476]">Inicio</a>
            {showMenu ? <a href="#menu" className="hover:text-[#ed2476]">Menú</a> : null}
            <a href="#galeria" className="hover:text-[#ed2476]">Galería</a>
            <a href="#contacto" className="hover:text-[#ed2476]">Contacto</a>
          </nav>

          <div className="flex items-center gap-2">
            {showReservations ? (
              <a href="#reservas" className="rounded-full border-2 border-black bg-[#ff5c93] px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_#111] transition hover:-translate-y-0.5 sm:px-5">
                Reservar
              </a>
            ) : null}
            {showDelivery ? (
              <button type="button" onClick={onOpenOrder} className="rounded-full border-2 border-black bg-[#50d8dc] px-4 py-2 text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_#111] transition hover:-translate-y-0.5 sm:px-5">
                Pedir
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section id="inicio" className="relative isolate overflow-hidden border-b-4 border-black bg-[#ff76a8]">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(#111_1.5px,transparent_1.5px)] [background-size:13px_13px]" />
        <Image src={asset("04_stickers_principales/rayo_amarillo_grande.png")} alt="" width={190} height={190} className="absolute left-[4%] top-24 z-0 -rotate-12" />
        <Image src={asset("04_stickers_principales/arcoiris_con_nubes.png")} alt="" width={150} height={120} className="absolute right-[8%] top-14 z-0 rotate-6" />

        <div className="relative mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 lg:min-h-[680px] lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-16">
          <div className="relative z-10">
            <SectionTape color="bg-[#ffd13b]">{eyebrow || "Dulce, raro y delicioso"}</SectionTape>
            <div className="relative mt-5 max-w-xl border-[5px] border-black bg-[#fffdf6] p-6 shadow-[10px_10px_0_#111] sm:p-9">
              <span className="absolute -left-5 top-8 h-8 w-8 rotate-45 border-4 border-black bg-[#50d8dc]" />
              <h1 className="font-[Impact,Arial_Black,sans-serif] text-5xl uppercase leading-[0.88] tracking-tight sm:text-7xl">
                {title}
              </h1>
              <p className="mt-5 max-w-md text-base font-bold leading-7 sm:text-lg">{subtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                {showReservations ? <a href="#reservas" className="inline-flex items-center gap-2 border-2 border-black bg-[#111] px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[4px_4px_0_#50d8dc]"><CalendarDays size={18} /> Reservá ahora</a> : null}
                {showDelivery ? <button type="button" onClick={onOpenOrder} className="inline-flex items-center gap-2 border-2 border-black bg-[#ffd13b] px-5 py-3 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_#111]"><ShoppingBag size={18} /> Pedí online</button> : null}
              </div>
            </div>
          </div>

          <div className="relative min-h-[410px] sm:min-h-[510px]">
            <Image src={asset("07_marcos_y_paneles/globo_comic_hero.png")} alt="" width={534} height={447} className="absolute left-0 top-5 z-0 h-auto w-[76%] -rotate-6" />
            <Image src={asset("01_hero/milkshake_rosa_hero.png")} alt="Milkshake especial" width={507} height={912} priority className="absolute bottom-0 left-[18%] z-20 h-auto w-[39%] drop-shadow-[9px_10px_0_rgba(0,0,0,0.95)]" />
            <Image src={asset("01_hero/torta_chocolate_helado_hero.png")} alt="Torta y helado" width={663} height={749} priority className="absolute bottom-3 right-[1%] z-10 h-auto w-[53%] -rotate-3 drop-shadow-[9px_10px_0_rgba(0,0,0,0.95)]" />
            <Image src={asset("03_personajes/mujer_retro_sorprendida.png")} alt="" width={710} height={779} className="absolute -bottom-9 -left-[6%] z-30 h-auto w-[23%] -rotate-6" />
            <Image src={asset("04_stickers_principales/estrella_explosion_amarilla.png")} alt="" width={110} height={110} className="absolute right-[43%] top-[8%] z-30 rotate-12" />
          </div>
        </div>
      </section>

      {showMenu ? (
        <section id="menu" className="relative border-b-4 border-black bg-[#50d8dc] px-4 py-14 sm:px-6">
          <div className="absolute inset-x-0 top-0 h-5 bg-[repeating-linear-gradient(45deg,#111_0_12px,#fffdf6_12px_24px,#ff5c93_24px_36px)]" />
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <SectionTape color="bg-[#fffdf6]">Los favoritos</SectionTape>
                <h2 className="mt-5 font-[Impact,Arial_Black,sans-serif] text-5xl uppercase leading-none sm:text-6xl">Postres con actitud</h2>
              </div>
              <p className="max-w-xs font-bold leading-6">Elegí tus favoritos o pedí la carta completa. Todo se actualiza desde el menú del local.</p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {featuredItems.map((item, index) => (
                <article key={item.id} className="group relative border-4 border-black bg-[#fff7e9] p-3 shadow-[7px_7px_0_#111] transition hover:-translate-y-2">
                  <span className="absolute -right-2 -top-3 z-10 rounded-full border-2 border-black bg-[#ff5c93] p-2"><Heart size={17} fill="currentColor" /></span>
                  <div className="relative h-56 overflow-hidden border-2 border-black bg-[#a77ee0]">
                    <Image src={item.imageUrl || dessertImages[index % dessertImages.length]} alt={item.name} fill sizes="(min-width: 1024px) 25vw, 50vw" unoptimized className="object-contain p-3 transition duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="mt-4 font-[Impact,Arial_Black,sans-serif] text-2xl uppercase leading-none">{item.name}</h3>
                  <p className="mt-2 min-h-12 text-sm font-semibold leading-5">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t-2 border-black pt-3"><span className="font-black">{formatCurrency(item.price)}</span><Star size={20} fill="#ffd13b" /></div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section id="galeria" className="border-b-4 border-black bg-[#a77ee0] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <SectionTape color="bg-[#ff5c93]">El lugar</SectionTape>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="border-4 border-black bg-[#fff7e9] p-6 shadow-[8px_8px_0_#111]">
              <h2 className="font-[Impact,Arial_Black,sans-serif] text-5xl uppercase leading-none">Venite a pasarla bien</h2>
              <p className="mt-5 font-bold leading-7">{description}</p>
              <Image src={asset("04_stickers_principales/labios_rosa_yummy.png")} alt="" width={94} height={94} className="ml-auto mt-5 rotate-6" />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {galleryImages.map((image, index) => (
                <div key={image} className={`relative min-h-48 border-4 border-white bg-black p-2 shadow-[5px_5px_0_#111] ${index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}>
                  <Image src={image} alt={`Ambiente ${index + 1}`} fill sizes="(min-width: 1024px) 30vw, 50vw" unoptimized className="object-cover p-2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {showReservations ? (
        <section id="reservas" className="border-b-4 border-black bg-[#ffd13b] px-4 py-14 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative">
              <SectionTape color="bg-[#50d8dc]">Reservas online</SectionTape>
              <h2 className="mt-5 font-[Impact,Arial_Black,sans-serif] text-5xl uppercase leading-none sm:text-6xl">Tu mesa te está esperando</h2>
              <p className="mt-5 max-w-lg font-bold leading-7">Elegí fecha, horario y cantidad de personas. Confirmamos la disponibilidad con la operación real del local.</p>
              <div className="mt-7 grid max-w-lg grid-cols-3 gap-3 text-center">
                {[{ label: "Ventana", value: `${bookingWindowDays} días` }, { label: "Duración", value: `${durationMinutes} min` }, { label: "Capacidad", value: `${capacity} pers.` }].map((item) => <div key={item.label} className="border-3 border-black bg-[#fff7e9] p-3 shadow-[3px_3px_0_#111]"><p className="text-[10px] font-black uppercase tracking-wide">{item.label}</p><p className="mt-1 text-sm font-black">{item.value}</p></div>)}
              </div>
              <Image src={asset("03_personajes/mano_retro_con_cuchara.png")} alt="" width={280} height={260} className="absolute -bottom-16 -left-9 hidden w-44 -rotate-12 lg:block" />
            </div>

            <form onSubmit={onReservationSubmit} className="border-4 border-black bg-[#fff7e9] p-5 shadow-[9px_9px_0_#111] sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black uppercase tracking-wide">Nombre<input required value={reservationForm.client} onChange={(event) => onReservationChange("client", event.target.value)} placeholder="Tu nombre" className="mt-2 h-12 w-full border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:bg-[#fff1a6]" /></label>
                <label className="text-xs font-black uppercase tracking-wide">Teléfono<input required value={reservationForm.phone} onChange={(event) => onReservationChange("phone", event.target.value)} placeholder="11 2345 6789" className="mt-2 h-12 w-full border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:bg-[#fff1a6]" /></label>
                <label className="text-xs font-black uppercase tracking-wide">Email<input type="email" value={reservationForm.email} onChange={(event) => onReservationChange("email", event.target.value)} placeholder="tu@email.com" className="mt-2 h-12 w-full border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:bg-[#fff1a6]" /></label>
                <label className="text-xs font-black uppercase tracking-wide">Personas<input type="number" min={1} max={capacity} value={reservationForm.people} onChange={(event) => onReservationChange("people", Math.max(Number(event.target.value) || 1, 1))} className="mt-2 h-12 w-full border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:bg-[#fff1a6]" /></label>
                <label className="text-xs font-black uppercase tracking-wide">Fecha<input required type="date" value={reservationForm.date} onChange={(event) => onReservationChange("date", event.target.value)} className="mt-2 h-12 w-full border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:bg-[#fff1a6]" /></label>
                <label className="text-xs font-black uppercase tracking-wide">Horario<select required value={reservationForm.time} onChange={(event) => onReservationChange("time", event.target.value)} className="mt-2 h-12 w-full border-2 border-black bg-white px-3 text-sm font-semibold outline-none focus:bg-[#fff1a6]"><option value="">Elegí un horario</option>{availableTimes.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
              </div>
              <label className="mt-4 block text-xs font-black uppercase tracking-wide">Nota opcional<textarea value={reservationForm.note} onChange={(event) => onReservationChange("note", event.target.value)} placeholder="Alergias, festejo o preferencia" className="mt-2 min-h-24 w-full border-2 border-black bg-white p-3 text-sm font-semibold outline-none focus:bg-[#fff1a6]" /></label>
              {reservationError ? <p className="mt-4 border-2 border-black bg-[#ff9ab9] p-3 text-sm font-bold">{reservationError}</p> : null}
              <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 border-3 border-black bg-[#ff5c93] px-5 py-4 text-sm font-black uppercase tracking-wide shadow-[4px_4px_0_#111] transition hover:-translate-y-0.5"><CalendarDays size={19} /> Enviar reserva</button>
            </form>
          </div>
        </section>
      ) : null}

      <section id="contacto" className="border-b-4 border-black bg-[#ff5c93] px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div><SectionTape color="bg-[#ffd13b]">Encontranos</SectionTape><h2 className="mt-5 font-[Impact,Arial_Black,sans-serif] text-5xl uppercase leading-none">Nos vemos ahí</h2></div>
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 border-4 border-black bg-[#fff7e9] p-5 shadow-[6px_6px_0_#111]"><MapPin size={34} /><span className="font-black">{address}</span></a>
          <div className="flex flex-wrap items-center gap-3 border-4 border-black bg-[#50d8dc] p-5 shadow-[6px_6px_0_#111]"><a href={`tel:${phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 font-black"><Phone size={20} /> {phone}</a><a href={`https://instagram.com/${instagram.replace("@", "")}`} target="_blank" rel="noreferrer" className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-[#fff7e9]"><Camera size={20} /></a><Sparkles className="ml-auto" /></div>
        </div>
      </section>

      <footer className="bg-black px-4 py-7 text-[#fff7e9] sm:px-6"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><p className="font-[Impact,Arial_Black,sans-serif] text-2xl uppercase tracking-wide">{businessName}</p><p className="text-xs font-bold uppercase tracking-[0.15em]">Hecho para los antojos · © 2026</p><Image src={asset("04_stickers_principales/margarita_smiley.png")} alt="" width={40} height={40} /></div></footer>
    </main>
  );
}
