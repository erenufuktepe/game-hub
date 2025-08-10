import { Link } from 'react-router-dom';

export default function GameCard({ to, title, children }) {
  return (
    <Link to={to} className="card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p className="muted" style={{ marginBottom: 12 }}>{children}</p>
      <span className="btn">Play</span>
    </Link>
  );
}
