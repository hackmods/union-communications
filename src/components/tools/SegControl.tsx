"use client";

import { cn } from "@/lib/utils";

type SegOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
  /** Optional face for typeface pickers so the pill is readable in-context. */
  fontFamily?: string;
};

type SegControlProps<T extends string> = {
  label: string;
  value: T;
  options: SegOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  /**
   * Roving tabindex (APG radiogroup). Default: on for short lists (≤6),
   * off for long font/style pickers so Tab still reaches every option.
   */
  rovingTabIndex?: boolean;
};

function enabledOptionIndexes<T extends string>(options: SegOption<T>[]) {
  return options
    .map((opt, index) => (opt.disabled ? -1 : index))
    .filter((index) => index >= 0);
}

/** Roving tabindex for short lists; long pickers keep every option in the Tab order. */
export function shouldUseSegRovingTabIndex(
  enabledOptionCount: number,
  override?: boolean,
): boolean {
  return override ?? enabledOptionCount <= 6;
}

/** Accessible segmented control (radiogroup) for tool format/layout pills. */
export function SegControl<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  rovingTabIndex,
}: SegControlProps<T>) {
  const enabled = enabledOptionIndexes(options);
  const useRoving = shouldUseSegRovingTabIndex(enabled.length, rovingTabIndex);

  const selectIndex = (index: number, currentTarget: HTMLElement) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    requestAnimationFrame(() => {
      const next = currentTarget.parentElement?.querySelector<HTMLElement>(
        `button[role="radio"][data-seg-value="${CSS.escape(opt.value)}"]`,
      );
      next?.focus();
    });
  };

  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-medium text-gray-700">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-2"
      >
        {options.map((opt, index) => {
          const selected = opt.value === value;
          const disabled = Boolean(opt.disabled);
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              data-seg-value={opt.value}
              aria-checked={selected}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              tabIndex={useRoving ? (selected ? 0 : -1) : 0}
              className={cn(
                "min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
                opt.fontFamily && "text-base",
                disabled && "cursor-not-allowed opacity-45",
                selected
                  ? "bg-opseu-blue text-white"
                  : "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50",
                disabled && !selected && "hover:bg-white",
              )}
              style={opt.fontFamily ? { fontFamily: opt.fontFamily } : undefined}
              onClick={() => {
                if (!disabled) onChange(opt.value);
              }}
              onKeyDown={(event) => {
                if (disabled || enabled.length === 0) return;
                const at = enabled.indexOf(index);
                const from = at >= 0 ? at : 0;
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  selectIndex(
                    enabled[(from + 1) % enabled.length]!,
                    event.currentTarget,
                  );
                } else if (
                  event.key === "ArrowLeft" ||
                  event.key === "ArrowUp"
                ) {
                  event.preventDefault();
                  selectIndex(
                    enabled[(from - 1 + enabled.length) % enabled.length]!,
                    event.currentTarget,
                  );
                } else if (event.key === "Home") {
                  event.preventDefault();
                  selectIndex(enabled[0]!, event.currentTarget);
                } else if (event.key === "End") {
                  event.preventDefault();
                  selectIndex(
                    enabled[enabled.length - 1]!,
                    event.currentTarget,
                  );
                }
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
