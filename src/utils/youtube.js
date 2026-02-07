// YouTube API Key - get from https://console.cloud.google.com/

const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
/**
 * Check if videos are embeddable
 */
const checkEmbeddable = async (videoIds) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=status&id=${videoIds.join(
        ","
      )}&key=${YOUTUBE_API_KEY}`
    );

    const data = await response.json();

    if (data.error) {
      console.error("Error fetching video status:", data.error);
      return new Set();
    }

    const embeddableIds = new Set();
    (data.items || []).forEach((item) => {
      if (item?.status?.embeddable) embeddableIds.add(item.id);
    });

    return embeddableIds;
  } catch (error) {
    console.error("Error checking embeddable status:", error);
    return new Set();
  }
};

/**
 * ✅ NEW: raw YouTube search (NO embed filtering)
 * SongSearch.jsx expects this name
 */
export const searchYouTubeVideos = async (query) => {
  if (!query?.trim()) return [];

  if (YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY" || YOUTUBE_API_KEY === "YOUR_KEY_HERE") {
    console.error("⚠️ YouTube API key not configured! Please update src/utils/youtube.js");
    alert("YouTube API not configured. Please check SETUP.md and add your API key.");
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(
        query
      )}&type=video&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);

    const data = await response.json();

    if (data.error) {
      console.error("YouTube API error:", data.error);
      alert(`YouTube API error: ${data.error.message}`);
      return [];
    }

    return (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url,
      channelTitle: item.snippet.channelTitle,
    }));
  } catch (error) {
    console.error("Error searching YouTube:", error);
    alert("Failed to search YouTube. Check console for details.");
    return [];
  }
};

/**
 * ✅ NEW: filters a list of videos down to embeddable ones
 * SongSearch.jsx expects this name
 */
export const getEmbeddableVideos = async (videos = []) => {
  try {
    const ids = videos.map((v) => v.id).filter(Boolean);
    if (ids.length === 0) return [];

    const embeddableIds = await checkEmbeddable(ids);
    return videos.filter((v) => embeddableIds.has(v.id));
  } catch (e) {
    console.error("getEmbeddableVideos error:", e);
    // fallback: return original list so UI still works
    return videos;
  }
};

/**
 * (keep your existing function) — now it can reuse the new helpers
 * This one returns embeddable videos (like before)
 */
export const searchKaraokeVideos = async (query) => {
  const allVideos = await searchYouTubeVideos(query);
  const embeddable = await getEmbeddableVideos(allVideos);

  if (embeddable.length === 0 && allVideos.length > 0) {
    console.warn("⚠️ Could not verify embeddable status - showing all results");
    return allVideos.slice(0, 10);
  }

  return embeddable.slice(0, 10);
};

// (leave the rest of your helpers as-is)
export const getVideoDetails = async (videoId) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return {
        duration: video.contentDetails.duration,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails.high.url,
      };
    }

    return null;
  } catch (error) {
    console.error("Error getting video details:", error);
    return null;
  }
};

export const parseDuration = (duration) => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);

  const hours = (match?.[1] || "").slice(0, -1) || 0;
  const minutes = (match?.[2] || "").slice(0, -1) || 0;
  const seconds = (match?.[3] || "").slice(0, -1) || 0;

  return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
};

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};