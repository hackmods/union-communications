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
  divisionId?: string;
  /** Sample / demo Hub seed (e.g. B7P joke locals) — badge in pickers. */
  isSample?: boolean;
};

export type SubGroupOption = {
  id: string;
  code: string;
  name: string;
  localId: string;
};

export type CollectiveOption = {
  id: string;
  unionId: string;
  code: string;
  name: string;
};

export type UnionLocalSelectValue = {
  unionId: string;
  /** When unionId is `__other__`, free-text union name. */
  newUnionName: string;
  localId: string;
  localNumber: string;
  localSubText: string;
  divisionId: string;
  bargainingUnitId: string;
};

const OTHER_UNION = "__other__";
const NO_COLLECTIVE = "__none__";
const OTHER_COLLECTIVE = "__other_collective__";

type Props = {
  mode: "elevate" | "president" | "platform";
  unions?: UnionOption[];
  locals: LocalOption[];
  collectives?: CollectiveOption[];
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
    divisionId: "",
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
  collectives = [],
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

  const unionId = mode === "president" ? lockedUnionId : value.unionId || lockedUnionId;
  const collectiveOptions = collectives.filter((group) => group.unionId === unionId);
  const activeDivisionId = value.divisionId ||
    filteredLocals.find((local) => local.id === value.localId)?.divisionId || "";
  const selectedCollective = collectiveChoice || activeDivisionId;
  // Filter by the visible selection (including in-flight collectiveChoice), not
  // only value.divisionId — otherwise the local list lags one render behind.
  const localsForCollective = !selectedCollective
    ? filteredLocals
    : selectedCollective === NO_COLLECTIVE ||
        selectedCollective === OTHER_COLLECTIVE
      ? filteredLocals.filter((local) => !local.divisionId)
      : filteredLocals.filter(
          (local) => local.divisionId === selectedCollective,
        );

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
        <Input
          label={t("collective")}
          value={collectives.find((group) => group.id === locals.find((local) =>
            local.id === lockedLocalId)?.divisionId)?.name ?? t("collectiveOther")}
          disabled
          readOnly
        />
        <Input
          label={t("localNumber")}
          value={lockedLocalNumber || lockedLocalId || "—"}
          disabled
          readOnly
        />
        {visibleSubGroups.length > 0 ? (
          <Select
            label={t("subGroup")}
            value={value.bargainingUnitId}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, bargainingUnitId: e.target.value })}
          >
            <option value="">{t("subGroupOptional")}</option>
            {visibleSubGroups.map((group) => (
              <option key={group.id} value={group.id}>{group.code} — {group.name}</option>
            ))}
          </Select>
        ) : null}
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
                divisionId: "",
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
            const divisionId = choice === NO_COLLECTIVE || choice === OTHER_COLLECTIVE
              ? "" : choice;
            const selectedLocal = filteredLocals.find((local) => local.id === value.localId);
            const keepLocal = selectedLocal && (selectedLocal.divisionId ?? "") === divisionId;
            onChange({
              ...value,
              divisionId,
              localId: keepLocal ? value.localId : "",
              bargainingUnitId: keepLocal ? value.bargainingUnitId : "",
            });
          }}
        >
          <option value="">{t("collectivePlaceholder")}</option>
          {collectiveOptions.map((group) => (
            <option key={group.id} value={group.id}>
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
                    onChange({
                      ...value,
                      localId: "",
                      localNumber: value.localNumber,
                      bargainingUnitId: "",
                    });
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
              divisionId: filteredLocals.find((local) => local.id === e.target.value)?.divisionId ?? "",
              bargainingUnitId: "",
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

      {visibleSubGroups.length > 0 ? (
        <Select
          label={t("subGroup")}
          value={value.bargainingUnitId}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, bargainingUnitId: e.target.value })}
        >
          <option value="">{t("subGroupOptional")}</option>
          {visibleSubGroups.map((group) => (
            <option key={group.id} value={group.id}>{group.code} — {group.name}</option>
          ))}
        </Select>
      ) : null}

    </div>
  );
}

export { OTHER_UNION as UNION_LOCAL_SELECT_OTHER };
