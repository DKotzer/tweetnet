// LinkPreview.tsx
import React, { useEffect, useState } from "react";

interface LinkPreviewProps {
  url: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    console.log(`Fetching metadata for URL: ${url}`);
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((response) => response.json())
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
    <div className="link-preview flex flex-col overflow-hidden rounded-lg border shadow-lg">
      { metadata.title && <div className="p-4">
        <h3 className="text-lg font-semibold">{metadata.title}</h3>
      </div>}
      <div className="flex flex-col md:flex-row">
        {metadata.images && metadata.images.length > 0 && (
          <div className="h-48 w-full md:h-auto">
            <img
              src={metadata.images[0]}
              alt={metadata.title}
              className="h-full w-full object-cover rounded-lg"
            />
          </div>
        )}
        { metadata.description && <div className="flex flex-col justify-between p-4 md:w-2/3">
          <p className="text-sm text-slate-400">{metadata.description}</p>
        </div>
        }
      </div>
      <div className="p-4">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          {url}
        </a>
      </div>
    </div>
  );
};

export default LinkPreview;
