export default function LoadingSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex items-center justify-center min-h-svh">
      <div className="h-12 w-12 rounded-full border-4 border-gold/20 border-t-gold animate-spin motion-reduce:animate-none" />
    </div>
  );
}
