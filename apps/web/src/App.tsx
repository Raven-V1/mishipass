/* TEMP UI — placeholder only, Project Owner-approved per Constitution §8/§14. Zhanerke replaces this. */
import { useState } from "react";

interface RegisterResult {
  publicId: string;
  qrUrl: string;
}

export default function App() {
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/cats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, countryCode }),
      });
      if (!res.ok) {
        setError(`Error ${res.status}: ${await res.text()}`);
        return;
      }
      setResult((await res.json()) as RegisterResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "1rem", maxWidth: "400px" }}>
      {/* TEMP UI — placeholder only, Project Owner-approved per Constitution §8/§14. Zhanerke replaces this. */}
      <h1>Register a Cat</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
      >
        <label>
          Cat name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <label>
          Country code (2 uppercase letters, e.g. MX)
          <input
            type="text"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            maxLength={2}
            pattern="[A-Z]{2}"
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Registering…" : "Register"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && (
        <div style={{ marginTop: "1rem" }}>
          <p>Public ID: {result.publicId}</p>
          <p>
            QR URL: <a href={result.qrUrl}>{result.qrUrl}</a>
          </p>
        </div>
      )}
    </div>
  );
}
