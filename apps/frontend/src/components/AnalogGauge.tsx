import React from 'react';

interface AnalogGaugeProps {
  value: number;
  min?: number;
  max?: number;
  title: string;
  subtitle?: string;
  unit: string;
  displayValue?: string | number;
  colorScheme?: 'gold' | 'emerald' | 'cyan' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  statusText?: string;
  statusType?: 'success' | 'warning' | 'info';
  tickCount?: number;
}

export const AnalogGauge: React.FC<AnalogGaugeProps> = ({
  value,
  min = 0,
  max = 100,
  title,
  subtitle,
  unit,
  displayValue,
  colorScheme = 'gold',
  statusText,
  statusType = 'success',
  tickCount = 11,
}) => {
  // Clamp value
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = max > min ? (clampedValue - min) / (max - min) : 0;

  // Gauge angles: from -120deg (min) to +120deg (max), total range = 240deg
  const startAngle = -120;
  const endAngle = 120;
  const totalAngle = endAngle - startAngle;
  const needleAngle = startAngle + percentage * totalAngle;

  // Arc math (R = 75, Center = 100, 100)
  const cx = 100;
  const cy = 100;
  const r = 70;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, radius: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, radius, endA);
    const end = polarToCartesian(x, y, radius, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const bgArc = describeArc(cx, cy, r, startAngle, endAngle);
  const activeEndAngle = startAngle + Math.max(0.1, percentage * totalAngle);
  const activeArc = describeArc(cx, cy, r, startAngle, activeEndAngle);

  // Tick marks
  const effectiveTicks = tickCount > 1 ? tickCount : 11;
  const ticks = Array.from({ length: effectiveTicks }, (_, i) => {
    const tickAngle = startAngle + (i / (effectiveTicks - 1)) * totalAngle;
    const isMajor = i % 2 === 0;
    const outerP = polarToCartesian(cx, cy, r + 4, tickAngle);
    const innerP = polarToCartesian(cx, cy, r - (isMajor ? 8 : 4), tickAngle);
    const textP = polarToCartesian(cx, cy, r - 16, tickAngle);
    const rawTickVal = min + (i / (effectiveTicks - 1)) * (max - min);
    const tickVal = max <= 10 ? (Math.round(rawTickVal * 10) / 10).toString() : Math.round(rawTickVal).toString();
    return { outerP, innerP, textP, isMajor, tickVal };
  });

  // Color gradient definitions
  const getColorGradient = () => {
    switch (colorScheme) {
      case 'emerald':
        return {
          gradientId: 'emerald-gradient',
          stops: [
            { offset: '0%', color: '#059669' },
            { offset: '100%', color: '#34D399' },
          ],
          needleColor: '#34D399',
          glowColor: 'rgba(52, 211, 153, 0.4)',
        };
      case 'cyan':
        return {
          gradientId: 'cyan-gradient',
          stops: [
            { offset: '0%', color: '#0284C7' },
            { offset: '100%', color: '#38BDF8' },
          ],
          needleColor: '#38BDF8',
          glowColor: 'rgba(56, 189, 248, 0.4)',
        };
      case 'amber':
        return {
          gradientId: 'amber-gradient',
          stops: [
            { offset: '0%', color: '#D97706' },
            { offset: '100%', color: '#FBBF24' },
          ],
          needleColor: '#FBBF24',
          glowColor: 'rgba(251, 191, 36, 0.4)',
        };
      case 'gold':
      default:
        return {
          gradientId: 'gold-gradient',
          stops: [
            { offset: '0%', color: '#927028' },
            { offset: '50%', color: '#D9B96E' },
            { offset: '100%', color: '#F0D48D' },
          ],
          needleColor: '#F0D48D',
          glowColor: 'rgba(217, 185, 110, 0.4)',
        };
    }
  };

  const scheme = getColorGradient();

  return (
    <div className="bg-[#0D222C]/90 border border-[#1C3945] hover:border-[#D9B96E]/40 rounded-3xl p-5 shadow-xl flex flex-col items-center justify-between transition-all duration-300 relative group overflow-hidden">
      {/* Background glow on hover */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[radial-gradient(circle,rgba(217,185,110,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Header */}
      <div className="w-full text-center mb-1">
        <h4 className="font-serif font-bold text-[#F2F0E8] text-base group-hover:text-gold-gradient transition">
          {title}
        </h4>
        {subtitle && <p className="text-sm text-[#A8B4B7] font-sans mt-0.5">{subtitle}</p>}
      </div>

      {/* SVG Analog Dial */}
      <div className="relative w-48 h-44 flex items-center justify-center my-1">
        <svg viewBox="0 0 200 180" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={scheme.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {scheme.stops.map((stop, i) => (
                <stop key={i} offset={stop.offset} stopColor={stop.color} />
              ))}
            </linearGradient>

            <filter id={`needle-shadow-${colorScheme}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={scheme.glowColor} />
            </filter>

            <radialGradient id="dial-center-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2A4854" />
              <stop offset="100%" stopColor="#081820" />
            </radialGradient>
          </defs>

          {/* Outer dial background plate */}
          <circle
            cx={cx}
            cy={cy}
            r={r + 14}
            fill="url(#dial-center-gradient)"
            stroke="#1C3945"
            strokeWidth="1.5"
          />

          {/* Background Arc Track */}
          <path
            d={bgArc}
            fill="none"
            stroke="#102833"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Active Colored Arc */}
          <path
            d={activeArc}
            fill="none"
            stroke={`url(#${scheme.gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Tick marks */}
          {ticks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.innerP.x}
                y1={t.innerP.y}
                x2={t.outerP.x}
                y2={t.outerP.y}
                stroke={t.isMajor ? '#A8B4B7' : '#2A4854'}
                strokeWidth={t.isMajor ? 1.5 : 1}
              />
              {t.isMajor && (
                <text
                  x={t.textP.x}
                  y={t.textP.y + 3}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-[#A8B4B7]"
                >
                  {t.tickVal}
                </text>
              )}
            </g>
          ))}

          {/* Center Digital Value Readout in Arch */}
          <text
            x={cx}
            y={cy + 42}
            textAnchor="middle"
            className="font-mono font-bold text-xl fill-[#F2F0E8] tracking-tight"
          >
            {displayValue !== undefined ? displayValue : clampedValue}
          </text>
          <text
            x={cx}
            y={cy + 56}
            textAnchor="middle"
            className="font-mono text-[11px] uppercase tracking-wider fill-[#D9B96E] font-semibold"
          >
            {unit}
          </text>

          {/* Center Pivot Hub (Bottom cap) */}
          <circle cx={cx} cy={cy} r="9" fill="#081820" stroke="#D9B96E" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="4" fill="#D9B96E" />

          {/* Needle / Arrow (Smooth rotation) */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform 1s cubic-bezier(0.34, 1.3, 0.64, 1)',
            }}
            filter={`url(#needle-shadow-${colorScheme})`}
          >
            {/* Needle shape */}
            <polygon
              points={`${cx - 2.5},${cy} ${cx + 2.5},${cy} ${cx},${cy - r + 8}`}
              fill={scheme.needleColor}
            />
            {/* Counterbalance tail */}
            <polygon
              points={`${cx - 2},${cy} ${cx + 2},${cy} ${cx},${cy + 14}`}
              fill="#718187"
            />
          </g>
        </svg>
      </div>

      {/* Footer Status Badge */}
      {statusText && (
        <div className="mt-2 text-center">
          <span
            className={`text-sm font-mono font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${
              statusType === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40'
                : statusType === 'warning'
                ? 'bg-amber-950/80 text-amber-300 border-amber-600/40'
                : 'bg-[#102833] text-[#6EA8C4] border-[#6EA8C4]/40'
            }`}
          >
            {statusText}
          </span>
        </div>
      )}
    </div>
  );
};
