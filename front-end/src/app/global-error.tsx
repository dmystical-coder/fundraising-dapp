"use client";

// Last-resort boundary: triggers only when the root layout itself throws,
// so it renders its own <html>/<body> and cannot rely on ChakraProvider.
// Styles are inlined to match the brand (violet primary, light canvas).
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "var(--font-inter), Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#FBFAFF",
          color: "#1E2230",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8A8F9C",
              }}
            >
              Error
            </div>
            <h1 style={{ fontSize: 28, margin: "12px 0 8px", fontWeight: 800 }}>
              Something went wrong
            </h1>
            <p style={{ color: "#5A6072", lineHeight: 1.6, margin: "0 0 24px" }}>
              A critical error occurred. Please try reloading the application.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "#7C3AED",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "10px 22px",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
