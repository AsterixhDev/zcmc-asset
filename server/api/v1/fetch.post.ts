import axios from 'axios';

export default defineEventHandler(async (event) => {
    try {
        const { url } = await readBody(event);
        
        if (!url) {
            return {
                success: false,
                error: 'URL is required'
            };
        }

        const response = await axios.get(url);
        return {
            success: true,
            data: response.data
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Failed to fetch webpage'
        };
    }
});
