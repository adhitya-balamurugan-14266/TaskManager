import {
  File,
  FileArchive,
  FileBraces,
  FileImage,
  FileMusic,
  FilePlay,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from 'lucide-react';

/**
 * Helpers for task "Info" attachments. Only the public Stratus URL is stored
 * (in Tasks.image_references), so file name and type are inferred from it.
 * Object keys look like `task-images/<timestamp>-<sanitized filename>`.
 */

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export type FileKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'spreadsheet'
  | 'json'
  | 'text'
  | 'archive'
  | 'doc'
  | 'other';

const EXT_KIND: Record<string, FileKind> = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image', avif: 'image', ico: 'image',
  mp4: 'video', webm: 'video', mov: 'video', mkv: 'video', avi: 'video', m4v: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio',
  pdf: 'pdf',
  csv: 'spreadsheet', tsv: 'spreadsheet', xls: 'spreadsheet', xlsx: 'spreadsheet', ods: 'spreadsheet',
  json: 'json',
  txt: 'text', md: 'text', log: 'text', xml: 'text', yaml: 'text', yml: 'text', html: 'text',
  zip: 'archive', tar: 'archive', gz: 'archive', tgz: 'archive', rar: 'archive', '7z': 'archive',
  doc: 'doc', docx: 'doc', ppt: 'doc', pptx: 'doc', odt: 'doc', rtf: 'doc',
};

const EXT_MIME: Record<string, string> = {
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  md: 'text/markdown',
  txt: 'text/plain',
  log: 'text/plain',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  xml: 'application/xml',
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
};

const KIND_ICON: Record<FileKind, LucideIcon> = {
  image: FileImage,
  video: FilePlay,
  audio: FileMusic,
  pdf: FileText,
  spreadsheet: FileSpreadsheet,
  json: FileBraces,
  text: FileText,
  archive: FileArchive,
  doc: FileText,
  other: File,
};

function lastSegment(url: string): string {
  const path = url.split(/[?#]/)[0];
  return path.slice(path.lastIndexOf('/') + 1);
}

export function getExtension(nameOrUrl: string): string {
  const seg = lastSegment(nameOrUrl);
  const dot = seg.lastIndexOf('.');
  return dot > 0 ? seg.slice(dot + 1).toLowerCase() : '';
}

export function getFileName(url: string): string {
  let seg = lastSegment(url);
  try { seg = decodeURIComponent(seg); } catch { /* keep raw */ }
  return seg.replace(/^\d{10,}-/, '');
}

export function getFileKind(url: string): FileKind {
  return EXT_KIND[getExtension(url)] ?? 'other';
}

export function isImage(url: string): boolean {
  return getFileKind(url) === 'image';
}

export function getKindIcon(kind: FileKind): LucideIcon {
  return KIND_ICON[kind];
}

/** Browsers leave file.type empty for some types (.md, sometimes .csv). */
export function guessContentType(file: globalThis.File): string {
  return file.type || EXT_MIME[getExtension(file.name)] || 'application/octet-stream';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
