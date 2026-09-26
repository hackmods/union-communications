import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FeatureTeaserPanel } from "@/components/platform/FeatureTeaserPanel";

describe("FeatureTeaserPanel", () => {
  it("renders title, body, bullets, and actions", () => {
    const html = renderToStaticMarkup(
      <FeatureTeaserPanel
        eyebrow="Local Portal"
        title="Circles are off"
        body="Ask your officers."
        bullets={["Hall", "Together", "Dispatch"]}
        actions={<button type="button">Open Hub</button>}
        footer={<span>Turn on in Configuration</span>}
      />,
    );
    expect(html).toContain("Local Portal");
    expect(html).toContain("Circles are off");
    expect(html).toContain("Ask your officers.");
    expect(html).toContain("Hall");
    expect(html).toContain("Together");
    expect(html).toContain("Dispatch");
    expect(html).toContain("Open Hub");
    expect(html).toContain("Turn on in Configuration");
  });
});
