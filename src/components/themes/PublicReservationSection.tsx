import { ReservationWidget } from "@/components/ReservationWidget";
import type { Business, PublicWebContent, Service } from "@/data/types";
import { getBusinessServices } from "@/data/scheduling";
import {
  createDemoPublicRules,
  getPublicReservationConfig,
} from "@/lib/public-reservation-config";

type PublicReservationSectionProps = {
  business: Business;
  content: PublicWebContent;
  variant?: "elegant" | "visual" | "minimal";
  publicDataSource?: "local" | "supabase";
  servicesOverride?: Service[];
};

export function PublicReservationSection({
  business,
  content,
  variant = "elegant",
  publicDataSource = "local",
  servicesOverride,
}: PublicReservationSectionProps) {
  const showReservation =
    typeof content.showReservations === "boolean" ? content.showReservations : content.showReservation;

  if (!showReservation) {
    return null;
  }

  const services = getBusinessServices(business.id);
  const reservationConfig = getPublicReservationConfig(business.id);
  const hours = reservationConfig.hours;
  const supabaseRules = reservationConfig.rules ?? createDemoPublicRules(business.id);
  const localRules = reservationConfig.rules;

  if (publicDataSource === "supabase") {
    return (
      <div
        id="reservas"
        className={`rounded-[2rem] border border-white/10 ${
          variant === "minimal" ? "bg-slate-950/60" : "bg-white/5"
        } p-2 shadow-2xl shadow-black/20`}
      >
        <ReservationWidget
          business={business}
          services={servicesOverride ?? []}
          rules={supabaseRules}
          hours={hours}
          variant={variant}
          hoursNotice={reservationConfig.notice}
        />
      </div>
    );
  }

  if (!localRules || services.length === 0) {
    return (
      <section
        id="reservas"
        className={`rounded-[2rem] border border-white/10 p-5 shadow-2xl shadow-black/20 ${
          variant === "minimal" ? "bg-slate-950/60" : "bg-white/5"
        }`}
      >
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Reservas</p>
          <h3 className="text-xl font-semibold text-white">{business.reservationTitle}</h3>
          <p className="text-sm leading-6 text-slate-300">
            Todavía no hay servicios o reglas configuradas para este negocio.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div
      id="reservas"
      className={`rounded-[2rem] border border-white/10 ${
        variant === "minimal" ? "bg-slate-950/60" : "bg-white/5"
      } p-2 shadow-2xl shadow-black/20`}
    >
      <ReservationWidget
        business={business}
        services={services}
        rules={localRules}
        hours={hours}
        variant={variant}
        hoursNotice={reservationConfig.notice}
      />
    </div>
  );
}
