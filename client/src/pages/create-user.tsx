import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CreateUserPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ username, password, name, role })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Usuario creado", description: `Usuario ${username} creado correctamente.` });
        setUsername("");
        setPassword("");
        setName("");
      } else {
        setError(data.message || "Error al crear usuario");
      }
    } catch {
      setError("Error de red");
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Crear usuario del sistema</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          className="border p-2 rounded"
          placeholder="Nombre de usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          placeholder="Nombre completo"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <label className="flex flex-col">
          Rol:
          <select
            className="border p-2 rounded mt-1"
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <input
          className="border p-2 rounded"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button className="bg-blue-600 text-white py-2 rounded" type="submit">Crear usuario</button>
      </form>
    </div>
  );
}
