// ═══════════════════════════════════════════════════════════
// PRICE PAGE TEMPLATES
// Each template defines a complete color scheme + layout variant
// for the prices display page. The shop's template_id (1-5) in
// company_settings selects which template is used.
// ═══════════════════════════════════════════════════════════

export interface PriceTemplate {
  id: number;
  nameAr: string;
  nameHe: string;
  nameEn: string;
  // Core palette
  bg: string;
  bg2: string;
  accent: string;
  accent2: string;
  white: string;
  red: string;       // buy color
  green: string;      // sell color
  dark: string;
  gray: string;
  // Card style
  cardBg: string;
  cardBorder: string;
  cardText: string;
  cardSubText: string;
  cardRadius: number;
  // Layout variant: 'grid' | 'list' | 'compact'
  layout: 'grid' | 'list' | 'compact';
  // Header style
  headerStyle: 'gradient' | 'solid' | 'minimal';
  // Flag ring style
  flagRingColor: string;
  // Divider style
  dividerColor: string;
}

export const TEMPLATES: PriceTemplate[] = [
  // ── 1: Classic Green & Gold (existing look) ──
  {
    id: 1,
    nameAr: 'الأخضر الذهبي',
    nameHe: 'ירוק זהב',
    nameEn: 'Green & Gold',
    bg: '#0B3B24',
    bg2: '#0F4A2E',
    accent: '#C9A84C',
    accent2: '#E8C96A',
    white: '#FFFFFF',
    red: '#D0302F',
    green: '#1A9A52',
    dark: '#1A2730',
    gray: '#8A9BB0',
    cardBg: '#FFFFFF',
    cardBorder: '#E2EBF0',
    cardText: '#1A2730',
    cardSubText: '#8A9BB0',
    cardRadius: 14,
    layout: 'grid',
    headerStyle: 'solid',
    flagRingColor: '#DCE8F0',
    dividerColor: '#C9A84C',
  },
  // ── 2: Royal Blue & Silver ──
  {
    id: 2,
    nameAr: 'الأزرق الملكي',
    nameHe: 'כחול מלכותי',
    nameEn: 'Royal Blue',
    bg: '#0A1A3F',
    bg2: '#122555',
    accent: '#A0B9D9',
    accent2: '#C8D8F0',
    white: '#FFFFFF',
    red: '#FF5252',
    green: '#26C281',
    dark: '#0D1B3E',
    gray: '#7A8AAA',
    cardBg: '#162050',
    cardBorder: '#2A3A70',
    cardText: '#E8EEF8',
    cardSubText: '#8A9BC8',
    cardRadius: 16,
    layout: 'grid',
    headerStyle: 'gradient',
    flagRingColor: '#3A4A80',
    dividerColor: '#A0B9D9',
  },
  // ── 3: Midnight Purple & Neon ──
  {
    id: 3,
    nameAr: 'البنفسجي النيون',
    nameHe: 'סגול נאון',
    nameEn: 'Neon Purple',
    bg: '#150C2E',
    bg2: '#1E1240',
    accent: '#B388FF',
    accent2: '#E0C3FF',
    white: '#FFFFFF',
    red: '#FF577F',
    green: '#00E676',
    dark: '#0D0820',
    gray: '#9A8AB8',
    cardBg: '#1E1240',
    cardBorder: '#3A2A60',
    cardText: '#F0E8FF',
    cardSubText: '#A99BC8',
    cardRadius: 12,
    layout: 'list',
    headerStyle: 'gradient',
    flagRingColor: '#4A3A80',
    dividerColor: '#B388FF',
  },
  // ── 4: Warm Sand & Terracotta ──
  {
    id: 4,
    nameAr: 'الرملي الدافئ',
    nameHe: 'חול חם',
    nameEn: 'Warm Sand',
    bg: '#3D2B1F',
    bg2: '#4D3828',
    accent: '#E8A87C',
    accent2: '#F5C9A0',
    white: '#FFF8F0',
    red: '#D45D3E',
    green: '#6BA368',
    dark: '#2A1A10',
    gray: '#B09880',
    cardBg: '#FFF8F0',
    cardBorder: '#E8D5C0',
    cardText: '#3D2B1F',
    cardSubText: '#8A7058',
    cardRadius: 18,
    layout: 'grid',
    headerStyle: 'solid',
    flagRingColor: '#E8D5C0',
    dividerColor: '#E8A87C',
  },
  // ── 5: Sleek Dark & Cyan ──
  {
    id: 5,
    nameAr: 'الداكن الأزرق',
    nameHe: 'כהה טורקיז',
    nameEn: 'Dark & Cyan',
    bg: '#0C0C0C',
    bg2: '#161616',
    accent: '#00E5FF',
    accent2: '#80F0FF',
    white: '#FFFFFF',
    red: '#FF4757',
    green: '#2ED573',
    dark: '#0A0A0A',
    gray: '#888888',
    cardBg: '#1A1A1A',
    cardBorder: '#333333',
    cardText: '#F0F0F0',
    cardSubText: '#888888',
    cardRadius: 10,
    layout: 'compact',
    headerStyle: 'minimal',
    flagRingColor: '#444444',
    dividerColor: '#00E5FF',
  },
];

export const DEFAULT_TEMPLATE_ID = 1;

export function getTemplate(id: number | undefined | null): PriceTemplate {
  if (!id || id < 1 || id > TEMPLATES.length) return TEMPLATES[0];
  return TEMPLATES[id - 1];
}
