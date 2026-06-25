import { useState, useRef } from 'react';
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { getTaskImageUploadUrl } from '@/store/engine';

interface ImageReferencesProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

/**
 * ImageReferences — upload/manage reference images for a task.
 *
 * Uploads directly to Catalyst Stratus via a presigned PUT URL obtained from
 * the task_api backend. Only the resulting object URLs are stored in the DB.
 * Removal is tracked locally and applied when the parent form is saved.
 */
export function ImageReferences({ images, onImagesChange }: ImageReferencesProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);

    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const result = await getTaskImageUploadUrl(file.name);
      if ('error' in result) {
        setUploadError(result.error);
        break;
      }
      try {
        const putRes = await fetch(result.presigned_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });
        if (!putRes.ok) {
          setUploadError(`Upload failed (HTTP ${putRes.status})`);
          break;
        }
        newUrls.push(result.object_url);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
        break;
      }
    }

    if (newUrls.length > 0) {
      onImagesChange([...images, ...newUrls]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeImage(url: string) {
    onImagesChange(images.filter((u) => u !== url));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <ImageIcon className="size-3.5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Image References <span className="font-normal text-gray-400">(optional)</span>
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url) => (
            <div
              key={url}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            >
              <img src={url} alt="Reference" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                title="Remove image"
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-500 dark:text-red-400">{uploadError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="size-4" /> Upload images
          </>
        )}
      </button>
    </div>
  );
}
