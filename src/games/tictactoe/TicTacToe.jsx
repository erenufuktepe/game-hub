import { useEffect, useMemo, useState } from 'react';
import BackLink from '../../components/BackLink';

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function winnerOf(sq) {
  for (const [a,b,c] of LINES) {
    if (sq[a] && sq[a] === sq[b] && sq[a] === sq[c]) return sq[a];
  }
  return null;
}
const emptyBoard = () => Array(9).fill(null);

function bestMoveMinimax(sq) {
  const human = 'X', cpu = 'O';

  function checkWinner(board) {
    const w = winnerOf(board);
    if (w === cpu) return +1;
    if (w === human) return -1;
    if (board.every(Boolean)) return 0;
    return null; 
  }

  function minimax(board, isCpuTurn) {
    const evalState = checkWinner(board);
    if (evalState !== null) return { score: evalState, move: -1 };

    if (isCpuTurn) {
      let best = { score: -Infinity, move: -1 };
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = cpu;
          const res = minimax(board, false);
          board[i] = null;
          if (res.score > best.score) best = { score: res.score, move: i };
        }
      }
      return best;
    } else {
      let best = { score: +Infinity, move: -1 };
      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = human;
          const res = minimax(board, true);
          board[i] = null;
          if (res.score < best.score) best = { score: res.score, move: i };
        }
      }
      return best;
    }
  }

  return minimax([...sq], true).move;
}

export default function TicTacToe() {
  const [squares, setSquares] = useState(emptyBoard);
  const [xIsNext, setXIsNext] = useState(true);
  const [mode, setMode] = useState('cpu'); // 'cpu' or 'human'
  const [thinking, setThinking] = useState(false);

  const winner = useMemo(() => winnerOf(squares), [squares]);
  const isDraw = !winner && squares.every(Boolean);
  const status = winner ? `Winner: ${winner}` : isDraw ? 'Draw!' : `Turn: ${xIsNext ? 'X' : 'O'}${mode==='cpu' && !xIsNext ? ' (CPU)' : ''}`;

  function reset() {
    setSquares(emptyBoard());
    setXIsNext(true);
    setThinking(false);
  }

function handleClick(i) {
  if (winner || squares[i]) return;

  const next = squares.slice();

  if (mode === 'cpu') {
    if (!xIsNext) return;
    next[i] = 'X';
    setSquares(next);
    setXIsNext(false); // hand off to CPU
  } else {
    next[i] = xIsNext ? 'X' : 'O';
    setSquares(next);
    setXIsNext(!xIsNext);
  }
}

  useEffect(() => {
    if (mode !== 'cpu') return;
    if (winner || isDraw) return;
    if (xIsNext) return; // CPU is 'O' and plays when xIsNext === false

    setThinking(true);
    const id = setTimeout(() => {
      const move = bestMoveMinimax(squares);
      if (move !== -1 && !squares[move] && !winnerOf(squares)) {
        const next = squares.slice();
        next[move] = 'O';
        setSquares(next);
        setXIsNext(true);
      }
      setThinking(false);
    }, 300); 

    return () => clearTimeout(id);
  }, [mode, xIsNext, squares]);

  return (
    <div className="container">
      <BackLink />
      <h2 className="title">Tic‑Tac‑Toe</h2>

      <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        <p className="muted" style={{ margin: 0 }}>{status}{thinking ? ' — thinking…' : ''}</p>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <label className="muted">
            <input
              type="radio"
              name="mode"
              value="cpu"
              checked={mode==='cpu'}
              onChange={() => reset() || setMode('cpu')}
              style={{ marginRight: 6 }}
            />
            vs Computer
          </label>
          <label className="muted">
            <input
              type="radio"
              name="mode"
              value="human"
              checked={mode==='human'}
              onChange={() => reset() || setMode('human')}
              style={{ marginRight: 6 }}
            />
            2 Players
          </label>
        </div>
      </div>

      <div className="page-center">
        <div className="row">
          {squares.map((v, i) => (
            <button key={i} className="square" onClick={() => handleClick(i)} aria-label={`cell ${i}`}>
              {v && <span className={`mark ${v === 'X' ? 'x' : 'o'}`}>{v}</span>}
            </button>
          ))}
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button className="btn" onClick={reset}>Reset</button>
          {mode === 'cpu' && (winner || isDraw) && (
            <button className="btn" onClick={reset}>
              Play again vs CPU
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
