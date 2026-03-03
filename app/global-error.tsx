"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ background: "#0f0f0f", color: "#e5e7eb", fontFamily: "monospace", padding: "2rem" }}>
        <h2 style={{ color: "#ef4444" }}>Runtime Error</h2>
        <pre style={{ background: "#1a1a1a", padding: "1rem", overflowX: "auto", whiteSpace: "pre-wrap", color: "#fca5a5" }}>
          {error.message}
          {"\n\n"}
          {error.stack}
        </pre>
        {error.digest && (
          <p style={{ color: "#6b7280", fontSize: "0.8rem" }}>Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#22c55e", color: "#000", border: "none", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
