export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 ${className}`}></div>
  );
} 