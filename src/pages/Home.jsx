import GameCard from '../components/GameCard';

export default function Home() {
  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Mini‑Games Hub</h1>
        <span className="muted">Arrow keys / Space / Click to play</span>
      </div>
      <div className="grid">
        <GameCard to="/snake" title="Snake">Eat the food. Don’t hit walls or yourself.</GameCard>
        <GameCard to="/tic-tac-toe" title="Tic‑Tac‑Toe">Beat a friend locally on one device.</GameCard>
        <GameCard to="/jumper" title="Jumper">Jump over obstacles. Space or click.</GameCard>
        <GameCard to="/flappy" title="Flappy">Navigate through pipes. Click or Space.</GameCard>
      </div>
    </div>
  );
}
