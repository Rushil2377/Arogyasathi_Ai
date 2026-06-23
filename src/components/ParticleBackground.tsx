import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  baseRadius: number;
  radius: number;
  opacity: number;
  vx: number;
  vy: number;
  color: string;
  phase: number;
  pulseSpeed: number;
};

const COLORS = ["#1565C0", "#29B6F6", "#4CAF50", "#ffffff"];

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 120;
    const connectionDistance = 120;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles = [];
      const width = canvas.width;
      const height = canvas.height;

      for (let i = 0; i < particleCount; i++) {
        const baseRadius = 1.5 + Math.random() * 2.5; // 1.5px to 4px
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseRadius,
          radius: baseRadius,
          opacity: 0.15 + Math.random() * 0.35, // 0.15 to 0.5
          vx: -0.4 + Math.random() * 0.8, // -0.4 to 0.4
          vy: -0.4 + Math.random() * 0.8, // -0.4 to 0.4
          color,
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.01 + Math.random() * 0.02,
        });
      }
    };

    resizeCanvas();
    initParticles();

    window.addEventListener("resize", () => {
      resizeCanvas();
      initParticles();
    });

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      time += 0.02;

      // Update and draw particles
      particles.forEach((p) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulse size: radius oscillates using Math.sin
        p.radius = p.baseRadius + Math.sin(time + p.phase) * (p.baseRadius * 0.3);
        if (p.radius < 0.5) p.radius = 0.5;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      // Draw connection lines
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.4;
      ctx.strokeStyle = "#1565C0";

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const opacity = 1 - dist / connectionDistance;
            // Combined opacity based on distance and both particle opacities for seamless blending
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(21, 101, 192, ${opacity * 0.3})`;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      id="particleCanvas"
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
