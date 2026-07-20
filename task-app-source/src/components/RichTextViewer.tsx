import { useRef, useEffect } from 'react';
import { normalizeToHtml } from '@/lib/utils';

interface Props {
  content: string;
  onContentChange?: (html: string) => void;
}

export function RichTextViewer({ content, onContentChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html = normalizeToHtml(content);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onContentChange) return;

    function handleChange(e: Event) {
      const target = e.target as HTMLInputElement;
      if (target.type !== 'checkbox' || !containerRef.current) return;

      const allCheckboxes = Array.from(
        containerRef.current.querySelectorAll('input[type="checkbox"]')
      );
      const index = allCheckboxes.indexOf(target);
      if (index === -1) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const taskItems = Array.from(doc.querySelectorAll('li[data-type="taskItem"]'));

      if (taskItems[index]) {
        const nowChecked = target.checked;
        taskItems[index].setAttribute('data-checked', String(nowChecked));
        const cb = taskItems[index].querySelector('input[type="checkbox"]');
        if (cb) {
          if (nowChecked) cb.setAttribute('checked', 'checked');
          else cb.removeAttribute('checked');
        }
      }

      onContentChange?.(doc.body.innerHTML);
    }

    container.addEventListener('change', handleChange);
    return () => container.removeEventListener('change', handleChange);
  }, [html, onContentChange]);

  return (
    <div
      ref={containerRef}
      className="rich-content text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
