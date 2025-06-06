export interface ScrapedGroup {
    name: string;
    links: string[];
}

export interface ScrapedContent {
    groups: Record<string, string[]>;
    baseUrl: string;
}

export interface DownloadOptions {
    baseUrl: string;
    downloadFolder: string;
}

export interface ImageDownloadResult {
    success: boolean;
    path?: string;
    error?: string;
}

export interface ImageInfo {
    url: string;
    size?: number;
    name: string;
}

export interface ImagePreviewResult {
    success: boolean;
    url?: string;
    error?: string;
    size?: number;
    name?: string;
}

export interface PreviewScraperResult {
    groups: Record<string, {
        title: string;
        images: ImagePreviewResult[];
    }[]>;
}

// Update the existing ScraperResult to include size info
export interface ScraperResult {
    downloadFolder: string;
    totalSize: number;
    groups: Record<string, {
        title: string;
        images: ImageDownloadResult[];
    }[]>;
}