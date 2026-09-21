"use client";

import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { markWorkshopDemoSession } from "@/lib/comms/workshop-demo-session";

type WorkshopDemoJoinLinkProps = ComponentProps<typeof Link>;

/**
 * Locale Link that marks the tab as a 20-minute Demo Path session.
 * Use for First week chips, workshop steps, and First week CTAs on demo tools.
 */
export function WorkshopDemoJoinLink({
  onClick,
  ...props
}: WorkshopDemoJoinLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        markWorkshopDemoSession();
        onClick?.(event);
      }}
    />
  );
}
