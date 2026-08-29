import { PageHeader } from "@/components/kredoof/page-header";
import { MockDataBanner } from "@/components/kredoof/mock-data-banner";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <MockDataBanner layer="This route" />
      <p className="text-sm text-muted-foreground">
        Full UI for this screen is scheduled for Phase 2.
      </p>
    </div>
  );
}
