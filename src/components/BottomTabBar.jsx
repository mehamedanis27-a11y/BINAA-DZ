import React from 'react';

export default function BottomTabBar({ activePage, onNavigate }) {
  const tabs = [
    { id: 'wizard', label: 'Estimations', icon: 'calculate' },
    { id: 'landing', label: 'Accueil', icon: 'home' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full h-[64px] bg-[var(--bg-surface-highest)] border-t border-[var(--border-subtle)] z-50 flex items-center justify-around px-2 pb-safe">
      {tabs.map(tab => {
        const isActive = activePage === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] gap-1 transition-colors ${
              isActive ? 'text-[var(--orange)]' : 'text-[var(--text-muted)]'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`} style={{ fontSize: '24px' }}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
