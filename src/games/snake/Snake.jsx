import { useEffect, useRef, useState } from 'react';
import BackLink from '../../components/BackLink';

const CELL = 20;
const GRID = 20; // 20x20 => 400px canvas
const SPEED_MS = 100;

export default function Snake() {
  const canvasRef = useRef(null);
  const loopRef = useRef(null);
  const [running, setRunning] = useState(false);
  const dirRef = useRef({ x: 1, y: 0 });
  const lastDirRef = useRef({ x: 1, y: 0 });
  const stateRef = useRef(null);

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

  useEffect(() => {
    reset();
    setRunning(true);

    const onKey = (e) => {
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
    window.addEventListener('keydown', onKey);

    loopRef.current = setInterval(() => tick(), SPEED_MS);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(loopRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tick() {
    const ctx = canvasRef.current.getContext('2d');
    const { snake, food } = stateRef.current;
    const dir = dirRef.current;

    // move
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    lastDirRef.current = dir;

    // wall collision
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
      stateRef.current.dead = true;
      setRunning(false);
    }

    // self collision
    if (!stateRef.current.dead && snake.some((s) => s.x === head.x && s.y === head.y)) {
      stateRef.current.dead = true;
      setRunning(false);
    }

    if (!stateRef.current.dead) {
      snake.unshift(head);
      // food
      if (head.x === food.x && head.y === food.y) {
        stateRef.current.food = newFood(snake);
        stateRef.current.score++;
      } else {
        snake.pop();
      }
    }

    // draw
    ctx.clearRect(0, 0, GRID * CELL, GRID * CELL);
    // grid (optional subtle)
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#334155';
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(GRID * CELL, i * CELL); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // food
    ctx.fillStyle = '#f97316';
    ctx.fillRect(food.x * CELL, food.y * CELL, CELL, CELL);

    // snake
    ctx.fillStyle = '#60a5fa';
    snake.forEach((s, i) => {
      const pad = i === 0 ? 2 : 4;
      ctx.fillRect(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    });
  }

  function handleRestart() {
    reset();
    setRunning(true);
    clearInterval(loopRef.current);
    loopRef.current = setInterval(() => tick(), SPEED_MS);
  }

  const score = stateRef.current?.score ?? 0;
  const dead = stateRef.current?.dead ?? false;

  return (
    <div className="container">
      <BackLink />
      <h2 className="title">Snake</h2>
      <p className="muted">Use arrow keys (or WASD). Score: {score}</p>
      <div className="center">
        <canvas ref={canvasRef} width={GRID * CELL} height={GRID * CELL} />
        {!running && dead && <button className="btn" onClick={handleRestart}>Restart</button>}
      </div>
    </div>
  );
}
