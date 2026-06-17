import { useState } from 'react';
import { useTaskManager } from '@/hooks/useTaskManager';
import { ServicesPage } from '@/pages/ServicesPage';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage';
import { SetupPage } from '@/pages/SetupPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import type { Service } from '@/types';

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

  function handleSetupEmail(email: string) {
    localStorage.setItem('task_manager_email', email);
    setUserEmail(email);
  }

  if (!userEmail) {
    return <SetupPage onSave={handleSetupEmail} />;
  }

  // Keep selected service in sync with updated state (e.g. after rename)
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
          onCompleteTask={(id) => tm.completeTask({ task_id: id })}
          onDeleteTask={(id) => tm.deleteTask({ task_id: id })}
          onUpdateTask={(id, data) => tm.updateTask({ task_id: id, ...data })}
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
    </div>
  );
}
