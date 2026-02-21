
import { uuid, now, STORAGE_PREFIX } from './schema';

const AUTH_USERS_KEY = `${STORAGE_PREFIX}auth_users`;
const SESSION_KEY = `${STORAGE_PREFIX}session`;

// ── Types matching @supabase/supabase-js shapes ───────────────────────────────
export interface LocalUser {
    id: string;
    email: string;
    created_at: string;
    user_metadata: Record<string, unknown>;
    // internal — never sent to components
    _passwordHash?: string;
}

export interface LocalSession {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: LocalUser;
}

export type AuthChangeEvent =
    | 'SIGNED_IN'
    | 'SIGNED_OUT'
    | 'TOKEN_REFRESHED'
    | 'USER_UPDATED';

type AuthStateCallback = (event: AuthChangeEvent, session: LocalSession | null) => void;

// ── Password hashing (SHA-256 via WebCrypto) ──────────────────────────────────
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'fleetflow-salt-v1');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Persistence helpers ───────────────────────────────────────────────────────
function loadUsers(): LocalUser[] {
    try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveUsers(users: LocalUser[]): void {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function loadSession(): LocalSession | null {
    try {
        return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
        return null;
    }
}

function saveSession(session: LocalSession | null): void {
    if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
        localStorage.removeItem(SESSION_KEY);
    }
}

function stripPrivateFields(user: LocalUser): LocalUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _passwordHash: _, ...safeUser } = user;
    return safeUser;
}

// ── Auth listeners ────────────────────────────────────────────────────────────
const listeners: AuthStateCallback[] = [];

function notifyListeners(event: AuthChangeEvent, session: LocalSession | null): void {
    const safeSession = session
        ? { ...session, user: stripPrivateFields(session.user) }
        : null;
    listeners.forEach((cb) => cb(event, safeSession));
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const localAuth = {
    /** Register a new user */
    async signUp(params: {
        email: string;
        password: string;
        options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
    }): Promise<{ data: { user: LocalUser | null; session: LocalSession | null }; error: Error | null }> {
        const users = loadUsers();
        if (users.find((u) => u.email.toLowerCase() === params.email.toLowerCase())) {
            return { data: { user: null, session: null }, error: new Error('User already registered') };
        }

        const hash = await hashPassword(params.password);
        const user: LocalUser = {
            id: uuid(),
            email: params.email,
            created_at: now(),
            user_metadata: params.options?.data ?? {},
            _passwordHash: hash,
        };
        users.push(user);
        saveUsers(users);

        const session = createSession(user);
        saveSession(session);
        notifyListeners('SIGNED_IN', session);

        return { data: { user: stripPrivateFields(user), session }, error: null };
    },

    /** Sign in with email + password */
    async signInWithPassword(params: {
        email: string;
        password: string;
    }): Promise<{ data: { user: LocalUser | null; session: LocalSession | null }; error: Error | null }> {
        const users = loadUsers();
        const user = users.find((u) => u.email.toLowerCase() === params.email.toLowerCase());
        if (!user) {
            return { data: { user: null, session: null }, error: new Error('Invalid login credentials') };
        }

        const hash = await hashPassword(params.password);
        if (hash !== user._passwordHash) {
            return { data: { user: null, session: null }, error: new Error('Invalid login credentials') };
        }

        const session = createSession(user);
        saveSession(session);
        notifyListeners('SIGNED_IN', session);

        return { data: { user: stripPrivateFields(user), session }, error: null };
    },

    /** Sign out */
    async signOut(): Promise<{ error: null }> {
        saveSession(null);
        notifyListeners('SIGNED_OUT', null);
        return { error: null };
    },

    /** Get current session */
    async getSession(): Promise<{ data: { session: LocalSession | null }; error: null }> {
        const session = loadSession();
        return { data: { session }, error: null };
    },

    /** Subscribe to auth state changes. Returns { data: { subscription } } like Supabase. */
    onAuthStateChange(callback: AuthStateCallback): {
        data: { subscription: { unsubscribe: () => void } };
    } {
        listeners.push(callback);
        const subscription = {
            unsubscribe: () => {
                const idx = listeners.indexOf(callback);
                if (idx !== -1) listeners.splice(idx, 1);
            },
        };

        // Immediately fire current state
        const session = loadSession();
        if (session) {
            setTimeout(() => callback('SIGNED_IN', session), 0);
        } else {
            setTimeout(() => callback('SIGNED_OUT', null), 0);
        }

        return { data: { subscription } };
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function createSession(user: LocalUser): LocalSession {
    return {
        access_token: `local_${uuid()}`,
        refresh_token: `local_refresh_${uuid()}`,
        expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
        user: stripPrivateFields(user),
    };
}
