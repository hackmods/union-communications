import type { HostAction } from "@/lib/ops/host-readiness-actions";
import {
  HOST_ACTION_CONSEQUENCE_KEYS,
  HOST_ACTION_TITLE_KEYS,
  HOST_GAP_KEYS,
} from "@/lib/ops/host-readiness-copy";
import { CapRoverConfigCopyButton } from "@/components/site-admin/CapRoverConfigCopyButton";

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function HostActionCard({
  action,
  t,
  tone = "blocking",
}: {
  action: HostAction;
  t: Translate;
  tone?: "blocking" | "advisory" | "attestation";
}) {
  const border =
    tone === "blocking"
      ? "border-opseu-orange/30 bg-opseu-orange/5"
      : tone === "attestation"
        ? "border-opseu-blue/20 bg-white"
        : "border-opseu-gray/20 bg-white";

  return (
    <article className={`rounded-lg border p-4 shadow-sm ${border}`}>
      <h3 className="text-sm font-semibold text-opseu-dark">
        {t(HOST_ACTION_TITLE_KEYS[action.id])}
      </h3>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        {t(HOST_ACTION_CONSEQUENCE_KEYS[action.id])}
      </p>

      {action.gapCodes.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-opseu-gray-dark">
          {action.gapCodes.map((code) => (
            <li key={code}>{t(HOST_GAP_KEYS[code])}</li>
          ))}
        </ul>
      ) : null}

      {action.envKeys.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {action.envKeys.map((key) => (
            <li
              key={key.name}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs"
            >
              <code className="font-mono text-opseu-dark">{key.name}</code>
              <span className="text-opseu-gray-dark">
                {key.role === "required"
                  ? t("hostEnvRoleRequired")
                  : t("hostEnvRoleSupporting")}
              </span>
              <span className="font-mono text-opseu-gray-dark">
                {key.formatHint}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {action.commandHint ? (
        <p className="mt-2 font-mono text-xs text-opseu-dark">
          {action.commandHint}
        </p>
      ) : null}

      <div className="mt-3">
        <pre className="overflow-x-auto rounded border border-opseu-gray/15 bg-opseu-gray/5 p-2 font-mono text-[11px] leading-relaxed text-opseu-dark whitespace-pre-wrap">
          {action.caproverBlock}
        </pre>
        <CapRoverConfigCopyButton
          className="mt-2"
          text={action.caproverBlock}
        />
      </div>
    </article>
  );
}
