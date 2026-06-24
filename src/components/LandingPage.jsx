import React from 'react';
import TopAppBar from './TopAppBar';

export default function LandingPage({ onNavigate, lang, onLangChange }) {
  return (
    <div className="min-h-dvh bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors duration-300 overflow-x-hidden w-full">
      {/* Header */}
      <TopAppBar authenticated={false} activePage="landing" onNavigate={onNavigate} lang={lang} onLangChange={onLangChange} />
      
      <main className="layout-content">
        
        {/* Section 1 — Hero */}
        <section className="relative bg-[var(--bg-base)] py-24 lg:py-32 px-4 border-b border-[var(--border-subtle)] overflow-hidden">
          {/* Subtle radial dot grid */}
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, var(--text-primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          
          {/* Constrained Container & Grid */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Column (Hero Content) */}
            <div className="flex flex-col gap-6 text-start items-start">
              {/* Algerian Construction Intelligence indicator */}
              <div className="inline-flex items-center gap-2 bg-[rgba(14,155,138,0.1)] border border-[rgba(14,155,138,0.25)] rounded-full px-4 py-1.5 self-start">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--teal)] animate-pulse"></div>
                <span className="text-xs font-bold text-[var(--teal)] tracking-wider uppercase font-['Space_Grotesk']">
                  {lang === 'ar' ? 'الذكاء الإنشائي الجزائري' : 'Algerian Construction Intelligence'}
                </span>
              </div>
              
              {/* H1 Heading - Pure White, Punchy typography */}
              <h1 className="font-['Manrope'] font-extrabold text-[40px] lg:text-[56px] leading-[1.1] text-white tracking-tight">
                {lang === 'ar' ? (
                  'قبل وضع أول آجرة، اعرف بالضبط ما يمكنك بناؤه.'
                ) : (
                  'Avant de poser la première brique, sachez exactement ce que vous pouvez construire.'
                )}
              </h1>
              
              {/* Description */}
              <p className="font-['Plus_Jakarta_Sans'] text-[15px] lg:text-[16px] text-[var(--text-secondary)] max-w-lg leading-relaxed">
                {lang === 'ar' ? (
                  'أدخل معاييرك. احصل على مخطط، تقدير وقائمة المواد في 5 دقائق. لولايتك. قبل إنفاق الدينار الأول.'
                ) : (
                  'Entrez vos paramètres. Obtenez un plan, une estimation et une liste de matériaux en 5 minutes. Pour votre wilaya. Avant de dépenser le premier dinar.'
                )}
              </p>
              
              {/* CTA Button */}
              <div className="mt-2">
                <button 
                  onClick={() => onNavigate('wizard')} 
                  className="btn-primary lg bg-[#E8622A] hover:bg-[#d5521e] text-white orange-glow rounded-full px-8 font-bold transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  {lang === 'ar' ? 'احسب تقديري مجاناً ←' : 'Calculer mon estimation gratuitement →'}
                </button>
              </div>

              {/* Vertical Trust Badges stacked underneath CTA */}
              <div className="flex flex-col gap-3.5 mt-8 border-t border-[var(--border-subtle)] pt-6 max-w-md">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--teal)] text-xl">cached</span>
                  <span className="text-sm text-[var(--text-secondary)] font-medium">
                    {lang === 'ar' ? 'تم التحديث في جوان 2026' : 'Mis à jour Juin 2026'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--teal)] text-xl">verified</span>
                  <span className="text-sm text-[var(--text-secondary)] font-medium">
                    {lang === 'ar' ? 'معتمد من طرف مهندسين معتمدين' : 'Validé par des architectes agréés'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[var(--teal)] text-xl">grid_view</span>
                  <span className="text-sm text-[var(--text-secondary)] font-medium">
                    {lang === 'ar' ? '58 ولاية · المناطق الزلزالية RPA 99' : '58 wilayas · Zones sismiques RPA 99'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right Column (Elevated Estimate Card) */}
            <div className="w-full flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[480px] lg:max-w-[500px] lg:scale-105 bg-[#132034] border border-white/5 rounded-2xl p-7 shadow-2xl shadow-black/50 z-10">
                
                {/* Card Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-['Manrope'] font-bold text-lg text-white mb-1">
                      {lang === 'ar' ? 'مشروع فيلا R+1' : 'Projet Villa R+1'}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] font-['Space_Grotesk'] font-medium">
                      {lang === 'ar' ? 'الجزائر، المنطقة الزلزالية III' : 'Algiers, Zone Sismique III'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-[var(--teal)] tracking-wider uppercase mb-1 font-['Space_Grotesk']">
                      {lang === 'ar' ? 'الميزانية التقديرية' : 'BUDGET ESTIMÉ'}
                    </div>
                    <div className="font-['Space_Grotesk'] font-bold text-base lg:text-lg text-white">
                      12.5M - 14.2M DA
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-[rgba(255,255,255,0.06)] my-3"></div>
                
                {/* Blueprint Drawing SVG */}
                <div className="w-full h-48 my-4 relative overflow-hidden rounded-lg">
                  <svg viewBox="0 0 400 200" className="w-full h-full bg-[#091322] border border-white/5 rounded-lg overflow-hidden">
                    <defs>
                      <pattern id="blueprint-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(14, 155, 138, 0.08)" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
                    
                    {/* Walls & Dividers */}
                    <rect x="30" y="25" width="340" height="150" fill="none" stroke="rgba(14, 155, 138, 0.55)" strokeWidth="2.5" />
                    <line x1="160" y1="25" x2="160" y2="175" stroke="rgba(14, 155, 138, 0.45)" strokeWidth="1.5" />
                    <line x1="30" y1="100" x2="160" y2="100" stroke="rgba(14, 155, 138, 0.45)" strokeWidth="1.5" />
                    <line x1="260" y1="25" x2="260" y2="115" stroke="rgba(14, 155, 138, 0.45)" strokeWidth="1.5" />
                    <line x1="160" y1="115" x2="370" y2="115" stroke="rgba(14, 155, 138, 0.45)" strokeWidth="1.5" />
                    
                    {/* Doors & Stairs */}
                    <path d="M 30 135 A 40 40 0 0 1 70 175" fill="none" stroke="rgba(232, 98, 42, 0.5)" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="30" y1="135" x2="30" y2="175" stroke="rgba(232, 98, 42, 0.6)" strokeWidth="1.5" />
                    
                    <g stroke="rgba(14, 155, 138, 0.3)" strokeWidth="1">
                      <rect x="175" y="40" width="70" height="65" fill="none" />
                      <line x1="175" y1="53" x2="245" y2="53" />
                      <line x1="175" y1="66" x2="245" y2="66" />
                      <line x1="175" y1="79" x2="245" y2="79" />
                      <path d="M 210 85 L 210 45" fill="none" stroke="rgba(232, 98, 42, 0.6)" strokeWidth="1.5" />
                    </g>
                    
                    {/* Labels */}
                    <text x="95" y="75" fill="rgba(227, 226, 232, 0.45)" fontSize="9" fontFamily="monospace" textAnchor="middle">SALON</text>
                    <text x="95" y="145" fill="rgba(227, 226, 232, 0.45)" fontSize="9" fontFamily="monospace" textAnchor="middle">CUISINE</text>
                    <text x="315" y="150" fill="rgba(227, 226, 232, 0.45)" fontSize="9" fontFamily="monospace" textAnchor="middle">CHAMBRE</text>
                    
                    <text x="200" y="12" fill="rgba(14, 155, 138, 0.5)" fontSize="8" fontFamily="monospace" textAnchor="middle">12.00m</text>
                  </svg>
                </div>
                
                <div className="border-t border-[rgba(255,255,255,0.06)] my-3"></div>
                
                {/* Specs Footer */}
                <div className="grid grid-cols-3 gap-4 text-center mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-1 font-['Space_Grotesk']">
                      {lang === 'ar' ? 'المساحة' : 'SURFACE'}
                    </span>
                    <span className="font-['Space_Grotesk'] font-bold text-sm text-white">
                      140 m²
                    </span>
                  </div>
                  <div className="flex flex-col border-x border-[rgba(255,255,255,0.06)]">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-1 font-['Space_Grotesk']">
                      {lang === 'ar' ? 'الخرسانة' : 'BÉTON'}
                    </span>
                    <span className="font-['Space_Grotesk'] font-bold text-sm text-white">
                      45 m³
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-1 font-['Space_Grotesk']">
                      {lang === 'ar' ? 'الحديد' : 'ACIER'}
                    </span>
                    <span className="font-['Space_Grotesk'] font-bold text-sm text-white">
                      3.2 t
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </section>


        {/* Section 3 — Estimations Récentes */}
        <section id="recent-estimations" className="bg-[var(--bg-base)] py-24 lg:py-32 px-4 border-b border-[var(--border-subtle)]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center mb-16">
              <h2 className="font-['Manrope'] font-extrabold text-2xl lg:text-3xl mb-3 text-white tracking-wide">
                {lang === 'ar' ? 'التقديرات الأخيرة' : 'Estimations Récentes'}
              </h2>
              {/* Mandatory Darija Subtitle */}
              <p className="text-[var(--text-muted)] text-base font-['Noto_Sans_Arabic'] font-medium mt-2" dir="rtl">
                هاك واش بنى جيران — بش قدر تبني أنت؟
              </p>
            </div>
            
            {/* Card Grid - bg-[#132034], border border-white/10, rounded-2xl */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Oran */}
              <div className="bg-[#132034] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-[#E8622A]/50 transition-all duration-300 shadow-lg">
                <div className="absolute right-4 top-4 opacity-5 text-white pointer-events-none select-none">
                  <span className="material-symbols-outlined text-7xl">location_city</span>
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-1 font-['Space_Grotesk']">
                      {lang === 'ar' ? 'الولاية' : 'WILAYA'}
                    </div>
                    {/* Bold pure white Wilaya text */}
                    <div className="font-['Manrope'] font-bold text-xl text-white">
                      {lang === 'ar' ? 'وهران' : 'Oran'}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold border border-[var(--info)] bg-[var(--info-bg)] text-[var(--info)] px-2.5 py-1 rounded-full font-['Space_Grotesk']">
                    Zone IIa
                  </span>
                </div>
                
                <div className="border-t border-white/5 my-4"></div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[var(--text-secondary)]">{lang === 'ar' ? 'المساحة' : 'Surface'}</span>
                  <span className="font-['Space_Grotesk'] font-bold text-white text-base">120 m²</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">{lang === 'ar' ? 'الميزانية' : 'Budget'}</span>
                  <span className="font-['Space_Grotesk'] font-bold text-[#E8622A] text-base">9.8M - 11.2M DA</span>
                </div>
              </div>
              
              {/* Card 2: Constantine */}
              <div className="bg-[#132034] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-[#E8622A]/50 transition-all duration-300 shadow-lg">
                <div className="absolute right-4 top-4 opacity-5 text-white pointer-events-none select-none">
                  <span className="material-symbols-outlined text-7xl">location_city</span>
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-1 font-['Space_Grotesk']">
                      {lang === 'ar' ? 'الولاية' : 'WILAYA'}
                    </div>
                    {/* Bold pure white Wilaya text */}
                    <div className="font-['Manrope'] font-bold text-xl text-white">
                      {lang === 'ar' ? 'قسنطينة' : 'Constantine'}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold border border-[var(--danger)] bg-[var(--danger-bg)] text-[var(--danger)] px-2.5 py-1 rounded-full font-['Space_Grotesk']">
                    Zone IIb
                  </span>
                </div>
                
                <div className="border-t border-white/5 my-4"></div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[var(--text-secondary)]">{lang === 'ar' ? 'المساحة' : 'Surface'}</span>
                  <span className="font-['Space_Grotesk'] font-bold text-white text-base">160 m²</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">{lang === 'ar' ? 'الميزانية' : 'Budget'}</span>
                  <span className="font-['Space_Grotesk'] font-bold text-[#E8622A] text-base">14.5M - 16.0M DA</span>
                </div>
              </div>

              {/* Card 3: Ghardaïa */}
              <div className="bg-[#132034] border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-[#E8622A]/50 transition-all duration-300 shadow-lg">
                <div className="absolute right-4 top-4 opacity-5 text-white pointer-events-none select-none">
                  <span className="material-symbols-outlined text-7xl">location_city</span>
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase mb-1 font-['Space_Grotesk']">
                      {lang === 'ar' ? 'الولاية' : 'WILAYA'}
                    </div>
                    {/* Bold pure white Wilaya text */}
                    <div className="font-['Manrope'] font-bold text-xl text-white">
                      {lang === 'ar' ? 'غرداية' : 'Ghardaïa'}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold border border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)] px-2.5 py-1 rounded-full font-['Space_Grotesk']">
                    Zone I
                  </span>
                </div>
                
                <div className="border-t border-white/5 my-4"></div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[var(--text-secondary)]">{lang === 'ar' ? 'المساحة' : 'Surface'}</span>
                  <span className="font-['Space_Grotesk'] font-bold text-white text-base">200 m²</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--text-secondary)]">{lang === 'ar' ? 'الميزانية' : 'Budget'}</span>
                  <span className="font-['Space_Grotesk'] font-bold text-[#E8622A] text-base">12.0M - 13.8M DA</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
      </main>

      {/* Footer */}
      <footer className="bg-[#08101A] border-t border-[var(--border-subtle)] py-16 px-4 lg:px-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between gap-10 mb-12">
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-['Manrope'] font-extrabold text-white text-xl">BINAA</span>
              </div>
              <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
                {lang === 'ar' ? (
                  'الذكاء الاصطناعي في خدمة البناء في الجزائر. احسب، خطط وابنِ بكل ثقة.'
                ) : (
                  'L\'intelligence artificielle au service de la construction en Algérie. Calculez, planifiez et bâtissez avec certitude.'
                )}
              </p>
              {/* Tagline aligned correctly (RTL) */}
              <div className="text-sm text-[#E8622A] font-bold mb-4 font-['Noto_Sans_Arabic']" dir="rtl">
                خطط لدارك. احسب تكلفتها. قبل ما تبدأ.
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
              <div>
                <h4 className="font-bold text-white mb-4 text-xs uppercase tracking-wider font-['Space_Grotesk']">
                  {lang === 'ar' ? 'الموارد' : 'Ressources'}
                </h4>
                <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                  <li className="hover:text-white cursor-pointer transition-colors">{lang === 'ar' ? 'دليل RPA 99' : 'Guide RPA 99'}</li>
                  <li className="hover:text-white cursor-pointer transition-colors">{lang === 'ar' ? 'أسعار المواد' : 'Prix Matériaux'}</li>
                  <li className="hover:text-white cursor-pointer transition-colors">{lang === 'ar' ? 'دليل الحرفيين' : 'Annuaire Artisans'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4 text-xs uppercase tracking-wider font-['Space_Grotesk']">
                  {lang === 'ar' ? 'قانوني' : 'Légal'}
                </h4>
                <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                  <li className="hover:text-white cursor-pointer transition-colors">{lang === 'ar' ? 'شروط الاستخدام' : 'Conditions d\'utilisation'}</li>
                  <li className="hover:text-white cursor-pointer transition-colors">{lang === 'ar' ? 'سياسة الخصوصية' : 'Confidentialité'}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4 text-xs uppercase tracking-wider font-['Space_Grotesk']">
                  {lang === 'ar' ? 'اللغة' : 'Langue'}
                </h4>
                <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                  <li onClick={() => onLangChange('fr')} className={`cursor-pointer flex items-center gap-2 transition-colors ${lang === 'fr' ? 'text-white font-bold' : 'hover:text-white'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-[var(--orange)] ${lang === 'fr' ? 'opacity-100' : 'opacity-0'}`}></span> Français
                  </li>
                  <li onClick={() => onLangChange('ar')} className={`cursor-pointer flex items-center gap-2 transition-colors ${lang === 'ar' ? 'text-white font-bold' : 'hover:text-white'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full bg-[var(--orange)] ${lang === 'ar' ? 'opacity-100' : 'opacity-0'}`}></span> العربية
                  </li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-[var(--border-subtle)] pt-8 flex flex-col lg:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[var(--text-muted)]">
              © 2026 BINAA AI. All rights reserved.
            </p>
            <div className="badge-coastal border border-[var(--info)] bg-transparent font-['Space_Grotesk'] text-[10px] font-bold py-1 px-3">
              {lang === 'ar' ? 'معتمد وفقاً لـ RPA 99 / DERIVE 2.1' : 'CERTIFIÉ CONFORME RPA 99 / DERIVE 2.1'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
