import { useEffect, useRef, useState } from 'react';
import BackLink from '../../components/BackLink';

const W = 520, H = 360;
const G = 0.45, FLAP = -6.5;
const PIPE_GAP = 100;
const PIPE_SPEED = 2.5;
const PIPE_EVERY = 1400;

export default function Flappy() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastSpawn = useRef(0);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const state = useRef(null);

  function reset() {
    state.current = {
      x: 100, y: H/2, vy: 0,
      pipes: [], passed: new Set(),
    };
    setScore(0);
    setDead(false);
  }

  useEffect(() => {
    reset();
    const onKey = (e) => (e.code === 'Space' || e.key === ' ') && flap();
    const onClick = () => flap();
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flap() {
    if (dead) { reset(); return; }
    state.current.vy = FLAP;
  }

  function loop(t) {
    const ctx = canvasRef.current.getContext('2d');
    const s = state.current;

    // spawn pipes
    if (!lastSpawn.current) lastSpawn.current = t;
    if (t - lastSpawn.current > PIPE_EVERY) {
      const topHeight = 40 + Math.random() * (H - PIPE_GAP - 80);
      const bottomY = topHeight + PIPE_GAP;
      s.pipes.push({ x: W + 40, top: { y: 0, h: topHeight }, bottom: { y: bottomY, h: H - bottomY } });
      lastSpawn.current = t;
    }

    // physics
    s.vy += G;
    s.y += s.vy;

    // move pipes
    s.pipes.forEach(p => p.x -= PIPE_SPEED);
    s.pipes = s.pipes.filter(p => p.x > -60);

    // collisions
    const bird = { x: s.x, y: s.y, w: 28, h: 20 };
    if (s.y < 0 || s.y + bird.h > H) setDead(true);

    for (const [i, p] of s.pipes.entries()) {
      // rectangles
      const topRect = { x: p.x, y: p.top.y, w: 50, h: p.top.h };
      const botRect = { x: p.x, y: p.bottom.y, w: 50, h: p.bottom.h };
      const hit = (r) => bird.x < r.x + r.w && bird.x + bird.w > r.x && bird.y < r.y + r.h && bird.y + bird.h > r.y;
      if (hit(topRect) || hit(botRect)) setDead(true);
      // score
      if (!dead && !s.passed?.has(i) && p.x + 50 < bird.x) {
        s.passed.add(i);
        setScore(v => v + 1);
      }
    }

    // draw
    ctx.clearRect(0,0,W,H);
    // background lines
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#94a3b8';
    for (let x = 0; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // pipes
    ctx.fillStyle = '#22c55e';
    s.pipes.forEach(p => {
      ctx.fillRect(p.x, p.top.y, 50, p.top.h);
      ctx.fillRect(p.x, p.bottom.y, 50, p.bottom.h);
    });
    // bird
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(bird.x, bird.y, bird.w, bird.h);
    // score
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '16px system-ui';
    ctx.fillText(`Score: ${score}`, 10, 20);
    if (dead) ctx.fillText('Game Over — Space/Click to restart', 140, 190);

    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <div className="container">
      <BackLink />
      <h2 className="title">Flappy Clone</h2>
      <p className="muted">Space / Click to flap through the pipes.</p>
      <div className="center">
        <canvas ref={canvasRef} width={W} height={H} />
      </div>
    </div>
  );
}
