import { colors } from '@/styles/theme';

const stagePalette = [
  '#faf8f5', // cardBackground
  '#f5f1ea', // backgroundLight
  '#e3dccf', // tan 2
  '#ddd4c5', // tan 3
  '#d6ccbc', // tan 4
  '#cec3b2', // tan 5
  '#c5b8a4', // taupe 1
  '#b9ac99', // taupe 2
  '#aa9d8a', // taupe 3
  '#9b8f7d', // taupe 4 (darkest)
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function relLum(hex: string): number {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const srgb = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return (
    0.2126 * (srgb[0] as number) +
    0.7152 * (srgb[1] as number) +
    0.0722 * (srgb[2] as number)
  );
}

function pickText(bg: string): string {
  const l = relLum(bg);
  return l > 0.6 ? '#1f2937' : '#111827';
}

export function StageBadge({
  stage,
  order,
}: {
  stage: string | null | undefined;
  order?: number | null;
}) {
  if (!stage) return <>—</>;
  const normalized = stage.replace(/^\s*\d+\.?\s*/, '').trim();
  const paletteIndex =
    order != null && order >= 0
      ? order % stagePalette.length
      : hashString(normalized) % stagePalette.length;
  const bg = stagePalette[paletteIndex];
  const text = pickText(bg);
  const border = relLum(bg) < 0.55 ? 'rgba(255,255,255,0.22)' : colors.border;
  return (
    <span
      style={{
        background: bg,
        color: text,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        display: 'inline-block',
        lineHeight: '16px',
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap',
        maxWidth: 180,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={stage}
    >
      {stage}
    </span>
  );
}
