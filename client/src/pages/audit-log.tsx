import { useEffect, useState } from "react";

export default function AuditLogPage() {
    const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      setError("");
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        const res = await fetch(`/api/audit-logs?${params.toString()}`, {
          headers
        });
        const data = await res.json();
        if (res.ok) {
          setLogs(data);
          setHasMore(data.length === pageSize);
        } else {
          setError(data.message || "Error al cargar logs");
        }
      } catch (err) {
        setError("Error de red");
      }
      setLoading(false);
    }
    fetchLogs();
  }, [page, pageSize]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Acciones registradas</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="mb-4 flex items-center gap-4">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage(page - 1)}
          disabled={page === 1 || loading}
        >Anterior</button>
        <span>Página {page}</span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage(page + 1)}
          disabled={!hasMore || loading}
        >Siguiente</button>
        <label className="ml-4">
          Tamaño página:
          <select
            className="ml-2 border rounded px-2 py-1"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            disabled={loading}
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
      </div>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Usuario</th>
            <th className="border p-2">Acción</th>
            <th className="border p-2">Detalles</th>
            <th className="border p-2">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log: any) => (
            <tr key={log.id}>
              <td className="border p-2">{log.username}</td>
              <td className="border p-2">{log.action}</td>
              <td className="border p-2">{log.details}</td>
              <td className="border p-2">{log.created_at ? new Date(log.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <div className="mt-4">Cargando...</div>}
    </div>
  );
}
