interface LogoProps {
  size?: number;
}

export default function Logo({ size = 32 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 外圆 - 时钟轮廓 */}
      <circle cx="32" cy="32" r="28" stroke="url(#grad)" strokeWidth="3" fill="none" />
      {/* 刻度 - 12个短线 */}
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const r1 = i % 3 === 0 ? 21 : 23;
        const r2 = 26;
        return (
          <line
            key={i}
            x1={32 + r1 * Math.cos(angle)}
            y1={32 + r1 * Math.sin(angle)}
            x2={32 + r2 * Math.cos(angle)}
            y2={32 + r2 * Math.sin(angle)}
            stroke="var(--text-secondary)"
            strokeWidth={i % 3 === 0 ? 2 : 1}
            strokeLinecap="round"
            opacity={0.6}
          />
        );
      })}
      {/* 时针 */}
      <line x1="32" y1="32" x2="32" y2="18" stroke="var(--text-primary)" strokeWidth="2.5" strokeLinecap="round" />
      {/* 分针 */}
      <line x1="32" y1="32" x2="44" y2="26" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" />
      {/* 中心圆点 */}
      <circle cx="32" cy="32" r="3" fill="url(#grad)" />
      {/* 闪电/自动化标记 - 右下角 */}
      <g transform="translate(40, 38)">
        <polygon points="4,0 0,8 3.5,8 2,14 8,5 4.5,5 6,0" fill="var(--accent-success)" opacity="0.95" />
      </g>
      <defs>
        <linearGradient id="grad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00d4aa" />
          <stop offset="100%" stopColor="#0099ff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
