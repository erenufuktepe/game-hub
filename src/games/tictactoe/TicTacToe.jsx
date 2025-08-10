import { useMemo, useState } from 'react';
import BackLink from '../../components/BackLink';

const lines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function winnerOf(sqrs) {
  for (const [a,b,c] of lines) {
    if (sqrs[a] && sqrs[a] === sqrs[b] && sqrs[a] === sqrs[c]) return sqrs[a];
  }
  return null;
}

export default function TicTacToe() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const winner = useMemo(() => winnerOf(squares), [squares]);
  const isDraw = !winner && squares.every(Boolean);

  function handleClick(i) {
    if (winner || squares[i]) return;
    const next = squares.slice();
    next[i] = xIsNext ? 'X' : 'O';
    setSquares(next);
    setXIsNext(!xIsNext);
  }

  function reset() {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
  }

  return (
    <div className="container">
      <BackLink />
      <h2 className="title">Tic‑Tac‑Toe</h2>
      <p className="muted">
        {winner ? `Winner: ${winner}` : isDraw ? 'Draw!' : `Turn: ${xIsNext ? 'X' : 'O'}`}
      </p>
      <div className="row">
        {squares.map((v, i) => (
          <button key={i} className="square" onClick={() => handleClick(i)}>
            {v}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
