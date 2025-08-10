import { useEffect, useRef, useState } from 'react';
import BackLink from '../../components/BackLink';

const CELL = 20;
const GRID = 20; 

// Speed (ms per tick) gets a bit faster as the snake grows
function speedForLength(len) {
  // Base 100ms, +5ms faster every 3 segments, floor at 55ms
  const faster = Math.floor((len - 3) / 3) * 5;
  return Math.max(55, 100 - faster);
}

export default function Snake() {
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const [running, setRunning] = useState(false);
  const dirRef = useRef({ x: 1, y: 0 });
  const lastDirRef = useRef({ x: 1, y: 0 });
  const stateRef = useRef(null);

  const [soundOn, setSoundOn] = useState(true);
  const audioCtxRef = useRef(null);

  function ensureAudioReady() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }

  function playEat() {
    if (!soundOn) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 880; // nice little "coin" blip
    g.gain.value = 0.06;
    o.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    // quick decay
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    o.stop(now + 0.09);
  }


  function newFood(snake) {
    while (true) {
      const f = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
      if (!snake.some(s => s.x === f.x && s.y === f.y)) return f;
    }
  }

  function reset() {
    const snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
    stateRef.current = { snake, food: newFood(snake), score: 0, dead: false };
    dirRef.current = { x: 1, y: 0 };
    lastDirRef.current = { x: 1, y: 0 };
  }

  function startLoop(intervalMs) {
    clearInterval(loopRef.current);
    loopRef.current = setInterval(() => tick(), intervalMs);
  }

  useEffect(() => {
    reset();
    setRunning(true);
    startLoop(speedForLength(stateRef.current.snake.length));

    const onKey = (e) => {
      ensureAudioReady();
      const k = e.key.toLowerCase();
      let next = lastDirRef.current;
      if (k === 'arrowup' || k === 'w') next = { x: 0, y: -1 };
      if (k === 'arrowdown' || k === 's') next = { x: 0, y: 1 };
      if (k === 'arrowleft' || k === 'a') next = { x: -1, y: 0 };
      if (k === 'arrowright' || k === 'd') next = { x: 1, y: 0 };

      // prevent reversing instantly
      const { x: lx, y: ly } = lastDirRef.current;
      if (lx + next.x !== 0 || ly + next.y !== 0) {
        dirRef.current = next;
      }
    };
    const onClick = () => ensureAudioReady();

    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClick);
      clearInterval(loopRef.current);
    };
  }, []);

  function tick() {
    const ctx = canvasRef.current.getContext('2d');
    const { snake } = stateRef.current;
    const dir = dirRef.current;

    // move → WRAP‑AROUND
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    head.x = (head.x + GRID) % GRID;
    head.y = (head.y + GRID) % GRID;
    lastDirRef.current = dir;

    // self collision kills
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      stateRef.current.dead = true;
      setRunning(false);
    }

    if (!stateRef.current.dead) {
      snake.unshift(head);

      // food
      if (head.x === stateRef.current.food.x && head.y === stateRef.current.food.y) {
        stateRef.current.food = newFood(snake);
        stateRef.current.score++;
        // speed up with growth
        startLoop(speedForLength(snake.length));
        // play eat sound
        playEat();
      } else {
        snake.pop();
      }
    }

    // draw
    ctx.clearRect(0, 0, GRID * CELL, GRID * CELL);

    // subtle grid
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#334155';
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // FOOD: circle
    const f = stateRef.current.food;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // SNAKE
    ctx.fillStyle = '#60a5fa';
    stateRef.current.snake.forEach((s, i) => {
      const pad = i === 0 ? 2 : 4;
      ctx.fillRect(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    });
  }

  function handleRestart() {
    reset();
    setRunning(true);
    startLoop(speedForLength(stateRef.current.snake.length));
  }

  const score = stateRef.current?.score ?? 0;
  const dead = stateRef.current?.dead ?? false;

  return (
    <div className="container">
      <BackLink />
      <h2 className="title">Snake</h2>
      <p className="muted">Wrap‑around walls. Arrow keys / WASD. Score: {score}</p>

      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom: 8 }}>
        <button className="btn" onClick={() => setSoundOn(s => !s)}>
          {soundOn ? '🔊 Sound: On' : '🔈 Sound: Off'}
        </button>
        {!running && dead && <button className="btn" onClick={handleRestart}>Restart</button>}
      </div>

      <div className="center" onMouseDown={ensureAudioReady}>
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} />
      </div>
    </div>
  );
}
