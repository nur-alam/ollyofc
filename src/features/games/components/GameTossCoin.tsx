import { getTossRotationDeg, type GameToss } from "@/types/game";

export function GameTossCoin({ toss, nowMs }: { toss: GameToss; nowMs: number }) {
  const rotation = getTossRotationDeg(toss, nowMs);

  return (
    <div className="flex size-16 items-center justify-center perspective-[600px]" aria-hidden>
      <div
        className="relative size-14 transform-3d"
        style={{ transform: `rotateY(${rotation}deg)` }}
      >
        <div className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-amber-600 bg-linear-to-br from-amber-200 to-amber-500 text-sm font-bold text-amber-950 shadow-md backface-hidden">
          A
        </div>
        <div className="absolute inset-0 flex items-center justify-center rounded-full border-4 border-sky-700 bg-linear-to-br from-sky-200 to-sky-600 text-sm font-bold text-sky-950 shadow-md backface-hidden transform-[rotateY(180deg)]">
          B
        </div>
      </div>
    </div>
  );
}
