import { getIconForUrl } from '../IconMapper';

describe('IconMapper', () => {
  describe('Social Media Platforms', () => {
    it('returns YouTube icon for youtube.com URLs', () => {
      const result = getIconForUrl('https://www.youtube.com/watch?v=123');
      expect(result.name).toBe('youtube');
      expect(result.color).toBe('#FF0000');
      expect(result.library).toBe('MaterialCommunityIcons');
    });

    it('returns YouTube icon for youtu.be URLs', () => {
      const result = getIconForUrl('https://youtu.be/123');
      expect(result.name).toBe('youtube');
    });

    it('returns Facebook icon for facebook.com URLs', () => {
      const result = getIconForUrl('https://facebook.com/page');
      expect(result.name).toBe('facebook');
      expect(result.color).toBe('#1877F2');
    });

    it('returns Instagram icon for instagram.com URLs', () => {
      const result = getIconForUrl('https://instagram.com/user');
      expect(result.name).toBe('instagram');
      expect(result.color).toBe('#E4405F');
    });

    it('returns Twitter icon for twitter.com URLs', () => {
      const result = getIconForUrl('https://twitter.com/user');
      expect(result.name).toBe('twitter');
      expect(result.color).toBe('#1DA1F2');
    });

    it('returns Twitter icon for x.com URLs', () => {
      const result = getIconForUrl('https://x.com/user');
      expect(result.name).toBe('twitter');
    });

    it('returns LinkedIn icon for linkedin.com URLs', () => {
      const result = getIconForUrl('https://linkedin.com/in/user');
      expect(result.name).toBe('linkedin');
      expect(result.color).toBe('#0A66C2');
    });

    it('returns Reddit icon for reddit.com URLs', () => {
      const result = getIconForUrl('https://reddit.com/r/coding');
      expect(result.name).toBe('reddit');
      expect(result.color).toBe('#FF4500');
    });

    it('returns TikTok icon for tiktok.com URLs', () => {
      const result = getIconForUrl('https://tiktok.com/@user');
      expect(result.name).toBe('music-note');
      expect(result.color).toBe('#000000');
    });
  });

  describe('Tech & Development', () => {
    it('returns GitHub icon for github.com URLs', () => {
      const result = getIconForUrl('https://github.com/user/repo');
      expect(result.name).toBe('github');
      expect(result.color).toBe('#181717');
    });

    it('returns Medium icon for medium.com URLs', () => {
      const result = getIconForUrl('https://medium.com/@user/article');
      expect(result.name).toBe('medium');
      expect(result.color).toBe('#000000');
    });
  });

  describe('Entertainment & Media', () => {
    it('returns Spotify icon for spotify.com URLs', () => {
      const result = getIconForUrl('https://open.spotify.com/playlist/123');
      expect(result.name).toBe('spotify');
      expect(result.color).toBe('#1DB954');
    });

    it('returns Netflix icon for netflix.com URLs', () => {
      const result = getIconForUrl('https://netflix.com/watch/123');
      expect(result.name).toBe('netflix');
      expect(result.color).toBe('#E50914');
    });

    it('returns Twitch icon for twitch.tv URLs', () => {
      const result = getIconForUrl('https://twitch.tv/streamer');
      expect(result.name).toBe('twitch');
      expect(result.color).toBe('#9146FF');
    });

    it('returns Pinterest icon for pinterest.com URLs', () => {
      const result = getIconForUrl('https://pinterest.com/pin/123');
      expect(result.name).toBe('pinterest');
      expect(result.color).toBe('#E60023');
    });
  });

  describe('E-commerce & Services', () => {
    it('returns Amazon icon for amazon.com URLs', () => {
      const result = getIconForUrl('https://amazon.com/product/123');
      expect(result.name).toBe('amazon');
      expect(result.color).toBe('#FF9900');
    });

    it('returns Apple icon for apple.com URLs', () => {
      const result = getIconForUrl('https://apple.com/iphone');
      expect(result.name).toBe('apple');
      expect(result.color).toBe('#000000');
    });

    it('returns Google icon for google.com URLs', () => {
      const result = getIconForUrl('https://google.com/search?q=test');
      expect(result.name).toBe('google');
      expect(result.color).toBe('#4285F4');
    });
  });

  describe('Edge Cases', () => {
    it('returns default bookmark icon for unknown URLs', () => {
      const result = getIconForUrl('https://example.com');
      expect(result.name).toBe('bookmark');
      expect(result.color).toBe('#5ED5A8');
      expect(result.library).toBe('Ionicons');
    });

    it('returns default icon for empty URL', () => {
      const result = getIconForUrl('');
      expect(result.name).toBe('bookmark');
      expect(result.library).toBe('Ionicons');
    });

    it('returns default icon for null URL', () => {
      const result = getIconForUrl(null);
      expect(result.name).toBe('bookmark');
    });

    it('handles case-insensitive matching', () => {
      const result = getIconForUrl('HTTPS://YOUTUBE.COM/WATCH');
      expect(result.name).toBe('youtube');
    });

    it('handles URLs without protocol', () => {
      const result = getIconForUrl('youtube.com/watch');
      expect(result.name).toBe('youtube');
    });
  });
});
