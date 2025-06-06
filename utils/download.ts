import { PDFDocument } from "pdf-lib";

export const downloadContent = async (
  groupName: string,
  lessonName: string,
  images: string[],
  quality: "120p" | "480p" | "320p" = "320p",
  onProgress?: (progress: number) => void
) => {
  // Only run in browser
  if (process.server) {
    console.warn('Download functionality is not available during SSR');
    return;
  }

  try {
    const response = await fetch(`/api/v1/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        groupName,
        lessonName,
        images,
        quality
      })
    });

    if (!response.ok) {
      throw new Error("Failed to download content");
    }

    const contentLength = response.headers.get("Content-Length");
    if (!contentLength) {
      throw new Error("Unable to determine file size");
    }

    const total = parseInt(contentLength, 10);
    let loaded = 0;

    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader?.read()!;
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      // Calculate and report progress
      const progress = Math.round((loaded / total) * 100);
      if (onProgress) {
        onProgress(progress);
      }
    }

    // Create a single ArrayBuffer from all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Create blob from the combined buffer
    const blob = new Blob([combinedBuffer.buffer], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${groupName}-${lessonName}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading content:", error);
    throw error;
  }
};
