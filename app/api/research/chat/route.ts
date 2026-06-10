// Legacy route — superseded by /api/research/section
export async function POST() {
  return new Response(
    JSON.stringify({ error: "Deprecated. Use /api/research/section instead." }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );
}
