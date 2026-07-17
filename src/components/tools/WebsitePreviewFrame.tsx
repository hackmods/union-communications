"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type WebsitePreviewFrameProps = {
  html: string;
  title: string;
  className?: string;
};

/**
 * Live website template preview. Clears srcDoc on unmount so React soft-nav
 * does not race the iframe's nested document (removeChild null crashes).
 */
export function WebsitePreviewFrame({
  html,
  title,
  className,
}: WebsitePreviewFrameProps) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    frame.srcdoc = html;
    return () => {
      try {
        frame.srcdoc = "";
        frame.removeAttribute("srcdoc");
        frame.src = "about:blank";
      } catch {
        // Frame may already be detached during route teardown.
      }
    };
  }, [html]);

  return (
    <iframe
      ref={ref}
      title={title}
      className={cn(
        "h-[600px] w-full rounded-lg border border-gray-200 bg-white shadow-lg",
        className,
      )}
      sandbox="allow-scripts"
    />
  );
}
