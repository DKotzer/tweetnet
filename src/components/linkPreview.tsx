// LinkPreview.tsx
import React, { useEffect, useState } from "react";
import { getLinkPreview } from "link-preview-js";

interface LinkPreviewProps {
  url: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    console.log(`Fetching metadata for URL: ${url}`);
    getLinkPreview(url)
      .then((data) => {
        console.log(`Metadata fetched for URL: ${url}`, data);
        setMetadata(data);
      })
      .catch((error) => {
        console.error(`Error fetching metadata for URL: ${url}`, error);
      });
  }, [url]);

  if (!metadata) {
    return null;
  }

  return (
    <div className="link-preview">
      {metadata.images && metadata.images.length > 0 && (
        <img src={metadata.images[0]} alt={metadata.title} />
      )}
      <div>
        <h3>{metadata.title}</h3>
        <p>{metadata.description}</p>
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      </div>
    </div>
  );
};

export default LinkPreview;
