export const theme = {
  colors: {
    background: '#F5F7FA', // Light gray/white - easier on eyes in sunlight
    surface: '#FFFFFF',    // Pure white for cards
    primary: '#0056D2',    // Construction Blue - Trustworthy, professional
    secondary: '#FF6D00',  // Safety Orange - Primary actions (Capture)
    text: {
      primary: '#1A1A1A',  // Nearly black - High contrast
      secondary: '#546E7A', // Slate gray - Subtitles
      inverse: '#FFFFFF',  // White text on colored buttons
      hint: '#90A4AE',     // Light gray for placeholders
    },
    status: {
      success: '#2E7D32', // Green
      warning: '#EF6C00', // Orange
      error: '#C62828',   // Red
      info: '#0288D1',    // Blue
    },
    border: '#E0E0E0',
    cardBorder: '#CFD8DC',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
  },
  borderRadius: {
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const },
    h2: { fontSize: 22, fontWeight: '700' as const },
    h3: { fontSize: 18, fontWeight: '600' as const },
    body: { fontSize: 16, lineHeight: 24 },
    caption: { fontSize: 14, color: '#546E7A' },
  },
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    float: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }
  }
};

export type Theme = typeof theme;

