import { users, type User, type InsertUser } from "@shared/schema";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with direct configuration
const SUPABASE_URL = "https://kxlqebcjpefqtbwdxdss.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bHFlYmNqcGVmcXRid2R4ZHNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NzU5MTEsImV4cCI6MjA2NTM1MTkxMX0.yCgy6oFmYLpmv-F7P04k43PMMqPD8YQQ1_Hz40YSMAk";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
}

// Advertisement request types
interface CreateAdvertisementRequestData {
  email: string;
  description: string;
  budget: number;
  user_ip: string;
}

// Admin authentication types
interface AdminAuthData {
  id: string;
  admin_name: string;
  password: string;
  created_at: string;
  updated_at: string;
}

interface AdminLoginAttemptData {
  id: string;
  ip_address: string;
  admin_name: string;
  attempt_time: string;
  is_successful: boolean;
  created_at: string;
}

interface AdvertisementRequest {
  id: string;
  email: string;
  description: string;
  budget: number;
  user_ip: string;
  created_at: string;
  updated_at: string;
}

// Admin authentication functions
async function authenticateAdmin(adminName: string, password: string): Promise<AdminAuthData | null> {
  const { data, error } = await supabase
    .from('admin_auth')
    .select('*')
    .eq('admin_name', adminName)
    .eq('password', password)
    .single();

  if (error) {
    console.error('Error authenticating admin:', error);
    return null;
  }

  return data;
}

async function recordLoginAttempt(ipAddress: string, adminName: string, isSuccessful: boolean): Promise<void> {
  const { error } = await supabase
    .from('admin_login_attempts')
    .insert({
      ip_address: ipAddress,
      admin_name: adminName,
      is_successful: isSuccessful
    });

  if (error) {
    console.error('Error recording login attempt:', error);
  }
}

async function getRecentFailedAttempts(ipAddress: string): Promise<number> {
  const fortyFiveMinutesAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('admin_login_attempts')
    .select('*')
    .eq('ip_address', ipAddress)
    .eq('is_successful', false)
    .gte('attempt_time', fortyFiveMinutesAgo);

  if (error) {
    console.error('Error getting recent failed attempts:', error);
    return 0;
  }

  return data?.length || 0;
}

async function isIpBlocked(ipAddress: string): Promise<boolean> {
  const failedAttempts = await getRecentFailedAttempts(ipAddress);
  return failedAttempts >= 5;
}

async function resetFailedAttempts(ipAddress: string): Promise<void> {
  const { error } = await supabase
    .from('admin_login_attempts')
    .delete()
    .eq('ip_address', ipAddress);

  if (error) {
    console.error('Error resetting failed attempts:', error);
  }
}


