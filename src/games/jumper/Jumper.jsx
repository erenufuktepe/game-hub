import { useEffect, useRef, useState } from "react";
import BackLink from "../../components/BackLink";

const W = 600,
  H = 260;
const G = 0.6,
  JUMP = -10;

const START_SPEED = 4;
const MAX_SPEED = 11;
const SCORE_PER_SPEEDUP = 200;
const SPEEDUP_STEP = 0.8;

const SPAWN_INTERVAL_MIN = 900;
const SPAWN_INTERVAL_MAX = 1600;
const FLYING_Y = H - 110;
const PLAYER = { w: 30, h: 30 };

export default function Jumper() {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const nextSpawnInRef = useRef(rand(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX));
  const lastTsRef = useRef(0);

  // UI state
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() =>
    Number(localStorage.getItem("jumper_best") || 0)
  );
  const [gameOver, setGameOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  // refs to avoid stale closures
  const gameOverRef = useRef(false);
  const runningRef = useRef(false);
  const soundOnRef = useRef(true);

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

  function playJump() {
    if (!soundOnRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = 600;
    g.gain.value = 0.06;
    o.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    // quick up‑chirp
    o.frequency.exponentialRampToValueAtTime(900, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    o.stop(now + 0.11);
  }

  // mutable game state
  const s = useRef(null);

  function initState() {
    s.current = {
      x: 60,
      y: H - PLAYER.h - 10,
      vy: 0,
      onGround: true,
      speed: START_SPEED,
      obstacles: [],
      dist: 0,
    };
    setScore(0);
    setGameOver(false);
    gameOverRef.current = false;
    lastSpawnRef.current = 0;
    nextSpawnInRef.current = rand(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
    lastTsRef.current = 0;
  }

  function startGame() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    rafRef.current = requestAnimationFrame(loop);
  }

  function stopGame() {
    runningRef.current = false;
    gameOverRef.current = true;
    setRunning(false);
    setGameOver(true);
    cancelAnimationFrame(rafRef.current);
  }

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    initState(); // start paused

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
    if (!runningRef.current && !gameOverRef.current) {
      startGame();
      jump();
      return;
    }
    if (gameOverRef.current) {
      // restart
      const current = Math.floor(s.current?.dist || 0);
      const newBest = Math.max(best, current);
      if (newBest !== best) {
        setBest(newBest);
        localStorage.setItem("jumper_best", String(newBest));
      }
      initState();
      startGame();
      return;
    }
    jump();
  }

  function jump() {
    const g = s.current;
    if (g.onGround) {
      g.vy = JUMP;
      g.onGround = false;
      playJump();
    }
  }

  function loop(ts) {
    if (!runningRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!lastTsRef.current) lastTsRef.current = ts;
    const dt = Math.min(32, ts - lastTsRef.current);
    lastTsRef.current = ts;

    update(dt);
    draw(ctx);

    if (runningRef.current && !gameOverRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  function update(dt) {
    const g = s.current;

    // physics
    g.vy += G;
    g.y += g.vy;
    const groundY = H - 10 - PLAYER.h;
    if (g.y >= groundY) {
      g.y = groundY;
      g.vy = 0;
      g.onGround = true;
    }

    // spawn obstacles
    if (!lastSpawnRef.current) lastSpawnRef.current = performance.now();
    const now = performance.now();
    if (now - lastSpawnRef.current > nextSpawnInRef.current) {
      spawnObstacle(g);
      lastSpawnRef.current = now;
      nextSpawnInRef.current = rand(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
    }

    // move obstacles & cull
    g.obstacles.forEach((o) => (o.x -= g.speed));
    g.obstacles = g.obstacles.filter((o) => o.x + o.w > -20);

    // score (live)
    g.dist += g.speed * (dt / 16);
    const liveScore = Math.floor(g.dist);
    if (liveScore !== score) setScore(liveScore);

    // speed up
    const bumps = Math.floor(liveScore / SCORE_PER_SPEEDUP);
    g.speed = Math.min(MAX_SPEED, START_SPEED + bumps * SPEEDUP_STEP);

    // collisions
    const player = { x: g.x, y: g.y, w: PLAYER.w, h: PLAYER.h };
    for (const o of g.obstacles) {
      if (rectsOverlap(player, o)) {
        const newBest = Math.max(best, liveScore);
        if (newBest !== best) {
          setBest(newBest);
          localStorage.setItem("jumper_best", String(newBest));
        }
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

    // ground
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, H - 10, W, 10);

    // player
    ctx.fillStyle = gameOverRef.current ? "#ef4444" : "#60a5fa";
    ctx.fillRect(g.x, g.y, PLAYER.w, PLAYER.h);

    // obstacles
    for (const o of g.obstacles) {
      if (o.type === "ground") {
        ctx.fillStyle = "#f97316";
        ctx.fillRect(o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillRect(o.x - 6, o.y + o.h / 2 - 2, o.w + 12, 4);
      }
    }
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
    );
  }

  function spawnObstacle(g) {
    const type = Math.random() < 0.65 ? "ground" : "flying";
    if (type === "ground") {
      const height = rand(20, 48),
        width = rand(18, 30);
      g.obstacles.push({
        type,
        x: W + 40,
        y: H - 10 - height,
        w: width,
        h: height,
      });
    } else {
      const width = rand(22, 30),
        height = rand(14, 20);
      const y = FLYING_Y + rand(-8, 8);
      g.obstacles.push({ type, x: W + 40, y, w: width, h: height });
    }
    if (g.speed > 7 && Math.random() < 0.25) {
      const gap = rand(90, 130);
      const last = g.obstacles[g.obstacles.length - 1];
      g.obstacles.push({ ...last, x: last.x + gap });
    }
  }

  return (
    <div className="container" onMouseDown={ensureAudioReady}>
      <BackLink />
      <h2 className="title">Endless Jumper</h2>
      <p className="muted">
        Space / Click to start. Jump over ground blocks; don’t jump into the
        flying drones.
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
        {gameOver && (
          <span className="muted">— Game Over (Space/Click to restart)</span>
        )}
        {!running && !gameOver && (
          <span className="muted">— Press Space/Click to start</span>
        )}
      </div>

      <div className="center">
        <canvas
          className="responsive-canvas"
          ref={canvasRef}
          width={W}
          height={H}
        />
      </div>
    </div>
  );
}
