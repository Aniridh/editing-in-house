interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  className?: string;
}

export function ProgressBar({ progress, label, className = '' }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-gray-300 mb-1">
          <span>{label}</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
