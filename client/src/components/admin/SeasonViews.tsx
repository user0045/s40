import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, Loader2 } from 'lucide-react';

interface SeasonViewsProps {
  seasonId: string;
}

const SeasonViews: React.FC<SeasonViewsProps> = ({ seasonId }) => {
  const { data: views, isLoading, error } = useQuery({
    queryKey: ['season-views', seasonId],
    queryFn: async () => {
      console.log('Fetching season views for seasonId:', seasonId);
      const response = await fetch(`/api/views/season/${seasonId}`);
      if (!response.ok) {
        console.error('Failed to fetch season views:', response.status, response.statusText);
        throw new Error('Failed to fetch season views');
      }
      const data = await response.json();
      console.log('Season views response:', data);
      return data.views || 0;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    enabled: !!seasonId,
    retry: 1,
    staleTime: 1000,
  });

  const formatViews = (viewCount: number) => {
    if (viewCount >= 1000000) {
      return `${(viewCount / 1000000).toFixed(1)}M`;
    } else if (viewCount >= 1000) {
      return `${(viewCount / 1000).toFixed(1)}K`;
    }
    return viewCount.toString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span className="text-xs">...</span>
      </div>
    );
  }

  if (error) {
    console.error('Season views error:', error);
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Eye className="h-3 w-3" />
        <span className="text-xs">0</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Eye className="h-3 w-3 text-primary" />
      <span className="font-medium">{formatViews(views || 0)}</span>
    </div>
  );
};

export default SeasonViews;