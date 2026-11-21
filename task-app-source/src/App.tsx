import { useState, useEffect } from 'react';
import { useTaskManager } from '@/hooks/useTaskManager';
import { ServicesPage } from '@/pages/ServicesPage';
import { ServiceDetailPage } from '@/pages/ServiceDetailPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { setAuthFailureHandler, whoAmI } from '@/store/engine';
import { catalystReady, consumeSignedOutFlag, signInUrl, signOut, type CatalystUser } from '@/lib/auth';
import type { Service } from '@/types';
import { Sun, Moon, LogOut, Loader2 } from 'lucide-react';

/** Read once at load: true right after coming back from the hosted logout. */
const justSignedOut = consumeSignedOutFlag();

type AuthState =
  | { status: 'checking' }
  | { status: 'out' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string }
  | { status: 'in'; user: CatalystUser };

/** Top-level error toast displayed when any API call fails. Auto-dismissed by the user. */
function ErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-red-600 text-white px-4 py-3 shadow-lg text-sm max-w-sm">
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 hover:opacity-80">✕</button>
    </div>
  );
}

function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="size-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
    >
      {isDark
        ? <Sun className="size-4 text-yellow-400" />
        : <Moon className="size-4 text-gray-600" />}
    </button>
  );
}

/** Hosted sign-in landing page. */
function SignInPage() {
  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <img
          src="/logo-wordmark.png"
          alt="TaskMAXXING"
          className="mx-auto w-full max-w-[280px] h-auto dark:bg-[#e6f0fc] dark:rounded-2xl dark:p-3"
        />
        {justSignedOut && (
          <p role="status" className="text-sm rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-2">
            You've been logged out.
          </p>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to manage your services and tasks.</p>
        <a
          href={signInUrl()}
          className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}

/** Signed in, but not the owner: a blank screen with one line and a way out. */
function NoAccessPage() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-4 bg-white dark:bg-gray-950 px-4 text-center">
      <p className="text-sm text-gray-700 dark:text-gray-300">You don't have permission to access this app.</p>
      <button
        type="button"
        onClick={signOut}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline underline-offset-2"
      >
        Log out
      </button>
    </div>
  );
}

function LogoutButton({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { setBusy(true); signOut(); }}
      disabled={busy}
      title={email ? `Signed in as ${email}` : 'Log out'}
      className="flex items-center gap-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 transition-all disabled:opacity-60 disabled:cursor-wait"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {busy ? 'Logging out…' : 'Log out'}
    </button>
  );
}

/** The app itself — only mounted once the API has confirmed the owner is signed in. */
function AuthedApp({ user, isDark, onToggleTheme }: { user: CatalystUser; isDark: boolean; onToggleTheme: () => void }) {
  const tm = useTaskManager();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [initialServiceTab, setInitialServiceTab] = useState<string>('active');
  const [showWorkspace, setShowWorkspace] = useState(false);
  const userEmail = user.email_id ?? '';

  // Keep the selected service object in sync with the latest state so that
  // any rename or update is reflected in the service detail header.
  const currentService = selectedService
    ? (tm.state.services.find((s) => s.id === selectedService.id) ?? null)
    : null;

  if (tm.loading && tm.state.services.length === 0) {
    return <FullScreenSpinner label="Loading..." />;
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {tm.loading && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-50" />
      )}
      {currentService ? (
        <ServiceDetailPage
          key={currentService.id}
          service={currentService}
          state={tm.state}
          userEmail={userEmail}
          initialTab={initialServiceTab as any}
          onBack={() => { setSelectedService(null); setInitialServiceTab('active'); }}
          onOpenDashboard={() => { setSelectedService(null); setShowWorkspace(true); }}
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
          onSelectService={(s, tab) => {
            setShowWorkspace(false);
            setSelectedService(s);
            setInitialServiceTab(tab ?? 'active');
          }}
          onUpsertSnapshot={tm.upsertSnapshot}
          onAttachSnapshotScreenshot={tm.attachSnapshotScreenshot}
          getSnapshotScreenshotUploadUrl={tm.getSnapshotScreenshotUploadUrl}
        />
      ) : (
        <ServicesPage
          state={tm.state}
          userEmail={userEmail}
          onCreateService={(name, logo_url) => tm.createService({ name, logo_url })}
          onDeleteService={(id) => tm.deleteService({ service_id: id })}
          onSelectService={setSelectedService}
          onOpenDashboard={() => setShowWorkspace(true)}
          getLogoUploadUrl={tm.getLogoUploadUrl}
        />
      )}
      {tm.error && <ErrorToast message={tm.error} onDismiss={tm.clearError} />}
      {/* Log out + dark / light mode toggle */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
        <LogoutButton email={userEmail} />
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' });
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

  // Any API call that comes back 401/403 later (e.g. session expired) switches screens.
  useEffect(() => {
    setAuthFailureHandler((status) => setAuth(status === 403 ? { status: 'forbidden' } : { status: 'out' }));
    return () => setAuthFailureHandler(null);
  }, []);

  // Signed in with Catalyst? Then ask the API whether this account may use the app.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let sdkLoaded = false;
      try {
        const sdk = await catalystReady();
        sdkLoaded = true;
        await sdk.auth.isUserAuthenticated();
      } catch (err) {
        if (cancelled) return;
        // isUserAuthenticated rejects with a 401 object when signed out; a plain Error means the SDK never loaded.
        setAuth(sdkLoaded || !(err instanceof Error) ? { status: 'out' } : { status: 'error', message: err.message });
        return;
      }
      const res = await whoAmI();
      if (cancelled) return;
      if ('user' in res) setAuth({ status: 'in', user: res.user });
      else if (res.status === 403) setAuth({ status: 'forbidden' });
      else if (res.status === 401) setAuth({ status: 'out' });
      else setAuth({ status: 'error', message: res.error });
    })();
    return () => { cancelled = true; };
  }, []);

  if (auth.status === 'checking') return <FullScreenSpinner label="Checking sign-in..." />;
  if (auth.status === 'forbidden') return <NoAccessPage />;
  if (auth.status === 'error') {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950 px-4 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{auth.message}</p>
        <button type="button" onClick={() => window.location.reload()} className="text-sm text-blue-600 dark:text-blue-400 underline underline-offset-2">
          Try again
        </button>
      </div>
    );
  }
  if (auth.status === 'out') {
    return (
      <>
        <SignInPage />
        <div className="fixed bottom-5 right-5 z-50">
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark((d) => !d)} />
        </div>
      </>
    );
  }
  return <AuthedApp user={auth.user} isDark={isDark} onToggleTheme={() => setIsDark((d) => !d)} />;
}
