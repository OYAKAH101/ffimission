import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

export const AuthContext = createContext(null);

// status: "loading" while we ask the server who is signed in,
//         then "authenticated" or "unauthenticated".
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;

    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus(currentUser ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('unauthenticated');
      });

    // apiClient announces this when the server says the session has ended (timed out,
    // account switched off, signed out elsewhere). Route guards then send the person to sign in.
    const onExpired = () => {
      setUser(null);
      setStatus('unauthenticated');
    };
    window.addEventListener('auth:expired', onExpired);

    return () => {
      active = false;
      window.removeEventListener('auth:expired', onExpired);
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const signedInUser = await authService.login(credentials);
    setUser(signedInUser);
    setStatus('authenticated');
    return signedInUser;
  }, []);

  const changePassword = useCallback(async (passwords) => {
    const updated = await authService.changePassword(passwords);
    setUser(updated);
    return updated;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, changePassword }),
    [user, status, login, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
