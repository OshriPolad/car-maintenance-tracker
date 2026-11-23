import { useQuery } from "@tanstack/react-query";
import type { HealthResponse } from "@cmt/shared";
import { apiGet } from "../lib/api";

export default function HomePage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<HealthResponse>("/health"),
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">ברוכים הבאים 👋</h1>
      <p>מערכת לניטור טיפולים לרכב ולאופנוע.</p>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">System status</h2>
        {health.isPending && <p>Checking API…</p>}
        {health.isError && <p className="text-red-600">API: unreachable ❌</p>}
        {health.data && (
          <ul dir="ltr" className="space-y-1 text-left">
            <li>API: {health.data.status} ✅</li>
            <li>Database: {health.data.db === "up" ? "up ✅" : "down ❌"}</li>
          </ul>
        )}
      </div>
    </section>
  );
}
