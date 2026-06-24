import React from 'react';

export default function NavSidebar({ activePage, onNavigate, onNewEstimation }) {
  const navItems = [
    { id: 'wizard', label: 'Estimations', icon: 'calculate' },
    { id: 'landing', label: 'Retour à l\'accueil', icon: 'home' },
  ];

  const renderNav = (items) => (
    <nav className="flex flex-col gap-1 mt-6 w-full">
      {items.map(item => {
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 w-full h-[40px] px-4 py-[12px] text-sm font-medium transition-all min-h-[44px] ${
              isActive 
                ? 'bg-[var(--orange)] text-white' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-high)] hover:text-white hover:rounded-lg'
            } ${isActive ? 'rounded-full' : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 sidebar-fixed bg-[var(--bg-surface-3)] border-r border-[var(--border-subtle)] z-40 p-4">
      {/* User Card */}
      <div className="flex items-center gap-3 p-2 mb-4 w-full">
        <div className="w-[44px] h-[44px] rounded-full bg-[var(--orange)] flex items-center justify-center text-white font-bold text-sm shrink-0">
          KB
        </div>
        <div className="flex flex-col text-left overflow-hidden">
          <span className="label-caps !text-[var(--text-primary)] truncate">Karim B.</span>
          <span className="text-[var(--text-muted)] text-[11px] truncate">Projet Oran (En cours)</span>
        </div>
      </div>

      <button onClick={onNewEstimation} className="btn-primary w-full h-[48px] rounded-xl orange-glow mb-2 flex items-center justify-start px-4">
        <span className="material-symbols-outlined mr-2">add</span>
        Nouvelle estimation
      </button>

      <div className="flex-1 overflow-y-auto w-full">
        {renderNav(navItems)}
      </div>
    </aside>
  );
}
