import { Link, Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-white">
        <nav className="mx-auto flex max-w-4xl items-center justify-between p-4">
          <Link to="/" className="text-lg font-bold">
            🚗 מעקב טיפולים
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  );
}
