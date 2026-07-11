// ============================================================================
// BIRTH HUB 360 - ENTERPRISE DESIGN TOKENS
// ============================================================================

export const colors = {
  light: {
    primary: 'var(--brand-color, #2563eb)',
    primaryHover: 'var(--brand-color-700, #1d4ed8)',
    secondary: '#64748b', // slate-500
    success: '#10b981', // emerald-500
    warning: '#f59e0b', // amber-500
    danger: '#ef4444', // red-500
    info: '#3b82f6', // blue-500
    neutral: '#475569', // slate-600
    surface: '#ffffff',
    surfaceMuted: '#f8fafc', // slate-50
    background: '#f1f5f9', // slate-100
    border: '#e2e8f0', // slate-200
    borderHover: '#cbd5e1', // slate-300
    overlay: 'rgba(15, 23, 42, 0.4)', // slate-900 with opacity
    textPrimary: '#0f172a', // slate-900
    textSecondary: '#475569', // slate-600
    textMuted: '#94a3b8', // slate-400
  },
  dark: {
    primary: 'var(--brand-color, #3b82f6)',
    primaryHover: 'var(--brand-color-500, #60a5fa)',
    secondary: '#94a3b8', // slate-400
    success: '#34d399', // emerald-400
    warning: '#fbbf24', // amber-400
    danger: '#f87171', // red-400
    info: '#60a5fa', // blue-400
    neutral: '#94a3b8', // slate-400
    surface: '#1e293b', // slate-800
    surfaceMuted: '#0f172a', // slate-900
    background: '#0b1329', // deep dark blue-black
    border: '#334155', // slate-700
    borderHover: '#475569', // slate-600
    overlay: 'rgba(0, 0, 0, 0.6)',
    textPrimary: '#f8fafc', // slate-50
    textSecondary: '#cbd5e1', // slate-300
    textMuted: '#64748b', // slate-500
  }
};

export const spacing = {
  none: '0px',
  xs: '4px',    // 0.25rem (4)
  sm: '8px',    // 0.5rem (8)
  md: '12px',   // 0.75rem (12)
  lg: '16px',   // 1rem (16)
  xl: '24px',   // 1.5rem (24)
  xxl: '32px',  // 2rem (32)
  '3xl': '40px', // 2.5rem (40)
  '4xl': '48px', // 3rem (48)
  '5xl': '64px', // 4rem (64)
  '6xl': '96px', // 6rem (96)
};

export const radius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  pill: '9999px',
};

export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
};

export const typography = {
  fontFamily: {
    sans: "'Inter', sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  fontSize: {
    12: '0.75rem',   // 12px
    14: '0.875rem',  // 14px
    16: '1rem',      // 16px
    18: '1.125rem',  // 18px
    20: '1.25rem',   // 20px
    24: '1.5rem',    // 24px
    30: '1.875rem',  // 30px
    36: '2.25rem',   // 36px
    48: '3rem',      // 48px
    64: '4.5rem',    // 64px
  },
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  }
};

export const transitions = {
  duration: {
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slowest: '500ms',
  },
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  }
};

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
};
