"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminSession, type AdminSession } from "@/lib/adminSession";

/**
 * "Is anyone signed in, and if not, leave."
 *
 * Extracted from `AdminHome`, which had this inline, at the point the second and third page
 * needed it. Not for tidiness: the probe has three details that are each easy to get wrong
 * once and impossible to get wrong in one place.
 *
 * 1. **The redirect is `replace`, not `push`.** A bounced visitor who presses Back should not
 *    land on the page that just bounced them, which is a loop with a spinner in it.
 * 2. **`cancelled` guards the state write.** In React's development double-invoke, and on any
 *    fast navigation away, the probe outlives the component; setting state afterwards is the
 *    "update on an unmounted component" warning, and worse, calling `replace` afterwards
 *    yanks a page the user has already moved past.
 * 3. **A failed probe is treated as "not signed in".** `fetchAdminSession` returns `null` for
 *    both, deliberately — see its docstring. So a network blip sends an admin to the login
 *    screen rather than into a shell whose every action then fails one at a time.
 *
 * The cost of this shape is one `GET /admin/me` per page load, which §2.8 says is the intended
 * usage: one signature check and one `ADMIN#` read. That read is what buys revocation — a
 * disabled admin stops being one on their next request rather than whenever their 12-hour
 * session happens to lapse — so caching it away would be trading the property the design paid
 * for.
 */
export type AdminGuard =
  | { state: "checking"; session: null }
  | { state: "ready"; session: AdminSession };

export function useAdminGuard(): AdminGuard {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminSession().then((result) => {
      if (cancelled) return;
      if (!result) {
        router.replace("/admin/login");
        return;
      }
      setSession(result);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // There is no third "bounced" state on purpose. Between the failed probe and the navigation
  // actually happening, the honest thing to show is what was already on screen — a spinner —
  // rather than an error a user sees for 200ms on their way somewhere else.
  return session ? { state: "ready", session } : { state: "checking", session: null };
}
