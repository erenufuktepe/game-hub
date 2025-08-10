import { useEffect, useRef, useState } from 'react';
import BackLink from '../../components/BackLink';

const W = 600, H = 260;
const G = 0.6, JUMP = -10;
const SPEED = 4;
const OBSTACLE_EVERY = 1400; // ms

export default function Jumper() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const state = useRef(null);
  const lastSpawn = useRef(0);

  function reset() {
    state.current = {
      x: 60, y: H - 40, vy: 0, onGround: true,
      obstacles: [],
      t0: performance.now(),
    };
    setScore(0);
    setGameOver(false);
  }

  useEffect(() => {
    reset();
    const onKey = (e) => (e.code === 'Space' || e.key === ' ') && jump();
    const onClick = () => jump();
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

  function jump() {
    if (gameOver) { reset(); return; }
    const s = state.current;
    if (s.onGround) {
      s.vy = JUMP;
      s.onGround = false;
    }
  }

  function loop(t) {
    const ctx = canvasRef.current.getContext('2d');
    const s = state.current;
    const dt = 16; // simplify
    // spawn obstacles
    if (!lastSpawn.current) lastSpawn.current = t;
    if (t - lastSpawn.current > OBSTACLE_EVERY) {
      const height = 20 + Math.random() * 40;
      s.obstacles.push({ x: W + 40, y: H - height, w: 20 + Math.random() * 20, h: height });
      lastSpawn.current = t;
    }

    // physics
    s.vy += G;
    s.y += s.vy;
    if (s.y >= H - 40) { s.y = H - 40; s.vy = 0; s.onGround = true; }

    // move obstacles
    s.obstacles.forEach(o => o.x -= SPEED);
    s.obstacles = s.obstacles.filter(o => o.x + o.w > -10);

    // collide
    const player = { x: s.x, y: s.y, w: 30, h: 30 };
    for (const o of s.obstacles) {
      if (player.x < o.x + o.w && player.x + player.w > o.x &&
          player.y < o.y + o.h && player.y + player.h > o.y) {
        setGameOver(true);
      }
    }
    if (!gameOver) setScore(prev => prev + 1);

    // draw
    ctx.clearRect(0,0,W,H);
    // ground
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, H-6, W, 6);
    // player
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    // obstacles
    ctx.fillStyle = '#f97316';
    s.obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));
    // score
    ctx.fillStyle = '#e5e7eb';
    ctx.font = '16px system-ui';
    ctx.fillText(`Score: ${score}`, 10, 20);
    if (gameOver) {
      ctx.fillText('Game Over — press Space/Click to restart', 120, 140);
    }

    rafRef.current = requestAnimationFrame(loop);
  }

  return (
    <div className="container">
      <BackLink />
      <h2 className="title">Endless Jumper</h2>
      <p className="muted">Space / Click to jump. Avoid obstacles.</p>
      <div className="center">
        <canvas ref={canvasRef} width={W} height={H} />
      </div>
    </div>
  );
}
