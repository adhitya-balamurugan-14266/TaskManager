import { useState, useEffect } from 'react';
import { useTaskManager } from '@/hooks/useTaskManager';
import { ServicesPage } from '@/pages/ServicesPage';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage';
import { SetupPage } from '@/pages/SetupPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import type { Service } from '@/types';
import { Sun, Moon } from 'lucide-react';

/** Top-level error toast displayed when any API call fails. Auto-dismissed by the user. */
function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-red-600 text-white px-4 py-3 shadow-lg text-sm max-w-sm">
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 hover:opacity-80">✕</button>
    </div>
  );
}

export default function App() {
  const tm = useTaskManager();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('task_manager_email') || '');
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('task_manager_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync the `dark` class on <html> with state and persist the preference.
  // Tailwind's @variant dark rule keys off this class (configured in index.css).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('task_manager_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  function handleSetupEmail(email: string) {
    localStorage.setItem('task_manager_email', email);
    setUserEmail(email);
  }

  if (!userEmail) {
    return <SetupPage onSave={handleSetupEmail} />;
  }

  // Keep the selected service object in sync with the latest state so that
  // any rename or update is reflected in the service detail header.
  const currentService = selectedService
    ? (tm.state.services.find((s) => s.id === selectedService.id) ?? null)
    : null;

  if (tm.loading && tm.state.services.length === 0) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="size-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {tm.loading && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-50" />
      )}
      {currentService ? (
        <ServiceDetailPage
          service={currentService}
          state={tm.state}
          userEmail={userEmail}
          onBack={() => setSelectedService(null)}
          onCreateTask={(data) => tm.createTask({ ...data, service_id: currentService.id })}
          onCompleteTask={(id, finalThoughts) => tm.completeTask({ task_id: id, final_thoughts: finalThoughts })}
          onDeleteTask={(id) => tm.deleteTask({ task_id: id })}
          onUpdateTask={(id, data) => tm.updateTask({ task_id: id, ...data })}
          onActivateTask={(id, data) => tm.activateTask({ task_id: id, ...data })}
          onMoveToPipeline={(id, reason) => tm.moveToPipeline({ task_id: id, reason })}
          onDropTask={(id, reason) => tm.dropTask({ task_id: id, dropped_reason: reason })}
          onPipelineReview={(id, reason) => tm.pipelineReview({ task_id: id, reason })}
        />
      ) : showWorkspace ? (
        <WorkspacePage
          state={tm.state}
          onBack={() => setShowWorkspace(false)}
          onSelectService={(s) => {
            setShowWorkspace(false);
            setSelectedService(s);
          }}
        />
      ) : (
        <ServicesPage
          state={tm.state}
          onCreateService={(name, logo_url) => tm.createService({ name, logo_url })}
          onDeleteService={(id) => tm.deleteService({ service_id: id })}
          onSelectService={setSelectedService}
          onOpenDashboard={() => setShowWorkspace(true)}
          getLogoUploadUrl={tm.getLogoUploadUrl}
        />
      )}
      {tm.error && <ErrorToast message={tm.error} onDismiss={tm.clearError} />}
      {/* Dark / Light mode toggle */}
      <button
        onClick={() => setIsDark((d) => !d)}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed bottom-5 right-5 z-50 p-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        {isDark
          ? <Sun className="size-4 text-yellow-400" />
          : <Moon className="size-4 text-gray-600" />}
      </button>
    </div>
  );
}