// Advertisement request functions
async function getAdvertisementRequests(): Promise<AdvertisementRequest[]> {
  try {
    const { data, error } = await supabase
      .from('advertisement_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching advertisement requests:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function createAdvertisementRequest(data: CreateAdvertisementRequestData): Promise<AdvertisementRequest> {
  try {
    const { data: result, error } = await supabase
      .from('advertisement_requests')
      .insert([{
        email: data.email,
        description: data.description,
        budget: data.budget,
        user_ip: data.user_ip
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating advertisement request:', error);
      throw new Error('Failed to create advertisement request');
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function deleteAdvertisementRequest(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('advertisement_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting advertisement request:', error);
      throw new Error('Failed to delete advertisement request');
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function checkRecentAdvertisementRequest(userIP: string, since: Date): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('advertisement_requests')
      .select('id')
      .eq('user_ip', userIP)
      .gte('created_at', since.toISOString())
      .limit(1);

    if (error) {
      console.error('Error checking recent advertisement request:', error);
      return false;
    }

    return (data && data.length > 0);
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}



// Create storage instance and add methods
const storage = new MemStorage() as any;

// Add advertisement request methods to the main storage object
storage.getAdvertisementRequests = getAdvertisementRequests;
storage.createAdvertisementRequest = createAdvertisementRequest;
storage.deleteAdvertisementRequest = deleteAdvertisementRequest;
storage.checkRecentAdvertisementRequest = checkRecentAdvertisementRequest;

// Add admin authentication methods to the main storage object
storage.authenticateAdmin = authenticateAdmin;
storage.recordLoginAttempt = recordLoginAttempt;
storage.getRecentFailedAttempts = getRecentFailedAttempts;
storage.isIpBlocked = isIpBlocked;
storage.resetFailedAttempts = resetFailedAttempts;

// View tracking functions
async function incrementMovieViews(contentId: string): Promise<void> {
  try {
    console.log('Incrementing movie views for contentId:', contentId);
    const { error } = await supabase.rpc('increment_movie_views', { movie_content_id: contentId });
    if (error) {
      console.error('Error incrementing movie views:', error);
      throw error;
    }
    console.log('Movie view incremented successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function incrementEpisodeViews(episodeId: string): Promise<void> {
  try {
    console.log('Incrementing episode views for episodeId:', episodeId);

    // First check if episode exists
    const { data: episodeExists, error: checkError } = await supabase
      .from('episode')
      .select('episode_id, views')
      .eq('episode_id', episodeId)
      .single();

    if (checkError) {
      console.error('Error checking episode existence:', checkError);
      throw new Error(`Episode ${episodeId} not found: ${checkError.message}`);
    }

    console.log('Episode found with current views:', episodeExists.views);

    // Now increment the views
    const { error } = await supabase.rpc('increment_episode_views', { episode_uuid: episodeId });
    if (error) {
      console.error('Error incrementing episode views:', error);
      throw error;
    }

    // Verify the increment worked
    const { data: updatedEpisode, error: verifyError } = await supabase
      .from('episode')
      .select('views')
      .eq('episode_id', episodeId)
      .single();

    if (!verifyError && updatedEpisode) {
      console.log('Episode view incremented successfully. New count:', updatedEpisode.views);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function getMovieViews(contentId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_movie_views', { movie_content_id: contentId });
    if (error) {
      console.error('Error getting movie views:', error);
      return 0;
    }
    return data || 0;
  } catch (error) {
    console.error('Database connection error:', error);
    return 0;
  }
}

async function getEpisodeViews(episodeId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_episode_views', { episode_uuid: episodeId });
    if (error) {
      console.error('Error getting episode views:', error);
      return 0;
    }
    return data || 0;
  } catch (error) {
    console.error('Database connection error:', error);
    return 0;
  }
}

async function getShowViews(showId: string): Promise<number> {
  try {
    // First try to get the show directly by content_id
    let { data, error } = await supabase.rpc('get_show_views_by_content_id', { show_content_id: showId });

    // If that fails, it might be an upload_content ID, so get the actual show content_id
    if (error || data === 0) {
      const { data: uploadContent, error: uploadError } = await supabase
        .from('upload_content')
        .select('content_id')
        .eq('id', showId)
        .single();

      if (!uploadError && uploadContent) {
        const { data: showViews, error: showError } = await supabase.rpc('get_show_views_by_content_id', { show_content_id: uploadContent.content_id });
        if (!showError) {
          return showViews || 0;
        }
      }
    }

    if (error) {
      console.error('Error getting show views:', error);
      return 0;
    }
    return data || 0;
  } catch (error) {
    console.error('Database connection error:', error);
    return 0;
  }
}

async function getWebSeriesViews(contentId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_web_series_total_views', { web_series_content_id: contentId });

      if (error) {
        console.error('Error fetching web series views:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getWebSeriesViews:', error);
      return 0;
    }
  }

  async function getSeasonViews(seasonId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('get_season_total_views_by_id', { season_uuid: seasonId });

      if (error) {
        console.error('Error fetching season views:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in getSeasonViews:', error);
      return 0;
    }
  }

export async function getContentViews(contentType: string, contentId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_content_views', {
      content_type_param: contentType,
      content_id_param: contentId
    });

    if (error) {
      console.error('Error getting content views:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('Error in getContentViews:', error);
    return 0;
  }
}

export async function getSeasonViews(seasonId: string): Promise<number> {
  try {
    console.log('getSeasonViews called with seasonId:', seasonId);

    // First check if season exists
    const { data: seasonExists, error: checkError } = await supabase
      .from('season')
      .select('season_id, episode_id_list')
      .eq('season_id', seasonId)
      .single();

    if (checkError) {
      console.error('Error checking season existence:', checkError);
      console.error('Season not found:', seasonId);
      return 0;
    }

    console.log('Season found:', seasonExists);

    const { data, error } = await supabase.rpc('get_season_total_views_by_id', {
      season_uuid: seasonId
    });

    if (error) {
      console.error('Error getting season views from RPC:', error);
      return 0;
    }

    console.log('Season views RPC result:', data);
    return data || 0;
  } catch (error) {
    console.error('Error in getSeasonViews:', error);
    return 0;
  }
}

async function getPlatformStats(): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('get_platform_stats');
    if (error) {
      console.error('Error getting platform stats:', error);
      return {
        total_movies: 0,
        total_shows: 0,
        total_web_series: 0,
        total_movie_views: 0,
        total_show_views: 0,
        total_web_series_views: 0,
        total_views: 0
      };
    }
    return data[0] || {};
  } catch (error) {
    console.error('Database connection error:', error);
    return {
      total_movies: 0,
      total_shows: 0,
      total_web_series: 0,
      total_movie_views: 0,
      total_show_views: 0,
      total_web_series_views: 0,
      total_views: 0
    };
  }
}

// Content management functions
async function uploadContent(data: any): Promise<any> {
  // This function would handle content upload logic
  // Currently not implemented - placeholder
  throw new Error('uploadContent function not implemented');
}

async function getAllContent(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('upload_content')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all content:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function getAllContentByType(contentType: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('upload_content')
      .select('*')
      .eq('content_type', contentType)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content by type:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function getAllContentByGenre(genre: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('upload_content')
      .select('*')
      .contains('genre', [genre])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content by genre:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function getAllContentByFeature(feature: string): Promise<any[]> {
  // This would need to be implemented based on your feature logic
  // Currently placeholder
  throw new Error('getAllContentByFeature function not implemented');
}

async function updateContent(id: string, data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('upload_content')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function deleteContent(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('upload_content')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Season management functions
async function uploadSeason(data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('season')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error uploading season:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function getAllSeasons(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('season')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching seasons:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function updateSeason(id: string, data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('season')
      .update(data)
      .eq('season_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating season:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function deleteSeason(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('season')
      .delete()
      .eq('season_id', id);

    if (error) {
      console.error('Error deleting season:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Episode management functions
async function uploadEpisode(data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('episode')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error uploading episode:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function getAllEpisodes(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('episode')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching episodes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function updateEpisode(id: string, data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('episode')
      .update(data)
      .eq('episode_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating episode:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function deleteEpisode(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('episode')
      .delete()
      .eq('episode_id', id);

    if (error) {
      console.error('Error deleting episode:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Upcoming content functions
async function uploadUpcomingContent(data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('upcoming_content')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error uploading upcoming content:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function getAllUpcomingContent(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('upcoming_content')
      .select('*')
      .order('release_date', { ascending: true });

    if (error) {
      console.error('Error fetching upcoming content:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function updateUpcomingContent(id: string, data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('upcoming_content')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating upcoming content:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function deleteUpcomingContent(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('upcoming_content')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting upcoming content:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Content demand functions
async function getAllContentDemands(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('demand')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content demands:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

async function createContentDemand(data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('demand')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating content demand:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function updateContentDemand(id: string, data: any): Promise<any> {
  try {
    const { data: result, error } = await supabase
      .from('demand')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content demand:', error);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function deleteContentDemand(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('demand')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content demand:', error);
      throw error;
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

// Add view tracking methods to the main storage object
storage.incrementMovieViews = incrementMovieViews;
storage.incrementEpisodeViews = incrementEpisodeViews;
storage.getMovieViews = getMovieViews;
storage.getEpisodeViews = getEpisodeViews;
storage.getShowViews = getShowViews;
storage.getWebSeriesViews = getWebSeriesViews;
storage.getContentViews = getContentViews;
storage.getPlatformStats = getPlatformStats;

// Add season views method to the main storage object
storage.getSeasonViews = getSeasonViews;

export { storage };

export default {
  uploadContent,
  getAllContent,
  getAllContentByType,
  getAllContentByGenre,
  getAllContentByFeature,
  updateContent,
  deleteContent,
  uploadSeason,
  getAllSeasons,
  updateSeason,
  deleteSeason,
  uploadEpisode,
  getAllEpisodes,
  updateEpisode,
  deleteEpisode,
  uploadUpcomingContent,
  getAllUpcomingContent,
  updateUpcomingContent,
  deleteUpcomingContent,
  getAllAdvertisementRequests: getAdvertisementRequests,
  createAdvertisementRequest,
  updateAdvertisementRequest: () => { throw new Error('updateAdvertisementRequest not implemented'); },
  deleteAdvertisementRequest,
  getAllContentDemands,
  createContentDemand,
  updateContentDemand,
  deleteContentDemand,
  getMovieViews,
  getEpisodeViews,
  getShowViews,
  getWebSeriesViews,
  getContentViews,
  incrementMovieViews,
  incrementEpisodeViews,
  getPlatformStats
};