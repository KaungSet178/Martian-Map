/* eslint-disable @next/next/no-img-element -- Locally captured scientific map images. */
export function SafeMarsImage({ src, alt, className }: { src: string; alt: string; className?: string; regionName?: string; coordinates?: string }) {
  return <img src={src} alt={alt} width={960} height={720} loading="lazy" className={className} />;
}
