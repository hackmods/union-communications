"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type UnionOption = {
  id: string;
  name: string;
};

export type LocalOption = {
  id: string;
  localNumber: string;
  subText?: string;
  unionId: string;
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

  const filteredLocals = useMemo(() => {
    const unionId =
      mode === "president"
        ? lockedUnionId
        : value.unionId === OTHER_UNION
          ? null
          : value.unionId || lockedUnionId;
    if (!unionId) return locals;
    return locals.filter((l) => l.unionId === unionId);
  }, [locals, lockedUnionId, mode, value.unionId]);

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
          label={t("localNumber")}
          value={
            lockedLocalNumber
              ? lockedLocalNumber
              : lockedLocalId || "—"
          }
          disabled
          readOnly
        />
        {visibleSubGroups.length > 0 ? (
          <Select
            label={t("subGroup")}
            value={value.bargainingUnitId}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...value, bargainingUnitId: e.target.value })
            }
          >
            <option value="">{t("subGroupOptional")}</option>
            {visibleSubGroups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
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
            onChange={(e) =>
              onChange({
                ...value,
                unionId: e.target.value,
                newUnionName:
                  e.target.value === OTHER_UNION ? value.newUnionName : "",
                localId: "",
                localNumber: "",
                bargainingUnitId: "",
              })
            }
          >
            <option value="">{t("unionPlaceholder")}</option>
            {unions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
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
                    onChange({ ...value, localId: "" });
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
              bargainingUnitId: "",
            })
          }
        >
          <option value="">{t("localPlaceholder")}</option>
          {filteredLocals.map((l) => (
            <option key={l.id} value={l.id}>
              {l.localNumber}
              {l.subText ? ` — ${l.subText}` : ""}
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
          onChange={(e) =>
            onChange({ ...value, bargainingUnitId: e.target.value })
          }
        >
          <option value="">{t("subGroupOptional")}</option>
          {visibleSubGroups.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </Select>
      ) : null}
    </div>
  );
}

export { OTHER_UNION as UNION_LOCAL_SELECT_OTHER };
