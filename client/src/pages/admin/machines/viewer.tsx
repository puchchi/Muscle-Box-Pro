"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchViewer } from "@/lib/adminMachineApi";
import { fetchAdminSession } from "@/lib/adminSession";
import { signOutOfMachineConsole } from "@/lib/machineConsoleSignIn";
import { queryClient } from "@/lib/queryClient";
import { adminViewer, type MachineViewer, type Permission } from "@shared/admin/viewerSchema";
import { forgetVerifiedSession } from "../useAdminGuard";

// Components rendered outside a shell (tests, mostly) behave as an admin, which is what they were written for.
const ViewerContext = createContext<MachineViewer>(adminViewer("MBP admin", ""));

export const ViewerProvider = ViewerContext.Provider;

export const useViewer = () => useContext(ViewerContext);

export function useCan(): (permission: Permission) => boolean {
  const viewer = useViewer();
  return (permission) => viewer.can.has(permission);
}

export const SIGN_IN_PAGE = "/machines/sign-in";

export type MachineGuard = { state: "checking"; session: null } | { state: "ready"; session: MachineViewer };

let verified: MachineViewer | null = null;

export function forgetVerifiedViewer() {
  verified = null;
}

// Production may not serve /me yet; an admin session still opens the console with everything.
export async function resolveViewer(): Promise<MachineViewer | null> {
  const me = await fetchViewer();
  if (me.ok) return me.data;
  const admin = await fetchAdminSession();
  return admin ? adminViewer(admin.displayName, admin.email) : null;
}

export function useMachineGuard(): MachineGuard {
  const router = useRouter();
  const [session, setSession] = useState<MachineViewer | null>(verified);

  useEffect(() => {
    let cancelled = false;
    resolveViewer().then((viewer) => {
      if (cancelled) return;
      verified = viewer;
      setSession(viewer);
      if (!viewer) router.replace(SIGN_IN_PAGE);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return session ? { state: "ready", session } : { state: "checking", session: null };
}

export function useMachineSignOut() {
  const router = useRouter();
  const viewer = useViewer();
  return async function signOut() {
    await signOutOfMachineConsole(viewer.role);
    forgetVerifiedViewer();
    forgetVerifiedSession();
    queryClient.removeQueries();
    router.replace(SIGN_IN_PAGE);
  };
}
