export const dynamic = "force-dynamic";

// Liveness only: expensive dataset checks run when the Docker image is built.
export function GET() {
  return Response.json(
    { status: "ok", service: "marswalk-planner" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
