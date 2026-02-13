export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-12 w-12 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
    </div>
  );
}
