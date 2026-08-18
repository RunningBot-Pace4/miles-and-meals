import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";

export function SavingOverlay({
  title = "Updating your trip",
  message = "Saving changes and keeping everyone in sync.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <BrandedLoadingScreen
      title={title}
      message={message}
    />
  );
}
