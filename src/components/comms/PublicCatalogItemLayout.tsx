import type { ReactNode } from "react";
import { PublicCatalogBreadcrumbs } from "@/components/comms/PublicCatalogBreadcrumbs";

export function PublicCatalogItemLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicCatalogBreadcrumbs />
      {children}
    </>
  );
}
