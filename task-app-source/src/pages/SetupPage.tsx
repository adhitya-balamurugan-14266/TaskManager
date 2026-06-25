import { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
const appLogo = '/favicon.svg';

interface SetupPageProps {
  onSave: (email: string) => void;
}

export function SetupPage({ onSave }: SetupPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  function handleSave() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    onSave(trimmed);
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <img
            src={appLogo}
            alt="Task Manager"
            className="h-20 w-20 mx-auto rounded-2xl object-cover object-center bg-white shadow-sm border border-gray-200"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to Task Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Enter your email address so we can send you task reminder notifications when deadlines approach.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label="Your email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button className="w-full" onClick={handleSave} disabled={!email.trim()}>
            Get Started
          </Button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          This email is stored locally on your device and used only for task reminders.
        </p>
      </div>
    </div>
  );
}
