export default function sanitizeFolderName(name: string): string {
    return name.replace(/[<>():"/\\|?*]/g, '').trim();
}