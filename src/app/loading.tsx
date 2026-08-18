import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";

export default function Loading() {
  return (
    <BrandedLoadingScreen
      title="Preparing your trip..."
      message="Loading plans, expenses and balances."
    />
  );
}
