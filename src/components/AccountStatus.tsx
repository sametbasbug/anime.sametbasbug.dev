import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { syncPersonalList } from "../lib/cloud-sync";
import { subscribeToPersonalList } from "../lib/personal-list";
import { getSupabaseClient } from "../lib/supabase";

// `partial`, sunucunun bazı kayıtları reddettiği ama geri kalanının gönderildiği
// durumdur. `synced` göstermek yanıltıcı, `error` göstermek yanlış olurdu.
type SyncState = "local" | "syncing" | "synced" | "partial" | "error";

export default function AccountStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("local");
  const [rejectedCount, setRejectedCount] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    let active = true;
    let syncing = false;
    let queued = false;

    const runSync = async () => {
      const current = sessionRef.current;
      if (!current || syncing) {
        queued = Boolean(current);
        return;
      }

      syncing = true;
      setSyncState("syncing");
      try {
        const result = await syncPersonalList(client, current.user.id);
        if (active) {
          setRejectedCount(result.rejected.length);
          setSyncState(result.rejected.length > 0 ? "partial" : "synced");
        }
      } catch {
        if (active) {
          setRejectedCount(0);
          setSyncState("error");
        }
      } finally {
        syncing = false;
        if (queued) {
          queued = false;
          void runSync();
        }
      }
    };

    const scheduleSync = () => {
      if (!sessionRef.current) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void runSync(), 650);
    };

    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      sessionRef.current = data.session;
      setSession(data.session);
      setSyncState(data.session ? "syncing" : "local");
      if (data.session) void runSync();
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
      setSyncState(nextSession ? "syncing" : "local");
      if (nextSession) window.setTimeout(() => void runSync(), 0);
    });
    const unsubscribeList = subscribeToPersonalList(scheduleSync);

    return () => {
      active = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      authListener.subscription.unsubscribe();
      unsubscribeList();
    };
  }, []);

  const statusLabel: string = {
    local: "Yerel liste",
    syncing: "Senkronize ediliyor",
    synced: "Bulutla eşitlendi",
    partial: `${rejectedCount} kayıt eşitlenemedi, bu cihazda duruyor`,
    error: "Senkronizasyon bekliyor",
  }[syncState];

  return (
    <a className="account-status" href="/hesap" title={statusLabel}>
      <span className={`account-status__dot is-${syncState}`} aria-hidden="true"></span>
      {session ? "Hesabım" : "Giriş"}<b>→</b>
    </a>
  );
}
