"use client";
import { SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect, useRef } from "react";

function AttachBackendCookie() {
  const { data: session, status } = useSession();
  const attachedRef = useRef<string | null>(null);
  useEffect(() => {
    if (status !== 'authenticated') return;
    const backendJwt = (session as any)?.backendJwt as string | undefined;
    if (!backendJwt) return;
    if (attachedRef.current === backendJwt) return;
    attachedRef.current = backendJwt;
    void fetch('/api/auth/attach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: backendJwt }),
    }).catch(() => {});
  }, [session, status]);
  return null;
}

export default function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AttachBackendCookie />
      {children}
    </SessionProvider>
  );
}
