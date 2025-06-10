/**
 * Extracts parameters from a URL based on a pattern
 * @param url The full URL to parse
 * @param pattern The URL pattern with :param placeholders (e.g., /web/lection/:id/show_lection)
 * @returns Object with extracted parameters or null if pattern doesn't match
 */
export default function parseUrlParams<T extends Record<string, string> >(url: string, pattern: string): T {
    try {
        const urlObject = new URL(url);
        const urlPath = urlObject.pathname;
        
        // Convert pattern to segments and find parameter names
        const patternSegments = pattern.split('/').filter(Boolean);
        const urlSegments = urlPath.split('/').filter(Boolean);

        // Check if segments length matches
        if (patternSegments.length !== urlSegments.length) {
            return {} as T;
        }

        const params: Record<string, string> = {};

        // Match segments and extract parameters
        for (let i = 0; i < patternSegments.length; i++) {
            const patternSegment = patternSegments[i];
            const urlSegment = urlSegments[i];

            // If segment is a parameter (starts with :)
            if (patternSegment.startsWith(':')) {
                const paramName = patternSegment.slice(1);
                params[paramName] = urlSegment;
            }
            // If segment is static, check if it matches
            else if (patternSegment !== urlSegment) {
                return {} as T;
            }
        }

        return params as T;
    } catch (error) {
        console.error('Error parsing URL:', error);
        return {} as T;
    }
}