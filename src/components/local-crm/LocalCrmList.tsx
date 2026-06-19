import type { Customer } from "@/data/types";
import { LocalCustomerRow } from "@/components/local-crm/LocalCustomerRow";

type LocalCrmListProps = {
  customers: Customer[];
  onOpenDetail: (customer: Customer) => void;
};

export function LocalCrmList({ customers, onOpenDetail }: LocalCrmListProps) {
  return (
    <section className="space-y-4">
      <article className="hidden overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 xl:block">
        <header className="border-b border-white/10 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-slate-400 sm:px-5">
          Clientes
        </header>
        <div className="divide-y divide-white/10">
          {customers.map((customer) => (
            <LocalCustomerRow
              key={customer.id}
              customer={customer}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      </article>

      <div className="space-y-3 xl:hidden">
        {customers.map((customer) => (
          <LocalCustomerRow
            key={customer.id}
            customer={customer}
            onOpenDetail={onOpenDetail}
            variant="card"
          />
        ))}
      </div>
    </section>
  );
}
