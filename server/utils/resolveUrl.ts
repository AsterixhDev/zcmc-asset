export default function resolveUrl(base: string, relative: string): string | null {
    try {
        return new URL(relative, base).href;
    } catch (error) {
        console.error('Error resolving URL:', error);
        return null;
    }
}