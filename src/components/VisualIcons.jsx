import React from 'react';

// Common gradients definitions to embed in SVGs
export function SVGDefs() {
  return (
    <svg className="absolute w-0 h-0" width="0" height="0">
      <defs>
        <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
        <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="grayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// 1. R+0 Floor Plan Icon
export function IconR0({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ground plane */}
      <line x1="4" y1="40" x2="44" y2="40" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      {/* Floor outline */}
      <rect x="8" y="24" width="32" height="16" rx="2" fill="url(#orangeGrad)" fillOpacity="0.1" stroke="url(#orangeGrad)" strokeWidth="2" />
      {/* Door */}
      <rect x="14" y="30" width="6" height="10" rx="1" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      {/* Window */}
      <rect x="26" y="28" width="8" height="6" rx="1" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      <line x1="30" y1="28" x2="30" y2="34" stroke="url(#orangeGrad)" strokeWidth="1" />
      <line x1="26" y1="31" x2="34" y2="31" stroke="url(#orangeGrad)" strokeWidth="1" />
    </svg>
  );
}

// 2. R+1 Floor Plan Icon
export function IconR1({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="40" x2="44" y2="40" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      {/* Ground Floor */}
      <rect x="8" y="26" width="32" height="14" fill="url(#orangeGrad)" fillOpacity="0.08" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      {/* First Floor */}
      <rect x="8" y="12" width="32" height="14" fill="url(#orangeGrad)" fillOpacity="0.15" stroke="url(#orangeGrad)" strokeWidth="2" />
      {/* Door */}
      <rect x="14" y="32" width="6" height="8" rx="1" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      {/* Windows */}
      <rect x="28" y="30" width="6" height="5" rx="1" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1.2" />
      <rect x="14" y="16" width="6" height="6" rx="1" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1.2" />
      <rect x="28" y="16" width="6" height="6" rx="1" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1.2" />
    </svg>
  );
}

// 3. R+2 Floor Plan Icon
export function IconR2({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="40" x2="44" y2="40" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
      {/* G floor */}
      <rect x="10" y="30" width="28" height="10" fill="url(#orangeGrad)" fillOpacity="0.05" stroke="url(#orangeGrad)" strokeWidth="1.2" />
      {/* 1st floor */}
      <rect x="10" y="20" width="28" height="10" fill="url(#orangeGrad)" fillOpacity="0.1" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      {/* 2nd floor */}
      <rect x="10" y="10" width="28" height="10" fill="url(#orangeGrad)" fillOpacity="0.2" stroke="url(#orangeGrad)" strokeWidth="2" />
      {/* Door */}
      <rect x="14" y="34" width="5" height="6" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1.2" />
      {/* Windows G */}
      <rect x="29" y="33" width="5" height="4" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1" />
      {/* Windows 1 */}
      <rect x="14" y="23" width="5" height="4" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1" />
      <rect x="29" y="23" width="5" height="4" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1" />
      {/* Windows 2 */}
      <rect x="14" y="13" width="5" height="4" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1" />
      <rect x="29" y="13" width="5" height="4" fill="#0F172A" stroke="url(#orangeGrad)" strokeWidth="1" />
    </svg>
  );
}

// 4. Flat Terrain Icon
export function IconFlat({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="6" y1="36" x2="42" y2="36" stroke="url(#tealGrad)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Flat soil indicator line */}
      <line x1="6" y1="40" x2="42" y2="40" stroke="#1E293B" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Simple house outline resting flat */}
      <path d="M16 36V26L24 20L32 26V36H16Z" fill="url(#tealGrad)" fillOpacity="0.15" stroke="url(#tealGrad)" strokeWidth="1.5" />
    </svg>
  );
}

// 5. Steep/Slope Terrain Icon
export function IconSteep({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sloping ground */}
      <line x1="6" y1="40" x2="42" y2="20" stroke="url(#tealGrad)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stepped outline showing structural adjustment */}
      <path d="M18 33V23L24 18L30 21.5V26.5" fill="none" stroke="url(#orangeGrad)" strokeWidth="1.5" strokeDasharray="2 2" />
      <path d="M18 33.3L24 30V35" fill="none" stroke="url(#orangeGrad)" strokeWidth="1.5" />
    </svg>
  );
}

