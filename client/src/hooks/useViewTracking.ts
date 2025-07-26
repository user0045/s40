
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Hook to increment movie views
export const useIncrementMovieViews = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await fetch(`/api/views/movie/${contentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to increment movie views:', errorData);
        throw new Error('Failed to increment movie views');
      }
      return response.json();
    },
    onSuccess: (data, contentId) => {
      // Invalidate and refetch views data
      queryClient.invalidateQueries({ queryKey: ['views', 'movie', contentId] });
      console.log('Movie view incremented successfully');
    },
    onError: (error) => {
      console.error('Error incrementing movie views:', error);
    },
    retry: 2,
  });
};

// Hook to increment episode views
export const useIncrementEpisodeViews = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (episodeId: string) => {
      console.log('Attempting to increment episode views for:', episodeId);
      
      if (!episodeId || episodeId.trim() === '') {
        throw new Error('Episode ID is required and cannot be empty');
      }
      
      const response = await fetch(`/api/views/episode/${episodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to increment episode views:', errorData);
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        throw new Error(`Failed to increment episode views: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Episode view increment response:', result);
      return result;
    },
    onSuccess: (data, episodeId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['views', 'episode', episodeId] });
      console.log('Episode view incremented successfully for episode:', episodeId);
    },
    onError: (error, episodeId) => {
      console.error('Error incrementing episode views for episode:', episodeId, 'Error:', error);
    },
    retry: 2,
  });
};

// Hook to increment show episode views (for when watching show episodes)
export const useIncrementShowEpisodeViews = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (episodeId: string) => {
      console.log('Attempting to increment show episode views for:', episodeId);
      
      if (!episodeId || episodeId.trim() === '') {
        throw new Error('Episode ID is required and cannot be empty');
      }
      
      const response = await fetch(`/api/views/show/${episodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Failed to increment show episode views:', errorData);
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        throw new Error(`Failed to increment show episode views: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Show episode view increment response:', result);
      return result;
    },
    onSuccess: (data, episodeId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['views', 'episode', episodeId] });
      queryClient.invalidateQueries({ queryKey: ['views', 'show'] });
      console.log('Show episode view incremented successfully for episode:', episodeId);
    },
    onError: (error, episodeId) => {
      console.error('Error incrementing show episode views for episode:', episodeId, 'Error:', error);
    },
    retry: 2,
  });
};

// Hook to get real-time views
export const useRealTimeViews = (contentType: string, contentId: string) => {
  return useQuery({
    queryKey: ['views', contentType, contentId],
    queryFn: async () => {
      const response = await fetch(`/api/views/${contentType}/${contentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch views');
      }
      const data = await response.json();
      return data.views;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    enabled: !!contentId,
  });
};

// Hook to get platform statistics
export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const response = await fetch('/api/platform-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch platform stats');
      }
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};
