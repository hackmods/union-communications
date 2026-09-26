"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type UnionOption = {
  id: string;
  name: string;
  isSample?: boolean;
};

export type LocalOption = {
  id: string;
  localNumber: string;
  subText?: string;
  unionId: string;
  /** Sample / demo Hub seed (e.g. B7P joke locals) — badge in pickers. */
  isSample?: boolean;
};

export type SubGroupOption = {
  id: string;
  code: string;
  name: string;
  localId: string;
};

export type UnionLocalSelectValue = {
  unionId: string;
  /** When unionId is `__other__`, free-text union name. */
  newUnionName: string;
  localId: string;
  localNumber: string;
  localSubText: string;
  bargainingUnitId: string;
};

const OTHER_UNION = "__other__";
const NO_COLLECTIVE = "__none__";
const OTHER_COLLECTIVE = "__other_collective__";

function collectiveKey(group: SubGroupOption): string {
  return JSON.stringify([group.code.trim(), group.name.trim()]);
}

type Props = {
  mode: "elevate" | "president" | "platform";
  unions?: UnionOption[];
  locals: LocalOption[];
  subGroups?: SubGroupOption[];
  /** Locked session values for president mode. */
  lockedUnionId?: string | null;
  lockedUnionName?: string | null;
  lockedLocalId?: string | null;
  lockedLocalNumber?: string | null;
  value: UnionLocalSelectValue;
  onChange: (next: UnionLocalSelectValue) => void;
  disabled?: boolean;
  /** Show free-text local number (elevate/platform) vs pick-only. */
  allowCreateLocal?: boolean;
};

export function emptyUnionLocalSelectValue(): UnionLocalSelectValue {
  return {
    unionId: "",
    newUnionName: "",
    localId: "",
    localNumber: "",
    localSubText: "",
    bargainingUnitId: "",
  };
}

/**
 * Shared Union / Local Number / conditional Sub-group fields for invites
 * and site-admin assign flows.
 */
