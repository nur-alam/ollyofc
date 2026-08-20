import { useEffect, useRef } from "react";

const COLORS = ["#fff7ed", "#fbbf24", "#fb7185", "#38bdf8", "#c4b5fd", "#facc15"];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "rocket" | "spark";
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function burst(particles: Particle[], x: number, y: number, color: string) {
  const count = 18 + Math.floor(Math.random() * 8);

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + randomBetween(-0.12, 0.12);
    const speed = randomBetween(1.1, 2.6);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: randomBetween(38, 62),
      size: randomBetween(1.2, 2.2),
      color,
      kind: "spark",
    });
  }
}

export function ScoreFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const particles: Particle[] = [];
    let frame = 0;
    let nextLaunch = 0;
    let animationId = 0;
    let running = true;

    const resize = () => {
      const size = canvas.clientWidth;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = size * ratio;
      canvas.height = size * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const launch = (width: number, height: number) => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      particles.push({
        x: width / 2 + randomBetween(-10, 10),
        y: height - 4,
        vx: randomBetween(-0.35, 0.35),
        vy: randomBetween(-3.8, -5.1),
        life: 1,
        maxLife: 80,
        size: 2.2,
        color,
        kind: "rocket",
      });
    };

    const draw = () => {
      if (!running) {
        return;
      }

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      context.clearRect(0, 0, width, height);

      if (frame >= nextLaunch) {
        launch(width, height);
        nextLaunch = frame + 28 + Math.floor(Math.random() * 36);
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.kind === "rocket" ? 0.055 : 0.035;
        particle.vx *= 0.995;
        particle.life -= 1 / particle.maxLife;

        if (particle.kind === "rocket" && (particle.vy >= -0.25 || particle.y < height * 0.28)) {
          burst(particles, particle.x, particle.y, particle.color);
          particles.splice(index, 1);
          continue;
        }

        if (particle.life <= 0) {
          particles.splice(index, 1);
          continue;
        }

        context.globalAlpha = Math.max(particle.life, 0);
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();

        if (particle.kind === "rocket") {
          context.globalAlpha = particle.life * 0.45;
          context.beginPath();
          context.arc(particle.x, particle.y + 5, particle.size * 0.7, 0, Math.PI * 2);
          context.fill();
        }
      }

      context.globalAlpha = 1;
      frame += 1;
      animationId = window.requestAnimationFrame(draw);
    };

    resize();
    animationId = window.requestAnimationFrame(draw);

    return () => {
      running = false;
      window.cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden
    />
  );
}
