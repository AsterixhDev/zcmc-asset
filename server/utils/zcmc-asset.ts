// import axios from 'axios';
// import path from 'path';
// import * as fs from 'fs-extra';

// import type { 
//     ScrapedContent, 
//     ScraperResult, 
//     ImageDownloadResult, 
//     PreviewScraperResult,
//     ImagePreviewResult,
//     ImageInfo 
// } from '~/types';
// import cheerio from './cheerio';

// export class WebScraper {
//     private readonly baseUrl: string;
//     private readonly downloadFolder: string;

//     constructor(baseUrl: string, downloadFolder: string) {
//         this.baseUrl = baseUrl;
//         this.downloadFolder = downloadFolder;
//     }

//     public async scrape(url: string, mode: 'preview' | 'download' = 'preview'): Promise<PreviewScraperResult | ScraperResult> {
//         try {
//             const content = await this.scrapeContent(url);
//             return mode === 'preview' 
//                 ? await this.processContentPreview(content)
//                 : await this.processContentDownload(content);
//         } catch (error) {
//             throw new Error(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
//         }
//     }

//     private async scrapeContent(url: string): Promise<ScrapedContent> {
//         const response = await axios.get(url);
//         const $ = cheerio.load(response.data);
//         const groups: Record<string, string[]> = {};

//         $('.course_title_text').each((_, groupElement) => {
//             const groupName = $(groupElement).text().trim();
//             groups[groupName] = [];

//             $(groupElement)
//                 .closest('.row')
//                 .next('.lection_main_block')
//                 .find('tr.lection_link')
//                 .each((_, linkElement) => {
//                     const dataLink = $(linkElement).attr('data-link');
//                     if (dataLink) {
//                         groups[groupName].push(dataLink);
//                     }
//                 });
//         });

//         return { groups, baseUrl: this.baseUrl };
//     }

//     private async processContentPreview(content: ScrapedContent): Promise<PreviewScraperResult> {
//         const result: PreviewScraperResult = {
//             groups: {}
//         };

//         for (const [group, links] of Object.entries(content.groups)) {
//             result.groups[group] = await this.processLinksPreview(links);
//         }

//         return result;
//     }

//     private async processContentDownload(content: ScrapedContent): Promise<ScraperResult> {
//         let totalSize = 0;
//         const result: ScraperResult = {
//             downloadFolder: this.downloadFolder,
//             totalSize: 0,
//             groups: {}
//         };

//         for (const [group, links] of Object.entries(content.groups)) {
//             const groupFolder = path.join(this.downloadFolder, group);
//             await fs.ensureDir(groupFolder);
//             const groupResults = await this.processLinksDownload(links, groupFolder);
//             result.groups[group] = groupResults.results;
//             totalSize += groupResults.size;
//         }

//         result.totalSize = totalSize;
//         return result;
//     }

//     private async processLinksPreview(links: string[]): Promise<Array<{ title: string; images: ImagePreviewResult[]; }>> {
//         const results = [];

//         for (const link of links) {
//             const fullLink = `${this.baseUrl}${link}`;
//             const pageResponse = await axios.get(fullLink);
//             const page$ = cheerio.load(pageResponse.data);

//             const title = page$('.lection_title').text().trim();
//             const materialMain = page$('.material_main a');

//             if (materialMain.length > 0) {
//                 const images: ImagePreviewResult[] = [];
//                 for (const element of materialMain) {
//                     const imageResult = await this.getImageInfo(page$(element));
//                     images.push(imageResult);
//                 }

//                 results.push({ title, images });
//             }
//         }

//         return results;
//     }

//     private async processLinksDownload(
//         links: string[], 
//         groupFolder: string
//     ): Promise<{ results: Array<{ title: string; images: ImageDownloadResult[]; }>; size: number }> {
//         const results = [];
//         let totalSize = 0;

//         for (const link of links) {
//             const fullLink = `${this.baseUrl}${link}`;
//             const pageResponse = await axios.get(fullLink);
//             const page$ = cheerio.load(pageResponse.data);

//             const title = page$('.lection_title').text().trim();
//             const materialMain = page$('.material_main a');

//             if (materialMain.length > 0) {
//                 const titleFolder = path.join(groupFolder, sanitizeFolderName(title));
//                 await fs.ensureDir(titleFolder);

//                 const images: ImageDownloadResult[] = [];
//                 for (const element of materialMain) {
//                     const imageInfo = await this.getImageInfo(page$(element));
//                     if (imageInfo.success && imageInfo.url && imageInfo.size && imageInfo.name) {
//                         totalSize += imageInfo.size;
//                         const downloadInfo: ImageInfo = {
//                             url: imageInfo.url,
//                             size: imageInfo.size,
//                             name: imageInfo.name
//                         };
//                         const imageResult = await this.downloadImage(downloadInfo, titleFolder);
//                         images.push(imageResult);
//                     }
//                 }

//                 results.push({ title, images });
//             }
//         }

//         return { results, size: totalSize };
//     }

//     private async getImageInfo(element: cheerio.Cheerio<any>): Promise<ImagePreviewResult> {
//         try {
//             const relativeImageUrl = element.attr('href');
//             if (!relativeImageUrl) {
//                 throw new Error('No image URL found');
//             }

//             const imageUrl = resolveUrl(this.baseUrl, relativeImageUrl);
//             if (!imageUrl) {
//                 throw new Error('Invalid image URL');
//             }

//             const imageName = path.basename(imageUrl.split('?')[0]);
            
//             // Get the file size without downloading the full file
//             const headResponse = await axios.head(imageUrl);
//             const size = parseInt(headResponse.headers['content-length'] || '0', 10);

//             return { 
//                 success: true, 
//                 url: imageUrl, 
//                 name: imageName,
//                 size 
//             };
//         } catch (error) {
//             return {
//                 success: false,
//                 error: error instanceof Error ? error.message : 'Unknown error'
//             };
//         }
//     }

//     private async downloadImage(imageInfo: ImageInfo, titleFolder: string): Promise<ImageDownloadResult> {
//         try {
//             const imagePath = path.join(titleFolder, imageInfo.name);

//             const response = await axios({
//                 url: imageInfo.url,
//                 method: 'GET',
//                 responseType: 'stream'
//             });

//             const writer = fs.createWriteStream(imagePath);
//             response.data.pipe(writer);

//             await new Promise<void>((resolve, reject) => {
//                 writer.on('finish', () => resolve());
//                 writer.on('error', reject);
//             });

//             return { success: true, path: imagePath };
//         } catch (error) {
//             return {
//                 success: false,
//                 error: error instanceof Error ? error.message : 'Unknown error'
//             };
//         }
//     }
// }



// export default WebScraper;