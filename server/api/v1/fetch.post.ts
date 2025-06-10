import axios, { AxiosResponse } from 'axios';

export default defineEventHandler(async (event) => {
    try {
        const { url } = await readBody(event);
        
        if (!url) {
            return {
                success: false,
                error: 'URL is required'
            };
        }

        const {id} = parseUrlQuery<{id:string}>(new URL(url))
        const response = await useCache<AxiosResponse<any, any>>(id,async ()=>await axios.get(url), 0.10);
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
