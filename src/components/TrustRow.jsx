import React from 'react';

export default function TrustRow() {
  const items = [
    { icon: 'calendar_today', label: 'MIS À JOUR', value: 'Juin 2026' },
    { icon: 'shield', label: 'CONFORMITÉ', value: 'Architectes agréés' },
    { icon: 'location_city', label: 'COUVERTURE', value: '58 wilayas · RPA 99' },
    { icon: 'auto_awesome', label: 'PRÉCISION', value: 'Intelligence Artificielle' }
  ];

  return (
    <section className="bg-[var(--bg-surface-3)] border-y border-[var(--border-subtle)] py-6">
      <div className="max-w-[var(--container-max)] mx-auto px-4 lg:px-10">
        <div className="flex flex-wrap justify-between gap-6 lg:gap-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 w-[45%] lg:w-auto">
              <span className="material-symbols-outlined text-[var(--orange)] text-3xl opacity-80">{item.icon}</span>
              <div className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] font-semibold">{item.label}</span>
                <span className="text-[14px] font-bold text-[var(--text-primary)]">{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
