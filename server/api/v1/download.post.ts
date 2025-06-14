import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import axios from 'axios';
import path from 'path'
type imageData = { success: boolean,
  url:string
  name: string,
  size: number }
export default defineEventHandler(async (event) => {
    const isOnline: activityStatus = (await ping()) ? "online" : "offline";
    if (isOnline === "offline") {
        throw createError({
            statusCode: 503,
            message: 'Service is offline. Please check your internet connection.'
        });
    }

    const body = await readBody(event);
    const { groupName, lessonName, quality, images } = body;
    
    try {
        // Create a new PDF document with compression
        const pdfDoc = await PDFDocument.create();

        // Validate input
        if (!images || images.length === 0) {
            throw new Error('No images provided');
        }

        
        // Sort images by their index in filename
        const sortedImages = images.sort((a:imageData, b:imageData) => {
            const indexA = parseInt(a.name.match(/file_(\d+)/)?.[1] || '0');
            const indexB = parseInt(b.name.match(/file_(\d+)/)?.[1] || '0');
            return indexA - indexB;
        });
        
        // Process images sequentially to maintain order
        for (const imageData of sortedImages) {
            try {
                // Download image with timeout
                const response = await axios.get(imageData.url, {
                    responseType: 'arraybuffer',
                    timeout: 10000, // 10 second timeout
                });
        
                // Process image with sharp - optimize for PDF
                const qualityValue = quality === "120p" ? 32 : quality === "320p" ? 75 : 100;
                const processedImage = await sharp(response.data)
                    .jpeg({
                        quality: qualityValue,
                        progressive: true,
                        optimizeScans: true,
                    })
                    .resize(2000, undefined, { // Max width 2000px
                        withoutEnlargement: true,
                        fit: 'inside'
                    })
                    .toBuffer();
        
                // Add to PDF with optimized settings
                const image = await pdfDoc.embedJpg(processedImage);
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
        
            } catch (imageError) {
                console.error(`Error processing image: ${imageData.url}`, imageError);
            }
        }
        

        // Save PDF with compression
        const pdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
        });
        const encoder = new TextEncoder()
        
        // Set response headers
        setHeaders(event, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBytes.length,
            'Content-Disposition': `attachment; filename="${encoder.encode(groupName)}-${encoder.encode(lessonName)}.pdf"`,
            'Cache-Control': 'public, max-age=31536000'
        });

        return pdfBytes;
    } catch (error: any) {
        console.error('PDF generation error:', error);
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to generate PDF'
        });
    }
});