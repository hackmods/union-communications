type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

/** Server-safe JSON-LD script (JSON string children only). */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script type="application/ld+json">{JSON.stringify(data)}</script>
  );
}
