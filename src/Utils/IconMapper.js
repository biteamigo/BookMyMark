/**
 * Maps URLs to their corresponding Material Community Icons
 * Returns icon name and color for popular websites
 */

export const getIconForUrl = (url) => {
  if (!url) {
    return { name: 'bookmark', color: '#5ED5A8', library: 'Ionicons' };
  }

  const urlLower = url.toLowerCase();

  // YouTube
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return { name: 'youtube', color: '#FF0000', library: 'MaterialCommunityIcons' };
  }

  // Facebook
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) {
    return { name: 'facebook', color: '#1877F2', library: 'MaterialCommunityIcons' };
  }

  // Instagram
  if (urlLower.includes('instagram.com')) {
    return { name: 'instagram', color: '#E4405F', library: 'MaterialCommunityIcons' };
  }

  // Spotify
  if (urlLower.includes('spotify.com')) {
    return { name: 'spotify', color: '#1DB954', library: 'MaterialCommunityIcons' };
  }

  // Twitter/X
  // Check for x.com with boundaries to avoid false positives (e.g., netflix.com contains "x.com")
  if (urlLower.includes('twitter.com') || urlLower.match(/\bx\.com\b/)) {
    return { name: 'twitter', color: '#1DA1F2', library: 'MaterialCommunityIcons' };
  }

  // LinkedIn
  if (urlLower.includes('linkedin.com')) {
    return { name: 'linkedin', color: '#0A66C2', library: 'MaterialCommunityIcons' };
  }

  // Reddit
  if (urlLower.includes('reddit.com')) {
    return { name: 'reddit', color: '#FF4500', library: 'MaterialCommunityIcons' };
  }

  // GitHub
  if (urlLower.includes('github.com')) {
    return { name: 'github', color: '#181717', library: 'MaterialCommunityIcons' };
  }

  // TikTok
  if (urlLower.includes('tiktok.com')) {
    return { name: 'music-note', color: '#000000', library: 'MaterialCommunityIcons' };
  }

  // Amazon
  if (urlLower.includes('amazon.com')) {
    return { name: 'amazon', color: '#FF9900', library: 'MaterialCommunityIcons' };
  }

  // Netflix
  if (urlLower.includes('netflix.com')) {
    return { name: 'netflix', color: '#E50914', library: 'MaterialCommunityIcons' };
  }

  // Apple
  if (urlLower.includes('apple.com')) {
    return { name: 'apple', color: '#000000', library: 'MaterialCommunityIcons' };
  }

  // Google
  if (urlLower.includes('google.com')) {
    return { name: 'google', color: '#4285F4', library: 'MaterialCommunityIcons' };
  }

  // Medium
  if (urlLower.includes('medium.com')) {
    return { name: 'medium', color: '#000000', library: 'MaterialCommunityIcons' };
  }

  // Pinterest
  if (urlLower.includes('pinterest.com')) {
    return { name: 'pinterest', color: '#E60023', library: 'MaterialCommunityIcons' };
  }

  // Twitch
  if (urlLower.includes('twitch.tv')) {
    return { name: 'twitch', color: '#9146FF', library: 'MaterialCommunityIcons' };
  }

  // Default bookmark icon
  return { name: 'bookmark', color: '#5ED5A8', library: 'Ionicons' };
};
