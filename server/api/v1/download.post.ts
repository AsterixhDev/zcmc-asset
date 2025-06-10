import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import axios from 'axios';

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

        // Process images in smaller batches to manage memory
        const BATCH_SIZE = 5;
        for (let i = 0; i < images.length; i += BATCH_SIZE) {
            const batch = images.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (imageUrl: string) => {
                try {
                    // Download image with timeout
                    const response = await axios.get(imageUrl, {
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

                    // Clean up (no manual buffer length reset needed)
                } catch (imageError) {
                    console.error(`Error processing image: ${imageUrl}`, imageError);
                }
            }));
        }

        // Save PDF with compression
        const pdfBytes = await pdfDoc.save({
            useObjectStreams: true,
            addDefaultPage: false,
        });
        
        // Set response headers
        setHeaders(event, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBytes.length,
            'Content-Disposition': `attachment; filename="${groupName}-${lessonName}.pdf"`,
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