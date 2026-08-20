const POSTER_SIZE = 1080;
const FONT =
  '"Geist Variable", Geist, ui-sans-serif, system-ui, -apple-system, sans-serif';
const FIREWORK_COLORS = [
  "#fff7ed",
  "#fbbf24",
  "#fb7185",
  "#38bdf8",
  "#c4b5fd",
  "#facc15",
];

export type WinningTeamPosterPlayer = {
  displayName: string;
  photoURL?: string;
};

export type WinningTeamPosterInput = {
  title: string;
  dateLabel: string;
  teamName: string;
  scoreA: number;
  scoreB: number;
  winnerId: "a" | "b";
  players: WinningTeamPosterPlayer[];
};

type BurstSpec = {
  x: number;
  y: number;
  color: string;
  radius: number;
};

const BURSTS: BurstSpec[] = [
  { x: 130, y: 110, color: FIREWORK_COLORS[1], radius: 92 },
  { x: 950, y: 150, color: FIREWORK_COLORS[2], radius: 108 },
  { x: 70, y: 360, color: FIREWORK_COLORS[3], radius: 78 },
  { x: 1010, y: 390, color: FIREWORK_COLORS[4], radius: 86 },
  { x: 240, y: 58, color: FIREWORK_COLORS[5], radius: 64 },
  { x: 840, y: 64, color: FIREWORK_COLORS[0], radius: 70 },
  { x: 540, y: 48, color: FIREWORK_COLORS[2], radius: 58 },
  { x: 160, y: 980, color: FIREWORK_COLORS[3], radius: 62 },
  { x: 920, y: 990, color: FIREWORK_COLORS[1], radius: 70 },
];

export function getPosterFileName(teamName: string) {
  const slug = teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `ollyofc-${slug || "team"}-won.png`;
}

export function canSharePosterFile(file: File) {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function drawWinningTeamPoster(
  input: WinningTeamPosterInput,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_SIZE;
  canvas.height = POSTER_SIZE;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not draw the result image.");
  }

  const photos = await Promise.all(
    input.players.map((player) =>
      player.photoURL ? loadSafeImage(player.photoURL) : Promise.resolve(null),
    ),
  );

  drawBackground(ctx);
  BURSTS.forEach((burst) => drawBurst(ctx, burst));
  drawCopy(ctx, input);
  drawScore(ctx, input);
  drawPlayers(ctx, input.players, photos);

  return canvasToBlob(canvas);
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, 0, POSTER_SIZE);
  gradient.addColorStop(0, "#101d56");
  gradient.addColorStop(0.5, "#0c1433");
  gradient.addColorStop(1, "#070b16");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, POSTER_SIZE, POSTER_SIZE);

  const vignette = ctx.createRadialGradient(
    POSTER_SIZE / 2,
    POSTER_SIZE / 2,
    180,
    POSTER_SIZE / 2,
    POSTER_SIZE / 2,
    720,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, POSTER_SIZE, POSTER_SIZE);
}

