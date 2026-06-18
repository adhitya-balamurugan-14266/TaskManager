/**
 * lib/utils.ts — shared helper utilities
 *
 * Formatting helpers for dates/times and a boolean helper for overdue detection.
 * `cn` is a Tailwind-aware className merger (clsx + tailwind-merge).
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges class names, resolving Tailwind conflicts via tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats an ISO timestamp as a short locale date, e.g. "Jun 18, 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Formats an ISO timestamp as a locale date+time, e.g. "Jun 18, 2026, 11:30 AM". */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Extracts the local "HH:MM" time component from an ISO timestamp. */
export function extractTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Extracts the local "YYYY-MM-DD" date component from an ISO timestamp. */
export function extractDate(iso: string): string {
  const d = new Date(iso);
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns true if the given ISO due date is in the past. */
export function isOverdue(due_date: string): boolean {
  return new Date(due_date) < new Date();
}
