export default async function(url = 'https://www.google.com', timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}