function drawBurst(ctx: CanvasRenderingContext2D, burst: BurstSpec) {
  const sparks = 22;

  for (let index = 0; index < sparks; index += 1) {
    const angle = (index / sparks) * Math.PI * 2;
    const dist = burst.radius * (0.35 + (index % 5) * 0.13);
    const size = 2 + (index % 3);
    const x = burst.x + Math.cos(angle) * dist;
    const y = burst.y + Math.sin(angle) * dist;

    ctx.fillStyle = burst.color;
    ctx.globalAlpha = 0.42 + (index % 4) * 0.12;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.arc(
      burst.x + Math.cos(angle) * dist * 0.55,
      burst.y + Math.sin(angle) * dist * 0.55,
      size * 0.55,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(burst.x, burst.y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawCopy(ctx: CanvasRenderingContext2D, input: WinningTeamPosterInput) {
  const maxWidth = POSTER_SIZE - 128;

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#fbbf24";
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText("OLLYO FC", POSTER_SIZE / 2, 86);

  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = `500 30px ${FONT}`;
  const titleLines = wrapText(ctx, input.title, maxWidth).slice(0, 2);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, POSTER_SIZE / 2, 140 + index * 38);
  });

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 24px ${FONT}`;
  ctx.fillText(input.dateLabel, POSTER_SIZE / 2, 140 + titleLines.length * 38 + 16);

  const teamTop = 268;
  ctx.fillStyle = "#ffffff";
  const teamSize = fitText(ctx, input.teamName, maxWidth, 72, 36, 800);
  ctx.font = `800 ${teamSize}px ${FONT}`;
  ctx.fillText(input.teamName, POSTER_SIZE / 2, teamTop);

  ctx.fillStyle = "#fbbf24";
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText("WON", POSTER_SIZE / 2, teamTop + teamSize + 18);
}

function drawScore(ctx: CanvasRenderingContext2D, input: WinningTeamPosterInput) {
  const y = 500;
  const radius = 86;
  const gap = 78;
  const leftX = POSTER_SIZE / 2 - radius - gap / 2;
  const rightX = POSTER_SIZE / 2 + radius + gap / 2;

  drawScoreCircle(ctx, leftX, y, radius, input.scoreA, input.winnerId === "a");
  drawScoreCircle(ctx, rightX, y, radius, input.scoreB, input.winnerId === "b");

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `700 42px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("–", POSTER_SIZE / 2, y);
}

function drawScoreCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  value: number,
  winner: boolean,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = winner ? "rgba(251,191,36,0.16)" : "rgba(255,255,255,0.08)";
  ctx.fill();

  ctx.lineWidth = winner ? 8 : 4;
  ctx.strokeStyle = winner ? "#fbbf24" : "rgba(255,255,255,0.28)";
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 64px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), x, y + 2);
}

function drawPlayers(
  ctx: CanvasRenderingContext2D,
  players: WinningTeamPosterPlayer[],
  photos: Array<HTMLImageElement | null>,
) {
  if (!players.length) {
    return;
  }

  const pad = 56;
  const areaWidth = POSTER_SIZE - pad * 2;
  const columns = Math.min(players.length, players.length <= 5 ? players.length : 6);
  const rows = Math.ceil(players.length / columns);
  const gapX = 14;
  const nameH = 28;
  const maxAvatar = 88;
  const avatar = Math.min(
    maxAvatar,
    Math.floor((areaWidth - gapX * (columns - 1)) / columns),
  );
  const rowH = avatar + nameH + 10;
  const gridWidth = columns * avatar + (columns - 1) * gapX;
  const startX = (POSTER_SIZE - gridWidth) / 2 + avatar / 2;
  const startY = Math.max(640, POSTER_SIZE - 48 - rows * rowH + avatar / 2);

  players.forEach((player, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + col * (avatar + gapX);
    const y = startY + row * rowH;
    const photo = photos[index];

    if (photo) {
      drawCircleImage(ctx, photo, x, y, avatar / 2 - 2);
    } else {
      drawInitialCircle(ctx, x, y, avatar / 2 - 2, player.displayName);
    }

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = `600 16px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(truncateText(ctx, player.displayName, avatar + 8), x, y + avatar / 2 + 8);
  });
}

function drawCircleImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  radius: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const size = radius * 2;
  const scale = Math.max(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawInitialCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  name: string,
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#1e2a55";
  ctx.fill();
  ctx.strokeStyle = "rgba(251,191,36,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#fff7ed";
  ctx.font = `700 ${Math.round(radius * 0.9)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(getInitials(name), x, y + 1);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight: number,
) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${FONT}`;

  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${FONT}`;
  }

  return size;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [text];
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let truncated = text;

  while (truncated.length && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }

  return `${truncated}…`;
}

async function loadSafeImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image"));
      img.src = url;
    });

    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const probeCtx = probe.getContext("2d");

    if (!probeCtx) {
      return null;
    }

    probeCtx.drawImage(image, 0, 0, 1, 1);
    probe.toDataURL("image/png");
    return image;
  } catch {
    return null;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Could not create the result image."));
    }, "image/png");
  });
}
