import { marsDistance } from "@/lib/map/geodesy";
export function terrainMetrics(coordinates: [number,number][], elevations: number[]) {
  if(coordinates.length !== elevations.length || elevations.some(z=>!Number.isFinite(z))) throw new Error("Missing authentic route elevation samples");
  let horizontal=0, surface=0, ascent=0, descent=0, maximum=0, weighted=0;
  for(let i=1;i<coordinates.length;i++) {
    const [a,b]=[coordinates[i-1],coordinates[i]];
    const d=marsDistance({longitude_east:a[0],latitude:a[1]},{longitude_east:b[0],latitude:b[1]});
    const dz=elevations[i]-elevations[i-1], grade=Math.atan2(Math.abs(dz),d)*180/Math.PI;
    horizontal+=d; surface+=Math.hypot(d,dz); ascent+=Math.max(0,dz);descent+=Math.max(0,-dz);maximum=Math.max(maximum,grade);weighted+=grade*d;
  }
  return {distanceMeters:surface,horizontalDistanceMeters:horizontal,surfaceDistanceMeters:surface,ascentMeters:ascent,descentMeters:descent,maximumSlopeDegrees:maximum,meanSlopeDegrees:horizontal>0?weighted/horizontal:0};
}
