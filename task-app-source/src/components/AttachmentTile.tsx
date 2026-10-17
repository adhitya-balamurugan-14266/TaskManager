import { X } from 'lucide-react';
import { getExtension, getFileKind, getFileName, getKindIcon } from '@/lib/attachments';

interface AttachmentTileProps {
  url: string;
  /** Called when an image tile is clicked (e.g. to open the lightbox). */
  onOpenImage?: () => void;
  /** Shows a remove (X) button on hover when provided. */
  onRemove?: () => void;
}

/**
 * Square tile for a task "Info" attachment. Images render as a thumbnail;
 * every other file type renders an icon + file name and opens in a new tab.
 */
export function AttachmentTile({ url, onOpenImage, onRemove }: AttachmentTileProps) {
  const kind = getFileKind(url);
  const name = getFileName(url);
  const ext = getExtension(url);
  const Icon = getKindIcon(kind);

  const frame =
    'relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800';

  const body =
    kind === 'image' ? (
      <img src={url} alt={name} className="w-full h-full object-cover" />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
        <Icon className="size-7 text-blue-500 dark:text-blue-400" />
        <span className="line-clamp-2 break-all text-[11px] leading-tight text-gray-700 dark:text-gray-300">
          {name}
        </span>
        {ext && (
          <span className="rounded bg-gray-200 dark:bg-gray-700 px-1 text-[9px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {ext}
          </span>
        )}
      </div>
    );

  return (
    <div className={frame} title={name}>
      {kind === 'image' ? (
        onOpenImage ? (
          <button type="button" onClick={onOpenImage} className="block h-full w-full hover:opacity-90 transition-opacity">
            {body}
          </button>
        ) : (
          body
        )
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full w-full hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
        >
          {body}
        </a>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
