import path from 'path';
import * as fs from 'fs-extra';
import axios from 'axios';

interface ItemSelection {
    selected: boolean;
    items: Record<string, boolean>;
}

export default defineEventHandler(async (event) => {
    const { groupName, links, mode = 'preview', selections } = await readBody(event);
    
    if (!groupName || !links || !Array.isArray(links)) {
        return {
            success: false,
            error: 'Group name and links array are required'
        };
    }

    try {
        const results = [];
        const downloadFolder = mode === 'download' 
            ? path.join(process.cwd(), 'scraped', Date.now().toString(), groupName)
            : '';

        if (mode === 'download') {
            await fs.ensureDir(downloadFolder);
        }

        for (const link of links) {
            const fullLink = `${process.env.BASE_URL || ''}${link}`;
            const pageResponse = await axios.get(fullLink);
            const page$ = cheerio.load(pageResponse.data);

            const title = page$('.lection_title').text().trim();
            const materialMain = page$('.material_main a');
            
            // Skip if in download mode and item is not selected
            if (mode === 'download' && selections) {
                const groupSelection = selections[groupName] as ItemSelection;
                if (!groupSelection?.selected && !groupSelection?.items[title]) {
                    continue;
                }
            }
            
            if (materialMain.length > 0) {
                const images = [];
                const titleFolder = mode === 'download' 
                    ? path.join(downloadFolder, sanitizeFolderName(title))
                    : '';

                if (mode === 'download' && titleFolder) {
                    await fs.ensureDir(titleFolder);
                }

                for (const element of materialMain) {
                    const $element = page$(element);
                    const relativeImageUrl = $element.attr('href');
                    if (!relativeImageUrl) continue;

                    const imageUrl = resolveUrl(useRuntimeConfig().public.baseUrl || '', relativeImageUrl);
                    if (!imageUrl) continue;

                    const imageName = path.basename(imageUrl.split('?')[0]);

                    try {
                        // Get file size for both modes
                        const headResponse = await axios.head(imageUrl);
                        const size = parseInt(headResponse.headers['content-length'] || '0', 10);
                        if (mode === 'preview') {
                            images.push({
                                success: true,
                                url: imageUrl,
                                name: imageName,
                                size
                            });
                        } else {
                            const imagePath = path.join(titleFolder, imageName);
                            const imageResponse = await axios({
                                url: imageUrl,
                                method: 'GET',
                                responseType: 'stream'
                            });

                            const writer = fs.createWriteStream(imagePath);
                            imageResponse.data.pipe(writer);

                            await new Promise<void>((resolve, reject) => {
                                writer.on('finish', () => resolve());
                                writer.on('error', reject);
                            });

                            images.push({
                                success: true,
                                path: imagePath,
                                size
                            });
                        }
                    } catch (error: any) {
                        console.log(`Error processing image ${imageUrl}:`, error);
                        images.push({
                            success: false,
                            error: error.message || 'Failed to process image'
                        });
                    }
                }

                results.push({
                    title,
                    images
                });
            }
        }

        return {
            success: true,
            data: results
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to process group'
        };
    }
});
