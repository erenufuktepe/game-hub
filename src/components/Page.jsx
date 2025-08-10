import { useNavigate, Link } from "react-router-dom";

export default function Page({ title, children }) {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-100"
          >
            ← Back
          </button>
          <Link to="/" className="ml-auto rounded-xl border px-3 py-1 text-sm hover:bg-gray-100">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-semibold mb-4">{title}</h1>
        <div className="rounded-2xl bg-white shadow p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}