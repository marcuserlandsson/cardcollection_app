interface CardBoardLogoProps {
  size?: number;
  className?: string;
}

export default function CardBoardLogo({ size = 20, className }: CardBoardLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 110 110"
      fill="none"
      width={size}
      height={size}
      className={className}
    >
      <g transform="rotate(12, 62, 55)">
        <rect x="30" y="14" width="52" height="70" rx="7" fill="#1e2230" stroke="#2dd4a8" strokeWidth="2.5" opacity="0.45" />
      </g>
      <g transform="rotate(-6, 42, 55)">
        <rect x="18" y="16" width="52" height="70" rx="7" fill="#1e2230" stroke="#2dd4a8" strokeWidth="2.5" />
        <rect x="24" y="22" width="40" height="58" rx="4" fill="none" stroke="#2dd4a8" strokeWidth="1.2" opacity="0.25" />
        <text x="44" y="58" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle">
          <tspan fill="#ffffff">C</tspan>
          <tspan fill="#2dd4a8">B</tspan>
        </text>
      </g>
    </svg>
  );
}
