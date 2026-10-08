export async function loadGiphy({ apiKey, query = '', offset = 0, signal, fetchImpl = fetch }) {
  if (!apiKey) throw new Error('Giphy search has not been configured yet.');
  const params = new URLSearchParams({ api_key: apiKey, limit: '24', offset: String(offset), rating: 'pg-13' });
  if (query) params.set('q', query);
  const response = await fetchImpl(`https://api.giphy.com/v1/gifs/${query ? 'search' : 'trending'}?${params}`, { signal });
  if (!response.ok) {
    if (response.status === 429) throw new Error('Giphy search is busy. Please try again later.');
    if (response.status === 401 || response.status === 403) throw new Error('Giphy could not accept the configured API key.');
    throw new Error('Could not load GIFs. Please try again.');
  }
  const result = await response.json();
  const gifs = (result.data || []).flatMap(gif => {
    const imageUrl = gif.images?.fixed_height?.url || gif.images?.original?.url;
    const previewUrl = gif.images?.fixed_height_small?.url || imageUrl;
    if (!gif.id || !imageUrl?.startsWith('https://') || !previewUrl?.startsWith('https://')) return [];
    return [{ id: gif.id, title: gif.title || 'GIF', imageUrl, previewUrl, sourceUrl: gif.url || 'https://giphy.com/' }];
  });
  const nextOffset = offset + (result.pagination?.count ?? result.data?.length ?? 0);
  return { gifs, nextOffset, hasMore: nextOffset > offset && nextOffset < (result.pagination?.total_count ?? 0) };
}
