export function AppBrandMark() {
  return (
    <a
      href="/dashboard"
      className="fixed right-2 top-2 z-40 rounded-lg border border-slate-200/70 bg-white/80 px-2 py-1 shadow-sm backdrop-blur-sm opacity-70 transition-opacity hover:opacity-100 md:left-3 md:right-auto md:top-3 md:px-2 md:py-1.5"
      aria-label="Go to dashboard"
    >
      <img
        src="/skywall-brand.png"
        alt="Skywall Cabinets"
        className="h-6 w-auto object-contain md:h-8"
      />
    </a>
  );
}
