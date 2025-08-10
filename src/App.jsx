import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Snake from './games/snake/Snake.jsx';
import TicTacToe from './games/tictactoe/TicTacToe.jsx';
import Jumper from './games/jumper/Jumper.jsx';
import Flappy from './games/flappy/Flappy.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/snake" element={<Snake />} />
      <Route path="/tic-tac-toe" element={<TicTacToe />} />
      <Route path="/jumper" element={<Jumper />} />
      <Route path="/flappy" element={<Flappy />} />
    </Routes>
  );
}