export function UnionLocalSelect({
  mode,
  unions = [],
  locals,
  subGroups = [],
  lockedUnionId,
  lockedUnionName,
  lockedLocalId,
  lockedLocalNumber,
  value,
  onChange,
  disabled,
  allowCreateLocal = true,
}: Props) {
  const t = useTranslations("tenant.unionLocalSelect");
  const [useLocalNumber, setUseLocalNumber] = useState(
    () => !value.localId && Boolean(value.localNumber),
  );
  const [collectiveChoice, setCollectiveChoice] = useState("");

  const filteredLocals = useMemo(() => {
    const unionId =
      mode === "president"
        ? lockedUnionId
        : value.unionId === OTHER_UNION
          ? null
          : value.unionId || lockedUnionId;
    if (!unionId) return mode === "platform" ? [] : locals;
    return locals.filter((l) => l.unionId === unionId);
  }, [locals, lockedUnionId, mode, value.unionId]);

  const collectiveOptions = useMemo(() => {
    const localIds = new Set(filteredLocals.map((local) => local.id));
    const seen = new Set<string>();
    return subGroups.filter((group) => {
      const key = collectiveKey(group);
      if (!localIds.has(group.localId) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [filteredLocals, subGroups]);

  const activeGroup = subGroups.find(
    (group) => group.id === value.bargainingUnitId,
  );
  const selectedCollective = collectiveChoice ||
    (activeGroup ? collectiveKey(activeGroup) : "");
  const localsForCollective = selectedCollective &&
    selectedCollective !== NO_COLLECTIVE &&
    selectedCollective !== OTHER_COLLECTIVE
    ? filteredLocals.filter((local) =>
        subGroups.some((group) =>
          group.localId === local.id &&
          collectiveKey(group) === selectedCollective,
        ),
      )
    : filteredLocals;

  const visibleSubGroups = useMemo(() => {
    const localId =
      mode === "president" ? lockedLocalId : value.localId || null;
    if (!localId) return [];
    return subGroups.filter((s) => s.localId === localId);
  }, [lockedLocalId, mode, subGroups, value.localId]);

  useEffect(() => {
    if (mode !== "president") return;
    onChange({
      ...value,
      unionId: lockedUnionId ?? "",
      localId: lockedLocalId ?? "",
      localNumber: lockedLocalNumber ?? "",
    });
    // Intentionally sync locked session scope once mode/locks change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid loop on value
  }, [mode, lockedUnionId, lockedLocalId, lockedLocalNumber]);

  if (mode === "president") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label={t("union")}
          value={lockedUnionName || lockedUnionId || "—"}
          disabled
          readOnly
        />
        <Select
          label={t("collective")}
          value={value.bargainingUnitId || OTHER_COLLECTIVE}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              bargainingUnitId: e.target.value === OTHER_COLLECTIVE
                ? ""
                : e.target.value,
            })
          }
        >
          {visibleSubGroups.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
          <option value={OTHER_COLLECTIVE}>{t("collectiveOther")}</option>
        </Select>
        <Input
          label={t("localNumber")}
          value={lockedLocalNumber || lockedLocalId || "—"}
          disabled
          readOnly
        />
      </div>
    );
  }

  const showUnionPicker = mode === "platform";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showUnionPicker ? (
        <>
          <Select
            label={t("union")}
            value={value.unionId}
            disabled={disabled}
            onChange={(e) => {
              setCollectiveChoice("");
              setUseLocalNumber(false);
              onChange({
                ...value,
                unionId: e.target.value,
                newUnionName:
                  e.target.value === OTHER_UNION ? value.newUnionName : "",
                localId: "",
                localNumber: "",
                localSubText: "",
                bargainingUnitId: "",
              });
            }}
          >
            <option value="">{t("unionPlaceholder")}</option>
            {unions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.isSample ? ` (${t("sampleBadge")})` : ""}
              </option>
            ))}
            <option value={OTHER_UNION}>{t("otherUnion")}</option>
          </Select>
          {value.unionId === OTHER_UNION ? (
            <Input
              label={t("enterUnion")}
              value={value.newUnionName}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...value, newUnionName: e.target.value })
              }
            />
          ) : null}
        </>
      ) : null}

      <div className="sm:col-span-2">
        <Select
          label={t("collective")}
          value={selectedCollective}
          disabled={disabled || (!value.unionId && mode === "platform")}
          onChange={(e) => {
            const choice = e.target.value;
            setCollectiveChoice(choice);
            if (choice && choice !== NO_COLLECTIVE && choice !== OTHER_COLLECTIVE) {
              setUseLocalNumber(false);
            }
            const matching = subGroups.find((group) =>
              group.localId === value.localId && collectiveKey(group) === choice,
            );
            onChange({
              ...value,
              localId: choice && choice !== NO_COLLECTIVE &&
                choice !== OTHER_COLLECTIVE && !matching
                ? ""
                : value.localId,
              localNumber: choice && choice !== NO_COLLECTIVE &&
                choice !== OTHER_COLLECTIVE
                ? ""
                : value.localNumber,
              bargainingUnitId: matching?.id ?? "",
            });
          }}
        >
          <option value="">{t("collectivePlaceholder")}</option>
          {collectiveOptions.map((group) => (
            <option key={collectiveKey(group)} value={collectiveKey(group)}>
              {group.code} — {group.name}
            </option>
          ))}
          <option value={NO_COLLECTIVE}>{t("collectiveNone")}</option>
          <option value={OTHER_COLLECTIVE}>{t("collectiveOther")}</option>
        </Select>
        <p className="mt-1 text-xs text-gray-600">{t("collectiveHint")}</p>
      </div>

      {allowCreateLocal ? (
        <div className="sm:col-span-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-opseu-dark">
              {t("localNumber")}
            </legend>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="local-mode"
                  checked={!useLocalNumber}
                  disabled={disabled}
                  onChange={() => {
                    setUseLocalNumber(false);
                    onChange({ ...value, localNumber: "", localSubText: "" });
                  }}
                />
                {t("pickExisting")}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="local-mode"
                  checked={useLocalNumber}
                  disabled={disabled}
                  onChange={() => {
                    setUseLocalNumber(true);
                    setCollectiveChoice(OTHER_COLLECTIVE);
                    onChange({ ...value, localId: "", bargainingUnitId: "" });
                  }}
                />
                {t("enterNumber")}
              </label>
            </div>
          </fieldset>
        </div>
      ) : null}

      {!useLocalNumber || !allowCreateLocal ? (
        <Select
          label={t("local")}
          value={value.localId}
          disabled={disabled}
          onChange={(e) =>
            onChange({
              ...value,
              localId: e.target.value,
              localNumber: "",
              bargainingUnitId: subGroups.find((group) =>
                group.localId === e.target.value &&
                collectiveKey(group) === selectedCollective,
              )?.id ?? "",
            })
          }
        >
          <option value="">{t("localPlaceholder")}</option>
          {localsForCollective.map((l) => (
            <option key={l.id} value={l.id}>
              {l.localNumber}
              {l.subText ? ` — ${l.subText}` : ""}
              {l.isSample ? ` (${t("sampleBadge")})` : ""}
            </option>
          ))}
        </Select>
      ) : (
        <>
          <Input
            label={t("localNumber")}
            value={value.localNumber}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, localNumber: e.target.value, localId: "" })
            }
          />
          <Input
            label={t("localSubText")}
            value={value.localSubText}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, localSubText: e.target.value })
            }
          />
        </>
      )}

    </div>
  );
}

export { OTHER_UNION as UNION_LOCAL_SELECT_OTHER };
