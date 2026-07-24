"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import {
  decryptHybridFile,
  encryptHybridSlice,
  isEncryptedHybridFile,
} from "@/lib/hybrid/encrypt";
import { isHybridDataSlice } from "@/lib/hybrid/slice";
import {
  hybridLocalSliceAdapter,
  type HybridDataMode,
} from "@/lib/hybrid/local-slice-adapter";
import {
  clearLiveHybridSession,
  getLiveHybridSlice,
  isLiveHybridUnlocked,
  unlockLiveHybridSession,
} from "@/lib/hybrid/live-session";
import type { HybridImportMode, HybridImportResult } from "@/lib/hybrid/types";
import type { HybridDataSlice } from "@/lib/hybrid/types";

export function HybridSettingsPanel() {
  const t = useTranslations("hybrid");
  const { data: session } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [importMode, setImportMode] = useState<HybridImportMode>("merge");
  const [dataMode, setDataMode] = useState<HybridDataMode>("central");
  const [hasLocalSlice, setHasLocalSlice] = useState(false);
  const [localSavedAt, setLocalSavedAt] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mode = await hybridLocalSliceAdapter.getDataMode();
      if (cancelled) return;
      setDataMode(mode);
      const file = await hybridLocalSliceAdapter.getEncryptedSlice();
      if (cancelled) return;
      setHasLocalSlice(!!file);
      setLocalSavedAt(file?.exportedAt ?? null);
      setUnlocked(isLiveHybridUnlocked());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearStatus = () => {
    setMessage(null);
    setError(null);
  };

  const downloadEncrypted = (file: object, filename: string) => {
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchSlice = async (): Promise<HybridDataSlice> => {
    const res = await fetch("/api/hybrid/slice");
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? t("errors.fetchFailed"));
    }
    const slice = await res.json();
    if (!isHybridDataSlice(slice)) {
      throw new Error(t("errors.invalidSlice"));
    }
    return slice;
  };

  const postImport = async (
    slice: HybridDataSlice,
    mode: HybridImportMode,
  ): Promise<HybridImportResult> => {
    const res = await fetch("/api/hybrid/slice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slice, mode }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? t("errors.importFailed"));
    }
    return res.json() as Promise<HybridImportResult>;
  };

  const unlockFromStorage = async (): Promise<HybridDataSlice> => {
    if (passphrase.length < 8) {
      throw new Error(t("errors.passphraseShort"));
    }
    const file = await hybridLocalSliceAdapter.getEncryptedSlice();
    if (!file || !isEncryptedHybridFile(file)) {
      throw new Error(t("errors.noLocalSlice"));
    }
    const slice = await decryptHybridFile(file, passphrase);
    unlockLiveHybridSession(slice, passphrase);
    setUnlocked(true);
    return slice;
  };

  const handleExport = async () => {
    clearStatus();
    if (passphrase.length < 8) {
      setError(t("errors.passphraseShort"));
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError(t("errors.passphraseMismatch"));
      return;
    }
    setBusy(true);
    try {
      const slice = await fetchSlice();
      const encrypted = await encryptHybridSlice(slice, passphrase);
      const localLabel =
        session?.user.localId?.replace(/^local-/, "") ?? "local";
      downloadEncrypted(
        encrypted,
        `hybrid-slice-${localLabel}-${slice.exportedAt.slice(0, 10)}.lunion.json`,
      );
      setMessage(
        t("exportSuccess", {
          grievances: slice.grievances.length,
          bumping: slice.bumpingCases.length,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.exportFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    clearStatus();
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (passphrase.length < 8) {
      setError(t("errors.passphraseShort"));
      return;
    }
    setBusy(true);
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isEncryptedHybridFile(parsed)) {
        throw new Error(t("errors.invalidFile"));
      }
      const slice = await decryptHybridFile(parsed, passphrase);
      const result = await postImport(slice, importMode);
      setMessage(
        t("importSuccess", {
          grievances: result.grievancesImported,
          bumping: result.bumpingImported,
          removed: result.grievancesRemoved + result.bumpingRemoved,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.importFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLocalSlice = async () => {
    clearStatus();
    if (passphrase.length < 8) {
      setError(t("errors.passphraseShort"));
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError(t("errors.passphraseMismatch"));
      return;
    }
    setBusy(true);
    try {
      const slice = await fetchSlice();
      const encrypted = await encryptHybridSlice(slice, passphrase);
      await hybridLocalSliceAdapter.saveEncryptedSlice(encrypted);
      unlockLiveHybridSession(slice, passphrase);
      setHasLocalSlice(true);
      setLocalSavedAt(encrypted.exportedAt);
      setUnlocked(true);
      setMessage(t("localSaveSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.localSaveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleUnlockLive = async () => {
    clearStatus();
    setBusy(true);
    try {
      await unlockFromStorage();
      await hybridLocalSliceAdapter.setDataMode("local");
      setDataMode("local");
      setMessage(t("unlockSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unlockFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleSyncToHub = async () => {
    clearStatus();
    setBusy(true);
    try {
      let slice = getLiveHybridSlice();
      if (!slice) {
        slice = await unlockFromStorage();
      }
      const result = await postImport(slice, importMode);
      setMessage(
        t("syncSuccess", {
          grievances: result.grievancesImported,
          bumping: result.bumpingImported,
          removed: result.grievancesRemoved + result.bumpingRemoved,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.syncFailed"));
    } finally {
      setBusy(false);
    }
  };

  const handleRestoreLocalSlice = async () => {
    clearStatus();
    if (passphrase.length < 8) {
      setError(t("errors.passphraseShort"));
      return;
    }
    setBusy(true);
    try {
      const file = await hybridLocalSliceAdapter.getEncryptedSlice();
      if (!file || !isEncryptedHybridFile(file)) {
        throw new Error(t("errors.noLocalSlice"));
      }
      const slice = await decryptHybridFile(file, passphrase);
      const result = await postImport(slice, importMode);
      unlockLiveHybridSession(slice, passphrase);
      setUnlocked(true);
      setMessage(
        t("importSuccess", {
          grievances: result.grievancesImported,
          bumping: result.bumpingImported,
          removed: result.grievancesRemoved + result.bumpingRemoved,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("errors.localRestoreFailed"),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClearLocalSlice = async () => {
    clearStatus();
    await hybridLocalSliceAdapter.clearEncryptedSlice();
    await hybridLocalSliceAdapter.setDataMode("central");
    clearLiveHybridSession();
    setHasLocalSlice(false);
    setLocalSavedAt(null);
    setDataMode("central");
    setUnlocked(false);
    setMessage(t("localCleared"));
  };

  const handleDataModeChange = async (mode: HybridDataMode) => {
    clearStatus();
    if (mode === "local") {
      if (!hasLocalSlice) {
        setError(t("errors.needLocalSlice"));
        return;
      }
      setBusy(true);
      try {
        await unlockFromStorage();
        await hybridLocalSliceAdapter.setDataMode("local");
        setDataMode("local");
        setMessage(t("modeLocalOn"));
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.unlockFailed"));
      } finally {
        setBusy(false);
      }
      return;
    }
    await hybridLocalSliceAdapter.setDataMode("central");
    clearLiveHybridSession();
    setUnlocked(false);
    setDataMode("central");
    setMessage(t("modeCentralOn"));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="mt-2 text-gray-600">{t("description")}</p>
      </div>

      <Card className="space-y-4">
        <CardTitle>{t("passphraseTitle")}</CardTitle>
        <p className="text-sm text-gray-600">{t("passphraseHint")}</p>
        <Input
          type="password"
          label={t("passphrase")}
          autoComplete="new-password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
        />
        <Input
          type="password"
          label={t("confirmPassphrase")}
          autoComplete="new-password"
          value={confirmPassphrase}
          onChange={(e) => setConfirmPassphrase(e.target.value)}
        />
      </Card>

      <Card className="space-y-4">
        <CardTitle>{t("exportTitle")}</CardTitle>
        <p className="text-sm text-gray-600">{t("exportDesc")}</p>
        <Button onClick={handleExport} disabled={busy}>
          {busy ? t("working") : t("exportEncrypted")}
        </Button>
      </Card>

      <Card className="space-y-4">
        <CardTitle>{t("importTitle")}</CardTitle>
        <p className="text-sm text-gray-600">{t("importDesc")}</p>
        <RadioGroup legend={t("importMode")}>
          <Radio
            name="importMode"
            value="merge"
            label={t("modeMerge")}
            checked={importMode === "merge"}
            onChange={() => setImportMode("merge")}
          />
          <Radio
            name="importMode"
            value="replace"
            label={t("modeReplace")}
            checked={importMode === "replace"}
            onChange={() => setImportMode("replace")}
          />
        </RadioGroup>
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {t("importEncrypted")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          aria-label={t("importEncrypted")}
          onChange={handleImportFile}
        />
      </Card>

      <Card className="space-y-4">
        <CardTitle>{t("localSliceTitle")}</CardTitle>
        <p className="text-sm text-gray-600">{t("localSliceDesc")}</p>
        {hasLocalSlice && localSavedAt && (
          <p className="text-sm text-gray-700" role="status">
            {t("localSlicePresent", { date: localSavedAt.slice(0, 10) })}
          </p>
        )}
        {unlocked && (
          <p className="text-sm text-opseu-blue" role="status">
            {t("sessionUnlocked")}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSaveLocalSlice} disabled={busy}>
            {t("saveLocal")}
          </Button>
          <Button
            variant="outline"
            onClick={handleUnlockLive}
            disabled={busy || !hasLocalSlice}
          >
            {t("unlockLive")}
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncToHub}
            disabled={busy || !hasLocalSlice}
          >
            {t("syncToHub")}
          </Button>
          <Button
            variant="outline"
            onClick={handleRestoreLocalSlice}
            disabled={busy || !hasLocalSlice}
          >
            {t("restoreLocal")}
          </Button>
          <Button
            variant="ghost"
            onClick={handleClearLocalSlice}
            disabled={!hasLocalSlice}
          >
            {t("clearLocal")}
          </Button>
        </div>

        <div className="space-y-2 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-600">{t("dataModeDesc")}</p>
          <p className="text-sm text-amber-800">{t("dataModeHonest")}</p>
          <RadioGroup legend={t("dataMode")}>
            <Radio
              name="dataMode"
              value="central"
              label={t("modeCentral")}
              checked={dataMode === "central"}
              onChange={() => void handleDataModeChange("central")}
            />
            <Radio
              name="dataMode"
              value="local"
              label={t("modeLocal")}
              checked={dataMode === "local"}
              onChange={() => void handleDataModeChange("local")}
            />
          </RadioGroup>
        </div>
      </Card>

      {message && (
        <p className="text-sm text-opseu-blue" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
