import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { RichTextViewer } from '@/components/RichTextViewer';

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

export function extractLinks(html: string): string[] {
  // Extract href values from anchor tags first, then bare URLs from text
  const hrefs = Array.from(html.matchAll(/href="(https?:\/\/[^"]+)"/g), (m) => m[1]);
  const bare = Array.from(html.matchAll(URL_RE), (m) => m[0]).filter(
    (url) => !hrefs.includes(url)
  );
  return Array.from(new Set([...hrefs, ...bare]));
}

interface TaskInfoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onDescriptionChange?: (html: string) => void;
}

export function TaskInfoModal({ open, onClose, title, description, onDescriptionChange }: TaskInfoModalProps) {
  const links = extractLinks(description);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5">
        {/* Description */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Description
          </h4>
          <RichTextViewer content={description} onContentChange={onDescriptionChange} />
        </div>

        {/* References — only when links exist */}
        {links.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="border-t border-gray-100 dark:border-gray-800" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              References
            </h4>
            <ul className="flex flex-col gap-2">
              {links.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2 rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors w-full group"
                  >
                    <ExternalLink className="size-3.5 shrink-0 mt-0.5 text-blue-500 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors" />
                    <span className="break-all">{url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
