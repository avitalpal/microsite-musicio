"use client";

export function StickFigure({
  headDataUrl,
  facing,
  crouching,
}: {
  headDataUrl: string | null;
  facing: 1 | -1;
  crouching: boolean;
}) {
  const headCx = 60;
  const headCy = crouching ? 38 : 36;
  const headR = 26;
  const bodyTop = crouching ? 66 : 62;
  const bodyLength = crouching ? 42 : 58;
  const footY = crouching ? 154 : 166;
  const armAngle = facing === 1 ? 18 : -18;
  const clipId = `head-clip-${facing}-${crouching ? "c" : "s"}`;

  return (
    <svg viewBox="0 0 120 180" className="h-full w-full">
      <defs>
        <clipPath id={clipId}>
          <circle cx={headCx} cy={headCy} r={headR} />
        </clipPath>
      </defs>

      {headDataUrl ? (
        <image
          href={headDataUrl}
          x={headCx - headR}
          y={headCy - headR}
          width={headR * 2}
          height={headR * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <circle cx={headCx} cy={headCy} r={headR} fill="white" stroke="black" strokeWidth="4" />
      )}

      <line x1="60" y1="58" x2="60" y2={bodyTop} stroke="black" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1={bodyTop} x2="60" y2={bodyTop + bodyLength} stroke="black" strokeWidth="4" strokeLinecap="round" />

      <line
        x1="60"
        y1="84"
        x2={60 + 24}
        y2="92"
        stroke="black"
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${armAngle} 60 84)`}
      />
      <line
        x1="60"
        y1="84"
        x2={60 - 24}
        y2="92"
        stroke="black"
        strokeWidth="4"
        strokeLinecap="round"
        transform={`rotate(${-armAngle} 60 84)`}
      />

      <line x1="60" y1="120" x2="46" y2={footY} stroke="black" strokeWidth="4" strokeLinecap="round" />
      <line x1="60" y1="120" x2="74" y2={footY} stroke="black" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
