import path from 'path';

export default defineEventHandler(async (event) => {
  const { url, mode = 'preview' } = await readBody(event);
  
  if (!url) {
    return { error: 'Missing URL parameter' };
  }

  if (mode !== 'preview' && mode !== 'download') {
    return { error: 'Invalid mode. Must be "preview" or "download"' };
  }

  const base = new URL(url).origin;
  const targetDir = mode === 'download' 
    ? path.join(process.cwd(), 'scraped', Date.now().toString())
    : '';
  
  const scraper = new WebScraper(base, targetDir);

  try {
    const result = await scraper.scrape(url, mode);
    return { success: true, data: result };
  } catch (err: any) {
    return { error: err.message || 'Scraping error' };
  }
});
