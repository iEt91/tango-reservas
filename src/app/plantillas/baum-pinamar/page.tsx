"use client";

import { useState } from "react";
import { BaumPinamarTemplate } from "@/components/public-templates/BaumPinamarTemplate";
import { getV2WebTemplateById } from "@/lib/v2/v2-web-templates";

const assets = "/web-templates/baum-pinamar";
const beers = [
  { id: "blonde", name: "Blonde", description: "El lado dorado de Baum." },
  { id: "scottish", name: "Scottish", description: "Una clásica de la familia Baum." },
  { id: "porter", name: "Porter", description: "Para quienes eligen una cerveza oscura." },
  { id: "ipa", name: "Fuck IPA", description: "El carácter del lúpulo." },
].map(beer => ({ ...beer, price: 0, imageUrl: `${assets}/${beer.id}.png` }));

export default function BaumPinamarPreview() {
  const [form, setForm] = useState({ client: "", phone: "", email: "", people: 2, date: "", time: "", note: "" });
  const [message, setMessage] = useState("");
  return <BaumPinamarTemplate
    preview
    template={getV2WebTemplateById("baum-pinamar")}
    businessName="Baum Pinamar"
    eyebrow="Cervecería · Pinamar"
    title="Buenos momentos. Buena cerveza."
    subtitle="El próximo brindis tiene lugar en Pinamar. Una propuesta para compartir la mesa, la charla y una Baum."
    description="Propuesta web para Baum Pinamar."
    address="Simbad el Marino y Jason, Pinamar"
    phone=""
    instagram="@baum.pinamar"
    showMenu showReservations showDelivery={false} showGallery={false}
    bookingWindowDays={30} durationMinutes={90} capacity={12}
    menuItems={beers}
    imageValues={{ logo: `${assets}/logo.png`, hero: `${assets}/blonde.png` }}
    reservationForm={form}
    availableTimes={["19:00", "20:00", "21:00", "22:00"]}
    reservationError={message}
    onOpenOrder={() => {}}
    onReservationChange={(field, value) => { setForm(current => ({ ...current, [field]: value })); setMessage(""); }}
    onReservationSubmit={event => { event.preventDefault(); setMessage("Prueba completada. No se enviaron datos ni se creó una reserva. Los horarios son ilustrativos."); }}
  />;
}
