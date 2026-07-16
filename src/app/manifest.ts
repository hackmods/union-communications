import type { MetadataRoute } from "next";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { buildWebManifest } from "@/lib/pwa/manifest";

export default function manifest(): MetadataRoute.Manifest {
  return buildWebManifest({ officerHubPublic: isOfficerHubPublic() });
}
