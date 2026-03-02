import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, request } from "../api/request";
import { AuthContext } from "./context";

const STORAGE_KEY = "sb_auth_v1";

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredAuth(auth) {
  if (!auth) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [hydrated, setHydrated] = useState(false);

  const refreshInFlight = useRef(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    writeStoredAuth(null);
  }, []);

  const setAndPersistAuth = useCallback((next) => {
    setAuth(next);
    writeStoredAuth(next);
  }, []);

  const register = useCallback(async ({ fullName, email, password }) => {
    await request("/api/auth/register", {
      method: "POST",
      body: { fullName, email, password },
    });
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      const next = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      };
      setAndPersistAuth(next);
      return next;
    },
    [setAndPersistAuth]
  );

  const refreshAccessToken = useCallback(async () => {
    if (!auth?.refreshToken) {
      throw new ApiError("Session expired", { status: 401 });
    }

    if (!refreshInFlight.current) {
      refreshInFlight.current = request("/api/auth/refresh", {
        method: "POST",
        body: { token: auth.refreshToken },
      })
        .then((data) => {
          const next = { ...auth, accessToken: data.accessToken };
          setAndPersistAuth(next);
          return data.accessToken;
        })
        .catch((e) => {
          logout();
          throw e;
        })
        .finally(() => {
          refreshInFlight.current = null;
        });
    }

    return refreshInFlight.current;
  }, [auth, logout, setAndPersistAuth]);

  const authedRequest = useCallback(
    async (path, options = {}) => {
      if (!auth?.accessToken) throw new ApiError("Unauthorized", { status: 401 });

      try {
        return await request(path, { ...options, token: auth.accessToken });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          const newToken = await refreshAccessToken();
          return await request(path, { ...options, token: newToken });
        }
        throw e;
      }
    },
    [auth, refreshAccessToken]
  );

  const requestTransferOtp = useCallback(
    async ({ idempotencyKey }) => {
      return await authedRequest("/api/otp/request", {
        method: "POST",
        body: { purpose: "TRANSFER", idempotencyKey },
      });
    },
    [authedRequest]
  );

  const verifyOtp = useCallback(async ({ otpId, code }) => {
    return await request("/api/otp/verify", { method: "POST", body: { otpId, code } });
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      user: auth?.user || null,
      role: auth?.user?.role || null,
      accessToken: auth?.accessToken || "",
      refreshToken: auth?.refreshToken || "",
      isAuthenticated: Boolean(auth?.accessToken && auth?.user),
      register,
      login,
      logout,
      authedRequest,
      requestTransferOtp,
      verifyOtp,
    }),
    [auth, hydrated, register, login, logout, authedRequest, requestTransferOtp, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

