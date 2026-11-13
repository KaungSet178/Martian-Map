"use client";

import Image from "next/image";
import { useState } from "react";
import type { Photograph } from "@/lib/contracts/science";
import { EvidenceBadge } from "@/components/ui/primitives";

export function PhotographEvidence({ photo }: { photo: Photograph }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="target-photograph">
      {failed ? (
        <p role="status">Photograph unavailable. Its source and evidence details remain below.</p>
      ) : (
        <a href={photo.source_url} target="_blank" rel="noreferrer" aria-label={`View source for ${photo.product_id}`}>
          <Image
            src={photo.image_url}
            width={photo.width}
            height={photo.height}
            alt={photo.alt}
            unoptimized
            onError={() => setFailed(true)}
          />
        </a>
      )}
      <figcaption>
        <EvidenceBadge value="Observed" />
        <p>{photo.caption}</p>
        <p className="supporting">{photo.attribution}</p>
        <dl className="metadata">
          <div><dt>Instrument</dt><dd>{photo.instrument}</dd></div>
          <div><dt>Acquired</dt><dd>{photo.acquisition_date ?? "Date unavailable"}{photo.sol !== null && ` · Sol ${photo.sol}`}</dd></div>
          <div><dt>Product</dt><dd className="mono">{photo.product_id}</dd></div>
        </dl>
        <p><strong>Association:</strong> {photo.association}</p>
        <details>
          <summary>Photo provenance and limitations</summary>
          <p>{photo.processing}</p>
          <ul>{photo.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
          <a href={photo.source_url} target="_blank" rel="noreferrer">Source and original imagery</a>
        </details>
      </figcaption>
    </figure>
  );
}
