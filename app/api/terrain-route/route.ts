import { calculateTerrainRoutes } from "@/lib/routing/server";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(request:Request) {
  if(Number(request.headers.get("content-length") || 0)>32768) return Response.json({error:"Routing request exceeds 32 KiB"},{status:413});
  const body=await request.text();
  if(body.length>32768) return Response.json({error:"Routing request exceeds 32 KiB"},{status:413});
  try {return Response.json(await calculateTerrainRoutes(JSON.parse(body),request.signal),{headers:{"Cache-Control":"no-store"}});}
  catch(error) {return Response.json({error:error instanceof Error?error.message:"Terrain routing unavailable"},{status:400});}
}
