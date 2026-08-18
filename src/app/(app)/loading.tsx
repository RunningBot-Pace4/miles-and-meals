import { BrandedLoadingScreen } from "@/components/BrandedLoadingScreen";

export default function AppLoading() {
  return (
    <BrandedLoadingScreen
      title="Preparing your trip..."
      message="Loading plans, expenses and balances."
    />
  );
}
