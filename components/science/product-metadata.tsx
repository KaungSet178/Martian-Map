import type { ScientificLayer } from "@/lib/contracts/region";

export function ProductMetadata({ layer }: { layer: ScientificLayer }) {
  const data = layer.data_details;
  if (!data) return null;
  return <details className="product-metadata">
    <summary>{layer.display_name} data coverage and scale</summary>
    <dl className="metadata">
      <div><dt>Original source product</dt><dd>{data.source_product}</dd></div>
      <div><dt>Source coverage</dt><dd>{data.source_coverage}</dd></div>
      <div><dt>Application display crop</dt><dd>{data.display_crop}</dd></div>
      <div><dt>Valid-data coverage</dt><dd>{data.valid_coverage}</dd></div>
      <div><dt>Nominal posting</dt><dd>{data.nominal_posting_m === null ? "Not applicable: interpreted vector polygons" : `${data.nominal_posting_m} m; spacing of elevation samples, not measured effective resolution`}</dd></div>
      <div><dt>North gradient support</dt><dd>{data.gradient_support_north_m === null ? "Not applicable" : `${data.gradient_support_north_m} m; neighborhood used for slope and hillshade, not absolute measurement accuracy`}</dd></div>
      <div><dt>Coordinate reference system</dt><dd>{data.crs}</dd></div>
      <div><dt>Scientific limitations</dt><dd>{layer.limitations}</dd></div>
    </dl>
  </details>;
}
