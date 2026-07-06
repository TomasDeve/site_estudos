export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`size-6 animate-spin rounded-full border-2 border-navy-600 border-t-gold ${className}`}
      role="status"
      aria-label="Carregando"
    />
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-10" />
    </div>
  );
}
