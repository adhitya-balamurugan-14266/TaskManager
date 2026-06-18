import { useState, useRef } from 'react';
import type { AppState, Service } from '@/types';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Badge } from '@/components/Badge';
import { Plus, Trash2, ArrowRight, AlertTriangle, LayoutDashboard, ImagePlus, Building2 } from 'lucide-react';
const appLogo = '/favicon.svg';

interface ServicesPageProps {
  state: AppState;
  onCreateService: (name: string, logo_url?: string | null) => void;
  onDeleteService: (id: string) => void;
  onSelectService: (service: Service) => void;
  onOpenDashboard: () => void;
  getLogoUploadUrl: (filename: string) => Promise<{ presigned_url: string; object_url: string } | { error: string }>;
}

export function ServicesPage({ state, onCreateService, onDeleteService, onSelectService, onOpenDashboard, getLogoUploadUrl }: ServicesPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  function resetCreateForm() {
    setName('');
    setLogoFile(null);
    setLogoPreview(null);
    setUploadError(null);
    setUploading(false);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setUploadError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5 MB.'); return; }
    setUploadError(null);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setUploading(true);
    setUploadError(null);
    let logoUrl: string | null = null;
    if (logoFile) {
      const urlRes = await getLogoUploadUrl(logoFile.name);
      if ('error' in urlRes) {
        setUploadError(urlRes.error);
        setUploading(false);
        return;
      }
      try {
        const putRes = await fetch(urlRes.presigned_url, {
          method: 'PUT',
          body: logoFile,
          headers: { 'Content-Type': logoFile.type },
        });
        if (!putRes.ok) throw new Error(`Upload failed: ${putRes.status}`);
        logoUrl = urlRes.object_url;
      } catch (e: unknown) {
        setUploadError(e instanceof Error ? e.message : 'Upload failed');
        setUploading(false);
        return;
      }
    }
    onCreateService(name.trim(), logoUrl);
    resetCreateForm();
    setCreateOpen(false);
  }

  function getTaskCount(service_id: string) {
    const active = state.tasks.active.filter((t) => t.service_id === service_id).length;
    const completed = Object.values(state.tasks.completed).flat().filter((t) => t.service_id === service_id).length;
    const priority = state.tasks.active.filter((t) => t.service_id === service_id && t.is_priority).length;
    return { active, completed, priority };
  }

  const overdueByService = state.overdue.reduce<Record<string, number>>((acc, t) => {
    acc[t.service_id] = (acc[t.service_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={appLogo}
            alt="Task Manager"
            className="h-14 w-14 rounded-2xl object-cover object-center bg-white shadow-sm border border-gray-200"
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Task Manager</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your services and tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New Service
          </Button>
          <Button variant="secondary" onClick={onOpenDashboard}>
            <LayoutDashboard className="size-4" /> Dashboard
          </Button>
        </div>
      </div>

      {/* Overdue banner */}
      {state.overdue.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <AlertTriangle className="size-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>{state.overdue.length}</strong> overdue task{state.overdue.length > 1 ? 's' : ''} across your services.
          </p>
        </div>
      )}

      {/* Services list */}
      {state.services.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg font-medium">No services yet</p>
          <p className="text-sm mt-1">Create a service to start managing tasks.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {state.services.map((s) => {
            const counts = getTaskCount(s.id);
            const overdueCount = overdueByService[s.id] ?? 0;
            return (
              <div
                key={s.id}
                onClick={() => onSelectService(s)}
                className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group cursor-pointer"
              >
                {/* Service logo or fallback icon */}
                <div className="shrink-0 h-11 w-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} className="h-full w-full object-cover" />
                    : <Building2 className="size-5 text-gray-400 dark:text-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{s.name}</h2>
                    {counts.priority > 0 && <Badge variant="priority">{counts.priority} priority</Badge>}
                    {overdueCount > 0 && <Badge variant="overdue">{overdueCount} overdue</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {counts.active} active · {counts.completed} completed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setConfirmDelete(s); }}>
                    <Trash2 className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onSelectService(s); }}>
                    Open <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create service modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); resetCreateForm(); }} title="Create Service">
        <div className="flex flex-col gap-4">
          <Input
            label="Service name"
            placeholder="e.g. Engineering, Marketing..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !logoFile) handleCreate(); }}
            autoFocus
          />

          {/* Logo upload */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Logo <span className="text-gray-400 font-normal">(optional)</span></p>
            <div
              className="relative flex items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoPreview
                ? <img src={logoPreview} alt="preview" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                : <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    <ImagePlus className="size-5 text-gray-400" />
                  </div>
              }
              <div className="min-w-0">
                <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{logoFile ? logoFile.name : 'Click to upload image'}</p>
                <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG · max 5 MB</p>
              </div>
              {logoFile && (
                <button
                  className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-1"
                  onClick={(e) => { e.stopPropagation(); setLogoFile(null); setLogoPreview(null); }}
                  type="button"
                >
                  ✕
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          {uploadError && <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || uploading}>
              {uploading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Service">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Delete <strong>{confirmDelete?.name}</strong>? This will also delete all tasks in this service. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="destructive" onClick={() => { if (confirmDelete) { onDeleteService(confirmDelete.id); setConfirmDelete(null); } }}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
