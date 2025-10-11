import { LoadingProps } from '@/types';
import { cn } from '@/utils/cn';

const LoadingSpinner: React.FC<LoadingProps> = ({ 
  size = 'md', 
  color = 'primary-600',
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={cn(
        'loading-spinner border-2 border-gray-300',
        sizeClasses[size],
        `border-t-${color}`,
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
