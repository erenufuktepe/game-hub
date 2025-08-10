import { useEffect, useRef, useState } from "react";
import BackLink from "../../components/BackLink";

const W = 520,
  H = 360;
const G = 0.45,
  FLAP = -6.5;
const PIPE_GAP = 100;
const PIPE_SPEED = 2.6;
const PIPE_EVERY = 1400;
const PIPE_W = 50;

export default function Flappy() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const lastTsRef = useRef(0);

  // UI state
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => {
    const v = Number(localStorage.getItem("flappy_best"));
    return Number.isFinite(v) ? v : 0;
  });
  const [dead, setDead] = useState(false);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // refs
  const soundOnRef = useRef(true);
  const deadRef = useRef(false);
  const runningRef = useRef(false);
  const scoreRef = useRef(0);

  // audio
  const audioCtxRef = useRef(null);
  function ensureAudioReady() {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current?.state === "suspended")
      audioCtxRef.current.resume();
  }

  function playFlap() {
    if (!soundOnRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 700;
    g.gain.value = 0.05;
    o.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    o.frequency.exponentialRampToValueAtTime(1000, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    o.stop(now + 0.1);
  }

  function playHit() {
    if (!soundOnRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = 180;
    g.gain.value = 0.1;
    o.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    // quick down‑thud
    o.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    o.stop(now + 0.15);
  }

  function playScore() {
    if (!soundOnRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 1000;
    g.gain.value = 0.035;
    o.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    o.stop(now + 0.09);
  }

  // stateful game data
  const s = useRef(null);

  function initState() {
    s.current = { x: 100, y: H / 2, vy: 0, pipes: [] };
    setScore(0);
    scoreRef.current = 0;
    setDead(false);
    deadRef.current = false;
    runningRef.current = false;
    setRunning(false);
    lastSpawnRef.current = 0;
    lastTsRef.current = 0;

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) draw(ctx);
  }

  function startGame() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    rafRef.current = requestAnimationFrame(loop);
  }

  function stopGame() {
    runningRef.current = false;
    deadRef.current = true;
    setRunning(false);
    setDead(true);
    cancelAnimationFrame(rafRef.current);
    playHit();

    const finalScore = scoreRef.current;
    const prevBest = Number(localStorage.getItem("flappy_best")) || 0;
    const newBest = Math.max(prevBest, finalScore);
    if (newBest !== prevBest) {
      localStorage.setItem("flappy_best", String(newBest));
      setBest(newBest);
    }
  }

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    initState();

    const onKey = (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleInput();
      }
    };
    const onClick = () => handleInput();
    const onTouchStart = (e) => {
      e.preventDefault();
      handleInput();
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onTouchStart, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  function handleInput() {
    ensureAudioReady();
    if (!runningRef.current && !deadRef.current) {
      startGame();
      flap();
      return;
    }
    if (deadRef.current) {
      initState();
      startGame();
      return;
    }
    flap();
  }

  function flap() {
    s.current.vy = FLAP;
    playFlap();
  }

  function loop(ts) {
    if (!runningRef.current) return;
    const ctx = canvasRef.current.getContext("2d");

    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = Math.min(32, ts - lastTsRef.current);
    lastTsRef.current = ts;

    update(dt);
    draw(ctx);

    if (runningRef.current && !deadRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  function update() {
    const g = s.current;

    // physics
    g.vy += G;
    g.y += g.vy;

    // spawn
    const now = performance.now();
    if (!lastSpawnRef.current) lastSpawnRef.current = now;
    if (now - lastSpawnRef.current > PIPE_EVERY) {
      spawnPipe(g);
      lastSpawnRef.current = now;
    }

    // move & cull
    g.pipes.forEach((p) => (p.x -= PIPE_SPEED));
    g.pipes = g.pipes.filter((p) => p.x + PIPE_W > -20);

    // score
    for (const p of g.pipes) {
      if (!p.scored && p.x + PIPE_W < g.x) {
        p.scored = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
        playScore(); // uncomment if you want a chime per pipe
      }
    }

    // collisions
    const bird = { x: g.x, y: g.y, w: 28, h: 20 };
    if (g.y < 0 || g.y + bird.h > H) {
      stopGame();
      return;
    }
    for (const p of g.pipes) {
      const topRect = { x: p.x, y: 0, w: PIPE_W, h: p.top.h };
      const botRect = { x: p.x, y: p.bottom.y, w: PIPE_W, h: p.bottom.h };
      if (rectHit(bird, topRect) || rectHit(bird, botRect)) {
        stopGame();
        return;
      }
    }
  }

  function draw(ctx) {
    const g = s.current;
    ctx.clearRect(0, 0, W, H);

    // bg stripes
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#94a3b8";
    for (let x = 0; x < W; x += 26) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // pipes
    ctx.fillStyle = "#22c55e";
    for (const p of g.pipes) {
      ctx.fillRect(p.x, 0, PIPE_W, p.top.h);
      ctx.fillRect(p.x, p.bottom.y, PIPE_W, p.bottom.h);
    }

    // bird
    ctx.fillStyle = deadRef.current ? "#ef4444" : "#60a5fa";
    ctx.fillRect(g.x, g.y, 28, 20);
  }

  function rectHit(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  function spawnPipe(g) {
    const topH = 40 + Math.random() * (H - PIPE_GAP - 80);
    const bottomY = topH + PIPE_GAP;
    g.pipes.push({
      x: W + 40,
      top: { h: topH },
      bottom: { y: bottomY, h: H - bottomY },
      scored: false,
    });
  }

  return (
    <div className="container" onMouseDown={ensureAudioReady}>
      <BackLink />
      <h2 className="title">Flappy Clone</h2>
      <p className="muted">
        Space / Click to {dead ? "restart" : running ? "flap" : "start"}. Pass
        pipes to score.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <strong>Score: {score}</strong>
        <span className="muted">Best: {best}</span>
        <button className="btn" onClick={() => setSoundOn((s) => !s)}>
          {soundOn ? "🔊 Sound: On" : "🔈 Sound: Off"}
        </button>
        {!running && !dead && (
          <span className="muted">— Press Space/Click to start</span>
        )}
        {dead && <span className="muted">— Game Over</span>}
      </div>

      <div className="center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="responsive-canvas"
        />
      </div>
    </div>
  );
}
