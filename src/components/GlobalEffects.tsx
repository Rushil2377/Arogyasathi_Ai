import { useEffect, useRef } from "react";

export default function GlobalEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // ---- Canvas Setup ----
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // ---- Background Particles System ----
    const colors = ['#1565C0', '#29B6F6', '#4CAF50', '#ffffff'];
    let particles: any[] = [];

    const initParticles = () => {
      particles = [];
      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseRadius: 1.5 + Math.random() * 2.5,
          opacity: 0.15 + Math.random() * 0.35,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          color: colors[Math.floor(Math.random() * colors.length)],
          phase: Math.random() * Math.PI * 2
        });
      }
    };
    initParticles();

    // Resize handler
    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animationFrameId: number;
    let time = 0;
    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      if (document.visibilityState === 'hidden') return;

      time += 0.02;

      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentRadius = p.baseRadius + Math.sin(time + p.phase) * (p.baseRadius * 0.3);

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 14400) { 
            const dist = Math.sqrt(distSq);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#1565C0';
            ctx.globalAlpha = 1 - (dist / 120);
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <>
      <canvas 
        id="particleCanvas" 
        ref={canvasRef} 
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} 
      />
    </>
  );
}
