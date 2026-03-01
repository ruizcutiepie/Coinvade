export const dynamic = "force-dynamic";

export default function KycPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>KYC Required</h1>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        You must complete verification before you can trade.
      </p>
    </div>
  );
}