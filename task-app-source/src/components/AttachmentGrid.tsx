import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { ImageLightbox } from '@/components/ImageLightbox';
import { AttachmentTile } from '@/components/AttachmentTile';
import { isImage } from '@/lib/attachments';

/**
 * Read-only grid of task "Info" attachments. Image tiles open the lightbox
 * (scoped to images only); other files open in a new tab.
 */
export function AttachmentGrid({ urls }: { urls: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const imageUrls = urls.filter(isImage);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {urls.map((url) => (
          <AttachmentTile
            key={url}
            url={url}
            onOpenImage={() => setLightboxIndex(imageUrls.indexOf(url))}
          />
        ))}
      </div>
      <ImageLightbox
        images={imageUrls}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}

/** Modal wrapper used by the task cards' "N files" badge. */
export function AttachmentsModal({ urls, open, onClose }: { urls: string[]; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title={`Info (${urls.length})`}>
      <AttachmentGrid urls={urls} />
    </Modal>
  );
}
