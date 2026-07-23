import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional icon / illustration slot (decorative; mark aria-hidden in caller if needed). */
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

/**
 * Shared Hub empty-state layout. Copy is caller-owned (EN/FR via next-intl).
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6",
        className,
      )}
      role="status"
    >
      {icon && <div className="text-opseu-blue">{icon}</div>}
      <p className="text-base font-semibold text-opseu-dark">{title}</p>
      {description && <p className="text-sm text-gray-600">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
