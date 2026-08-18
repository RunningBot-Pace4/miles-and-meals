export default function AppLoading() {
  return (
    <div className="loading-dashboard" aria-live="polite" aria-busy="true">
      <div className="skeleton skeleton-eyebrow" />
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-subtitle" />

      <div className="skeleton skeleton-hero" />

      <div className="loading-stat-grid">
        <div className="skeleton skeleton-stat" />
        <div className="skeleton skeleton-stat" />
        <div className="skeleton skeleton-stat" />
      </div>

      <div className="loading-panel-grid">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}
