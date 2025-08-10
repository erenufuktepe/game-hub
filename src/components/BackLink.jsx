import { Link } from 'react-router-dom';

export default function BackLink() {
  return (
    <Link className="back" to="/">
      ← Back to Games
    </Link>
  );
}
