import { PDFDocument, rgb } from "pdf-lib";

export default async function (
  imageUrls: string[],
  quality:'120p'|'480p'|'320p'='320p',
) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  for (const imageUrl of imageUrls) {
    try {
      // Fetch the image as a binary array
      const response = await $fetch("/api/v1/proxy-image", {
        responseType: "arrayBuffer",
        params: {
          imageUrl,
          quality:quality==='120p'?32:quality==='320p'?75:100,
          format:"jpeg",
        },
      });
      const imageBytes = new Uint8Array(
        response instanceof ArrayBuffer ? response : Buffer.from(response as any).buffer
      );

      // Embed the image into the PDF
      const image = await pdfDoc.embedJpg(imageBytes)
      // Add a new page to the PDF with the image dimensions
      const page = pdfDoc.addPage([image.width, image.height]);

      // Draw the image on the page
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    } catch (error) {
      console.error(`Failed to process image: ${imageUrl}`, error);
    }
  }

  // Serialize the PDF to bytes
  const pdfBytes = await pdfDoc.save();

  // Write the PDF to a file
  //   fs.writeFileSync(outputFilePath, pdfBytes);
  return pdfBytes;
};
