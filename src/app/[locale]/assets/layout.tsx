import { PublicCatalogItemLayout } from "@/components/comms/PublicCatalogItemLayout";

export default function AssetsRouteLayout({ children }: { children: React.ReactNode }) {
  return <PublicCatalogItemLayout>{children}</PublicCatalogItemLayout>;
}
