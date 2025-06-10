
export default defineEventHandler(async (event) => {
    try {
        const { html } = await readBody(event);
        
        if (!html) {
            return {
                success: false,
                error: 'HTML content is required'
            };
        }

        const $ = cheerio.load(html);
        const groups: Record<string, string[]> = {};
        
        $('.course_title_text').each((_, groupElement) => {
            const groupName = $(groupElement).text().trim();
            groups[groupName] = [];

            $(groupElement)
                .closest('.row')
                .next('.lection_main_block')
                .find('tr.lection_link')
                .each((_, linkElement) => {
                    let dataLink = $(linkElement).attr('data-link');

                    // Ensure dataLink is a valid URL or relative path
                    if (dataLink && !dataLink.startsWith('http')) {
                        // Assuming BASE_URL is set in your environment variables
                        const baseUrl = (useRuntimeConfig().public.baseUrl) as string;
                        dataLink = new URL(dataLink, baseUrl).href;
                    }
                    if (dataLink) {
                        groups[groupName].push(dataLink);
                    }
                });
        });

        return {
            success: true,
            data: groups
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to parse groups'
        };
    }
});
