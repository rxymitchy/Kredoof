export function MockDataBanner({ layer }: { layer: string }) {
  return (
    <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {layer} is using mock data. This is not a live underwriting result.
    </p>
  );
}
