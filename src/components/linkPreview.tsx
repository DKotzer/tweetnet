// LinkPreview.tsx
import React, { useEffect, useState } from "react";

interface LinkPreviewProps {
  url: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [metadata, setMetadata] = useState<any>(null);
  let cleanUrl = url.replace(/\.$/, "");
  //if url missing https:// add it
  if (!cleanUrl.match(/https?:\/\//)) {
    cleanUrl = `https://${cleanUrl}`;
  }

  useEffect(() => {
    console.log(`Fetching metadata for URL: ${cleanUrl}`);
    fetch(`/api/link-preview?url=${encodeURIComponent(cleanUrl)}`)
      .then((response) => response.json())
      .then((data) => {
        setMetadata(data);
      })
      .catch((error) => {
        console.error(`Error fetching metadata for URL: ${cleanUrl}`, error);
      });
  }, [cleanUrl]);

  if (!metadata) {
    return null;
  }
  let domain = cleanUrl;

  try {
    domain = new URL(cleanUrl).hostname;
  } catch (error) {
    console.error(`Error parsing URL: ${cleanUrl}`, error);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-700 transition-colors hover:bg-gray-800 w-[70%]">
      {metadata.images && metadata.images.length > 0 && (
        <div className="relative aspect-video bg-gray-800">
          <img
            src={metadata.images[0]}
            alt={metadata.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      {(metadata.title || metadata.description) && (
        <div className="bg-gray-800/50 p-4">
          {metadata.title && (
            <h3 className="mb-2 text-lg font-bold">{metadata.title}</h3>
          )}
          {metadata.description && (
            <p className="text-sm text-gray-300">{metadata.description}</p>
          )}
        </div>
      )}
      <div className="p-4 bg-gray-800/50">
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:underline"
        >
          {domain}
        </a>
      </div>
    </div>
  );
};
export default LinkPreview;
