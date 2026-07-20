import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/Modal';

const URL_RE = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

export function extractLinks(text: string): string[] {
  return Array.from(text.matchAll(URL_RE), (m) => m[0]);
}

export function renderWithLinks(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a
        key={m.index}
        href={m[0]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 underline underline-offset-2 break-all hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
      >
        {m[0]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface TaskInfoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
}

export function TaskInfoModal({ open, onClose, title, description }: TaskInfoModalProps) {
  const links = extractLinks(description);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-5">
        {/* Description */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Description
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {renderWithLinks(description)}
          </p>
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
