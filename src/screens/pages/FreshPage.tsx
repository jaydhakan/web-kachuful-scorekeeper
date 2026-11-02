import { AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useApp } from '@/state/store';
import { startFresh } from '@/sync/fresh';
import { Modal } from '@/components/ui/Modal';
import { Page } from '@/components/ui/Page';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { t } from '@/strings';

const fr = t.hub.fresh;

/** Wipes this device, and the account's games when signed in, then reloads so no old state lingers in memory. */
export function FreshPage() {
  const { state } = useApp();
  const signedIn = !!state.session;
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  const run = async () => {
    setAsk(false);
    setBusy(true);
    setErr(false);
    try {
      await startFresh(signedIn);
    } catch {
      setErr(true);
      setBusy(false);
      return;
    }
    window.location.assign('/');
  };

  return (
    <Page title={fr.title}>
      <div className="glass flex flex-col gap-3 p-4">
        <p className="text-16">{signedIn ? fr.bodyOnline : fr.body}</p>
        <p className="text-15 font-bold text-[var(--neg)]">{fr.warn}</p>
        {err && (
          <p role="alert" className="text-15 font-bold text-[var(--warn)]">
            {fr.failed}
          </p>
        )}
        <PrimaryButton
          tone="danger"
          className="w-full"
          disabled={busy}
          onClick={() => setAsk(true)}
        >
          {fr.button}
        </PrimaryButton>
      </div>
      <AnimatePresence>
        {ask && (
          <Modal
            text={fr.confirm}
            ok={fr.confirmOk}
            danger
            onOk={() => void run()}
            onCancel={() => setAsk(false)}
          />
        )}
      </AnimatePresence>
    </Page>
  );
}
