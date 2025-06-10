export default function<T extends Record<string, string>>(url: URL): T {
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params as T;
}