/**
 * Hosted login on Slate (Catalyst Authentication).
 *
 * Slate and the task_api function live on different domains, so the login cookie never
 * reaches the API. Every API call sends a Catalyst token from the Web SDK instead.
 *
 * Sign-out is not done with catalyst.auth.signOut(): after hosted sign-in the SDK runs in
 * its token-cookie mode, where signOut() only clears cookies the page can see and never
 * ends the real session (httpOnly CAUTH / JSESSIONID cookies). The sign-in service's own
 * logout, served on this app's domain under /accounts/p/<ZAID>/logout, does.
 */

const ZAID = import.meta.env.VITE_CATALYST_ZAID ?? '50043131541';
const VISIBLE_COOKIES = ['JWT_AUTH_TOKEN', 'JWT_AUTH', 'iamcsr', 'ZD_CSRF_TOKEN', '_z_identity'];
const SIGNED_OUT_FLAG = 'signedout';

export interface CatalystUser {
  user_id: string;
  email_id: string;
  first_name?: string;
  last_name?: string;
}

interface CatalystSdk {
  auth: {
    isUserAuthenticated: () => Promise<{ content: CatalystUser }>;
    generateAuthToken: () => Promise<{ access_token?: string; content?: { access_token?: string } }>;
  };
}

declare global {
  interface Window {
    catalyst?: CatalystSdk;
  }
}

/** Thrown by API calls on 401 (signed out) or 403 (signed in, but not allowed). */
export class AuthError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

/** Resolves once the Web SDK (loaded in index.html) is ready. */
export function catalystReady(timeoutMs = 15000): Promise<CatalystSdk> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const sdk = window.catalyst;
      if (sdk?.auth?.isUserAuthenticated) return resolve(sdk);
      if (Date.now() - start > timeoutMs) return reject(new Error('Sign-in could not load. Refresh the page.'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

/** Authorization header value for task_api calls. */
export async function authHeader(): Promise<string> {
  const sdk = await catalystReady();
  let res;
  try {
    res = await sdk.auth.generateAuthToken();
  } catch {
    throw new AuthError(401, 'Sign in to continue.');
  }
  const token = res?.access_token ?? res?.content?.access_token;
  if (!token) throw new AuthError(401, 'Sign in to continue.');
  return /^Zoho-/i.test(token) ? token : `Zoho-oauthtoken ${token}`;
}

/** Hosted sign-in page served by Slate; service_url brings the person back here. */
export function signInUrl(): string {
  const back = new URL(window.location.href);
  back.searchParams.delete(SIGNED_OUT_FLAG);
  return `/__catalyst/auth/login?service_url=${encodeURIComponent(back.toString())}`;
}

export function signOutUrl(): string {
  const back = `${window.location.origin}/?${SIGNED_OUT_FLAG}=1`;
  return `/accounts/p/${ZAID}/logout?servicename=ZohoCatalyst&serviceurl=${encodeURIComponent(back)}`;
}

export function signOut(): void {
  const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
  for (const name of VISIBLE_COOKIES) {
    document.cookie = `${name}=; path=/; expires=${past}`;
  }
  window.location.assign(signOutUrl());
}

/** True once, right after returning from sign-out; also tidies the address bar. */
export function consumeSignedOutFlag(): boolean {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(SIGNED_OUT_FLAG)) return false;
  url.searchParams.delete(SIGNED_OUT_FLAG);
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}
