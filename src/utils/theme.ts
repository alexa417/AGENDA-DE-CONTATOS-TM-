export type ThemeId = 'lila' | 'morado' | 'royal' | 'emerald' | 'amber' | 'rose' | 'cyber';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  dotColor: string;
  headerBg: string;
  headerAccent: string;
  btnPrimary: string;
  btnPrimaryHover: string;
  pillBg: string;
  pillText: string;
  pillBorder: string;
  bannerBg: string;
  bannerBorder: string;
  bannerAccent: string;
  pageBg: string;
  activeNavText: string;
  searchFocusRing: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  lila: {
    id: 'lila',
    name: 'Morado Lila & Lavanda 💜',
    dotColor: '#c084fc',
    headerBg: 'from-[#2e1065] via-[#4c1d95] to-[#3b0764]',
    headerAccent: 'text-purple-300',
    btnPrimary: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-700 hover:from-purple-700 hover:via-fuchsia-700 hover:to-purple-800 shadow-purple-500/30',
    btnPrimaryHover: 'hover:from-purple-700 hover:to-purple-800',
    pillBg: 'bg-purple-100',
    pillText: 'text-purple-900',
    pillBorder: 'border-purple-300',
    bannerBg: 'from-[#3b0764] via-[#581c87] to-[#2e1065]',
    bannerBorder: 'border-purple-400/30',
    bannerAccent: 'text-purple-200',
    pageBg: 'bg-[#faf7fd]',
    activeNavText: 'text-purple-700',
    searchFocusRing: 'focus:ring-purple-400',
  },
  morado: {
    id: 'morado',
    name: 'Morado Real & Amatista',
    dotColor: '#9333ea',
    headerBg: 'from-slate-950 via-purple-950 to-slate-900',
    headerAccent: 'text-purple-400',
    btnPrimary: 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25',
    btnPrimaryHover: 'hover:bg-purple-700',
    pillBg: 'bg-purple-50',
    pillText: 'text-purple-700',
    pillBorder: 'border-purple-200',
    bannerBg: 'from-purple-950 via-slate-900 to-slate-950',
    bannerBorder: 'border-purple-800/40',
    bannerAccent: 'text-purple-300',
    pageBg: 'bg-slate-100/80',
    activeNavText: 'text-purple-700',
    searchFocusRing: 'focus:ring-purple-500',
  },
  royal: {
    id: 'royal',
    name: 'Azul Zafiro & Índigo',
    dotColor: '#4f46e5',
    headerBg: 'from-slate-950 via-indigo-950 to-slate-900',
    headerAccent: 'text-indigo-400',
    btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/25',
    btnPrimaryHover: 'hover:bg-indigo-700',
    pillBg: 'bg-indigo-50',
    pillText: 'text-indigo-700',
    pillBorder: 'border-indigo-200',
    bannerBg: 'from-indigo-950 via-slate-900 to-slate-950',
    bannerBorder: 'border-indigo-800/40',
    bannerAccent: 'text-indigo-300',
    pageBg: 'bg-slate-100/70',
    activeNavText: 'text-indigo-700',
    searchFocusRing: 'focus:ring-indigo-500',
  },
  emerald: {
    id: 'emerald',
    name: 'Esmeralda Ejecutivo',
    dotColor: '#10b981',
    headerBg: 'from-slate-950 via-emerald-950 to-slate-900',
    headerAccent: 'text-emerald-400',
    btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25',
    btnPrimaryHover: 'hover:bg-emerald-700',
    pillBg: 'bg-emerald-50',
    pillText: 'text-emerald-700',
    pillBorder: 'border-emerald-200',
    bannerBg: 'from-emerald-950 via-slate-900 to-slate-950',
    bannerBorder: 'border-emerald-800/40',
    bannerAccent: 'text-emerald-300',
    pageBg: 'bg-slate-100/70',
    activeNavText: 'text-emerald-700',
    searchFocusRing: 'focus:ring-emerald-500',
  },
  amber: {
    id: 'amber',
    name: 'Ámbar Cálido & Grafito',
    dotColor: '#f59e0b',
    headerBg: 'from-stone-950 via-amber-950 to-stone-900',
    headerAccent: 'text-amber-400',
    btnPrimary: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/25',
    btnPrimaryHover: 'hover:bg-amber-700',
    pillBg: 'bg-amber-50',
    pillText: 'text-amber-800',
    pillBorder: 'border-amber-200',
    bannerBg: 'from-amber-950 via-stone-900 to-stone-950',
    bannerBorder: 'border-amber-800/40',
    bannerAccent: 'text-amber-300',
    pageBg: 'bg-stone-100/70',
    activeNavText: 'text-amber-700',
    searchFocusRing: 'focus:ring-amber-500',
  },
  rose: {
    id: 'rose',
    name: 'Vino Tinto & Rosa Magenta',
    dotColor: '#e11d48',
    headerBg: 'from-zinc-950 via-rose-950 to-zinc-900',
    headerAccent: 'text-rose-400',
    btnPrimary: 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25',
    btnPrimaryHover: 'hover:bg-rose-700',
    pillBg: 'bg-rose-50',
    pillText: 'text-rose-700',
    pillBorder: 'border-rose-200',
    bannerBg: 'from-rose-950 via-zinc-900 to-zinc-950',
    bannerBorder: 'border-rose-800/40',
    bannerAccent: 'text-rose-300',
    pageBg: 'bg-rose-50/30',
    activeNavText: 'text-rose-700',
    searchFocusRing: 'focus:ring-rose-500',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Cyan & Obsidiana',
    dotColor: '#06b6d4',
    headerBg: 'from-slate-950 via-cyan-950 to-slate-900',
    headerAccent: 'text-cyan-400',
    btnPrimary: 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/25',
    btnPrimaryHover: 'hover:bg-cyan-700',
    pillBg: 'bg-cyan-50',
    pillText: 'text-cyan-700',
    pillBorder: 'border-cyan-200',
    bannerBg: 'from-cyan-950 via-slate-900 to-slate-950',
    bannerBorder: 'border-cyan-800/40',
    bannerAccent: 'text-cyan-300',
    pageBg: 'bg-slate-100/70',
    activeNavText: 'text-cyan-700',
    searchFocusRing: 'focus:ring-cyan-500',
  },
};

const THEME_STORAGE_KEY = 'autolead_app_theme_v2';

export function getStoredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId;
    if (saved && THEMES[saved]) {
      return saved;
    }
  } catch (e) {
    console.error(e);
  }
  // Default: Morado tipo lila
  return 'lila';
}

export function saveStoredTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    console.error(e);
  }
}
