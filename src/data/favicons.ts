export interface FaviconItem {
  id: string;
  name: string;
  category: string;
  description: string;
  svg: string;
}

export const FAVICON_COLLECTION: FaviconItem[] = [
  {
    id: 'bio-flask',
    name: 'Assay Flask & Helix',
    category: 'Biotech',
    description: 'Indigo and cyan analytical flask with active Archachatina reactive reagent',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="gf1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="gf2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
  <path d="M26 14 H38 V22 L49 39 C51.5 43 48.5 48 44 48 H20 C15.5 48 12.5 43 15 39 L26 22 Z" fill="url(#gf1)" opacity="0.2" />
  <path d="M26 14 H38 V22 L49 39 C51.5 43 48.5 48 44 48 H20 C15.5 48 12.5 43 15 39 L26 22 Z" fill="none" stroke="url(#gf1)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  <line x1="23" y1="14" x2="41" y2="14" stroke="#818cf8" stroke-width="3" stroke-linecap="round" />
  <path d="M20 38 Q32 32 44 38" stroke="url(#gf2)" stroke-width="2.5" fill="none" stroke-linecap="round" />
  <circle cx="32" cy="41" r="3" fill="#10b981"/>
  <circle cx="25" cy="43" r="1.8" fill="#38bdf8"/>
  <circle cx="38" cy="42" r="1.5" fill="#a7f3d0"/>
</svg>`,
  },
  {
    id: 'snail-spiral',
    name: 'Archachatina Spiral Bio-Matrix',
    category: 'Biomarker',
    description: 'Fibonacci hemolymph spiral with emerald bio-fluorescence',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="gs1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#090d16" stroke="#1e293b" stroke-width="1.5"/>
  <circle cx="32" cy="32" r="23" fill="none" stroke="#1e293b" stroke-width="1" stroke-dasharray="3 3"/>
  <path d="M32 32 C34 32 36 30 36 28 C36 24 30 22 26 25 C20 29 20 38 27 42 C36 47 46 41 47 31 C48 18 34 11 21 17 C8 24 7 42 18 51" fill="none" stroke="url(#gs1)" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="3" fill="#10b981"/>
  <circle cx="47" cy="31" r="2.5" fill="#06b6d4"/>
</svg>`,
  },
  {
    id: 'standard-curve',
    name: 'Linear Calibration Curve (R²)',
    category: 'Analytics',
    description: 'Precision linear fit curve with standard calibration points',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="gc1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
  <!-- Axis -->
  <line x1="14" y1="50" x2="52" y2="50" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
  <line x1="14" y1="50" x2="14" y2="14" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
  <!-- Grid -->
  <line x1="14" y1="38" x2="50" y2="38" stroke="#1e293b" stroke-width="1" stroke-dasharray="2 2"/>
  <line x1="14" y1="26" x2="50" y2="26" stroke="#1e293b" stroke-width="1" stroke-dasharray="2 2"/>
  <!-- Trendline -->
  <line x1="18" y1="46" x2="48" y2="18" stroke="url(#gc1)" stroke-width="3" stroke-linecap="round"/>
  <!-- Standard Points -->
  <circle cx="18" cy="46" r="3.5" fill="#6366f1" stroke="#ffffff" stroke-width="1"/>
  <circle cx="28" cy="37" r="3.5" fill="#818cf8" stroke="#ffffff" stroke-width="1"/>
  <circle cx="38" cy="27" r="3.5" fill="#c084fc" stroke="#ffffff" stroke-width="1"/>
  <circle cx="48" cy="18" r="3.5" fill="#f43f5e" stroke="#ffffff" stroke-width="1"/>
</svg>`,
  },
  {
    id: 'pipette-droplet',
    name: 'Precision Micropipette Drop',
    category: 'Laboratory',
    description: 'Calibrated laboratory micropipette with ultra-pure sample droplet',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="gp1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
  <!-- Pipette tip -->
  <path d="M26 12 H38 L35 34 L32 40 L29 34 Z" fill="url(#gp1)" opacity="0.3"/>
  <path d="M26 12 H38 L35 34 L32 40 L29 34 Z" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="24" y1="12" x2="40" y2="12" stroke="#93c5fd" stroke-width="3" stroke-linecap="round"/>
  <line x1="30" y1="20" x2="34" y2="20" stroke="#93c5fd" stroke-width="1.5"/>
  <line x1="30" y1="26" x2="34" y2="26" stroke="#93c5fd" stroke-width="1.5"/>
  <!-- Reagent Droplet -->
  <path d="M32 45 C32 45 25 51 25 55 C25 58.8 28.1 62 32 62 C35.9 62 39 58.8 39 55 C39 51 32 45 32 45 Z" fill="url(#gp1)"/>
  <circle cx="30" cy="54" r="1.5" fill="#ffffff" opacity="0.8"/>
</svg>`,
  },
  {
    id: 'spectro-target',
    name: 'Spectrophotometer Optical Beam',
    category: 'Optics',
    description: '405nm optical absorbance sensor beam through assay cuvette',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="go1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#34d399" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#0a0f1d" stroke="#1e293b" stroke-width="1.5"/>
  <!-- Target circles -->
  <circle cx="32" cy="32" r="22" fill="none" stroke="#1e293b" stroke-width="2"/>
  <circle cx="32" cy="32" r="14" fill="none" stroke="#334155" stroke-width="1.5"/>
  <!-- Optical laser beam -->
  <line x1="8" y1="32" x2="56" y2="32" stroke="url(#go1)" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Absorbance sensor core -->
  <circle cx="32" cy="32" r="6" fill="#6366f1" stroke="#ffffff" stroke-width="2"/>
  <circle cx="32" cy="32" r="2" fill="#ffffff"/>
  <!-- Wave markers -->
  <path d="M22 22 L26 26" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
  <path d="M42 22 L38 26" stroke="#34d399" stroke-width="2" stroke-linecap="round"/>
  <path d="M22 42 L26 38" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>
  <path d="M42 42 L38 38" stroke="#34d399" stroke-width="2" stroke-linecap="round"/>
</svg>`,
  },
  {
    id: 'endotoxin-hex',
    name: 'Hexagonal Bio-Assay Shield',
    category: 'Endotoxin',
    description: 'Clean medical-grade endotoxin defense badge with validation node',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="gh1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.5"/>
  <!-- Hexagon -->
  <polygon points="32,10 52,21 52,43 32,54 12,43 12,21" fill="url(#gh1)" opacity="0.15"/>
  <polygon points="32,10 52,21 52,43 32,54 12,43 12,21" fill="none" stroke="url(#gh1)" stroke-width="3" stroke-linejoin="round"/>
  <!-- Inner Check / Flask Node -->
  <path d="M24 32 L30 38 L42 26" fill="none" stroke="#10b981" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="32" cy="10" r="2.5" fill="#818cf8"/>
  <circle cx="52" cy="21" r="2.5" fill="#818cf8"/>
  <circle cx="52" cy="43" r="2.5" fill="#10b981"/>
  <circle cx="32" cy="54" r="2.5" fill="#10b981"/>
  <circle cx="12" cy="43" r="2.5" fill="#10b981"/>
  <circle cx="12" cy="21" r="2.5" fill="#818cf8"/>
</svg>`,
  },
];

export function applyFaviconToDocument(svgOrDataUri: string) {
  let href = svgOrDataUri;
  if (!svgOrDataUri.startsWith('data:') && svgOrDataUri.includes('<svg')) {
    href = `data:image/svg+xml;utf8,${encodeURIComponent(svgOrDataUri)}`;
  }

  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.type = 'image/svg+xml';
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = href;
}