// 6. Rocky/Dur Soil Icon
export function IconRock({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Layer representations */}
      <rect x="6" y="8" width="36" height="32" rx="4" fill="url(#grayGrad)" fillOpacity="0.2" stroke="#475569" strokeWidth="1.5" />
      <path d="M8 22C12 20 16 24 20 21C24 18 28 22 32 20C36 18 40 22 40 22" stroke="#64748B" strokeWidth="1.5" />
      <path d="M8 32C12 30 16 34 20 31C24 28 28 32 32 30C36 28 40 32 40 32" stroke="#475569" strokeWidth="1.5" />
      {/* Stone elements inside rocky soil */}
      <path d="M12 14L16 12L18 15L14 17L12 14Z" fill="url(#orangeGrad)" fillOpacity="0.2" stroke="url(#orangeGrad)" strokeWidth="1" />
      <path d="M30 25L34 24L35 27L31 28L30 25Z" fill="url(#orangeGrad)" fillOpacity="0.2" stroke="url(#orangeGrad)" strokeWidth="1" />
      <path d="M22 13L25 15L23 18L20 16L22 13Z" fill="#334155" />
    </svg>
  );
}

// 7. Unknown Soil Icon
export function IconUnknown({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="36" height="32" rx="4" fill="url(#grayGrad)" fillOpacity="0.1" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* Question mark details */}
      <path d="M24 28V26C24 24.5 25 23.5 26 23C27.5 22.25 28.5 20.75 28.5 19C28.5 16.5 26.5 14.5 24 14.5C21.5 14.5 19.5 16.5 19.5 19" stroke="url(#orangeGrad)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="32.5" r="1.5" fill="url(#orangeGrad)" />
      {/* Search scope overlay */}
      <circle cx="24" cy="24" r="14" stroke="url(#tealGrad)" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.4" />
    </svg>
  );
}

// 8. Flat Roof Type (Terrasse Plate)
export function IconRoofFlat({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="24" width="32" height="16" rx="2" fill="url(#orangeGrad)" fillOpacity="0.1" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      {/* Flat slab roof */}
      <rect x="6" y="18" width="36" height="6" rx="1" fill="url(#orangeGrad)" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      {/* Left/right boundaries */}
      <line x1="8" y1="18" x2="8" y2="24" stroke="url(#orangeGrad)" strokeWidth="1" />
      <line x1="40" y1="18" x2="40" y2="24" stroke="url(#orangeGrad)" strokeWidth="1" />
    </svg>
  );
}

// 9. Tiled Roof Type (Tuiles)
export function IconRoofTiled({ className = "w-12 h-12" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="24" width="32" height="16" rx="2" fill="url(#orangeGrad)" fillOpacity="0.1" stroke="url(#orangeGrad)" strokeWidth="1.5" />
      {/* Triangular pitched roof outline */}
      <path d="M4 24L24 8L44 24H4Z" fill="url(#orangeGrad)" fillOpacity="0.2" stroke="url(#orangeGrad)" strokeWidth="2" strokeLinejoin="round" />
      {/* Tiling texture lines */}
      <line x1="14" y1="16" x2="20" y2="22" stroke="url(#orangeGrad)" strokeWidth="1" />
      <line x1="24" y1="10" x2="32" y2="18" stroke="url(#orangeGrad)" strokeWidth="1" />
      <line x1="34" y1="16" x2="28" y2="22" stroke="url(#orangeGrad)" strokeWidth="1" />
    </svg>
  );
}

// 10. Compass Orientation Rose
export function IconCompassRose({ direction = "N", className = "w-12 h-12" }) {
  const rotation = direction === "E" ? 90 : direction === "S" ? 180 : direction === "W" ? 270 : 0;
  return (
    <svg className={`${className} transition-transform duration-500`} style={{ transform: `rotate(${rotation}deg)` }} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="#334155" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="14" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
      {/* Cardinal letters */}
      <text x="24" y="12" fill={direction === "N" ? "#F97316" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">N</text>
      <text x="36" y="27" fill={direction === "E" ? "#F97316" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">E</text>
      <text x="24" y="42" fill={direction === "S" ? "#F97316" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">S</text>
      <text x="12" y="27" fill={direction === "W" ? "#F97316" : "#475569"} fontSize="8" fontWeight="bold" textAnchor="middle">O</text>
      {/* Needle */}
      <path d="M24 13L27 24L24 28L21 24L24 13Z" fill="url(#orangeGrad)" stroke="url(#orangeGrad)" strokeWidth="1" />
      <path d="M24 35L21 24L24 28L27 24L24 35Z" fill="#1E293B" stroke="#334155" strokeWidth="1" />
      <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
    </svg>
  );
}
