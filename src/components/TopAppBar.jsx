import React from 'react';

export default function TopAppBar({ authenticated, activePage, onNavigate, lang, onLangChange }) {
  const toggleLang = () => {
    onLangChange(lang === 'fr' ? 'ar' : 'fr');
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[var(--bg-surface-2)] border-b border-[var(--border-subtle)]" style={{ height: 'var(--topbar-height)' }}>
      <div className="w-full px-4 lg:px-10 h-full flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
          {lang === 'ar' ? (
             <><span className="font-['Noto_Sans_Arabic'] text-[var(--orange)] text-xl font-bold">بناء</span><span className="font-['Syne'] font-extrabold text-white text-xl tracking-wide ml-2">BINAA</span></>
          ) : (
             <><span className="font-['Syne'] font-extrabold text-white text-xl tracking-wide">BINAA</span><span className="font-['Noto_Sans_Arabic'] text-[var(--orange)] text-xl font-bold ml-2">بناء</span></>
          )}
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => onNavigate('landing')}
            className={`text-sm font-medium transition-colors cursor-pointer ${activePage === 'landing' ? 'text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}
          >
            {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
          </button>
          <button 
            onClick={() => document.getElementById('recent-estimations')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'أسعار السوق' : 'Market Prices'}
          </button>
        </nav>

        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLang} 
            className="flex items-center gap-1.5 text-xs lg:text-sm text-[var(--text-secondary)] hover:text-white transition-colors min-h-[44px] px-2 font-medium cursor-pointer" 
            title="Changer de langue / تغيير اللغة"
          >
            <span className="material-symbols-outlined text-lg">language</span>
            <span>{lang === 'fr' ? 'العربية' : 'Français'}</span>
          </button>
          <button 
            onClick={() => onNavigate('wizard')}
            className="btn-primary bg-[#E8622A] text-white rounded-full px-6 py-2 font-bold text-sm hidden md:flex transition-transform hover:scale-105"
          >
            {lang === 'ar' ? 'ابدأ' : 'Commencer'}
          </button>
        </div>

      </div>
    </header>
  );
}
