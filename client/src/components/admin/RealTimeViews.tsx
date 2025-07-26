
import React from 'react';
import { useRealTimeViews } from '@/hooks/useViewTracking';
import { Eye } from 'lucide-react';

interface RealTimeViewsProps {
  contentType: 'movie' | 'show' | 'web-series' | 'season';
  contentId: string;
  className?: string;
}

const RealTimeViews: React.FC<RealTimeViewsProps> = ({ contentType, contentId, className = '' }) => {
  const { data: views, isLoading } = useRealTimeViews(contentType, contentId);

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <Eye className="h-3 w-3 text-primary animate-pulse" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <Eye className="h-3 w-3 text-primary" />
      <span className="text-sm font-medium">{formatViews(views || 0)}</span>
    </div>
  );
};

export default RealTimeViews;
