import path from 'path';
import fs from 'fs-extra';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import axios from 'axios';



export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { groupName, lessonName, quality, images } = body;
    
    try {
        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();

        // Instead of reading from folder, process the images directly from request
        if (!images || images.length === 0) {
            throw new Error('No images provided');
        }

        for (const imageUrl of images) {
            try {
                // Download image
                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer'
                });

                // Process image with sharp
                const qualityValue = quality === "120p" ? 32 : quality === "320p" ? 75 : 100;
                const processedImage = await sharp(response.data)
                    .jpeg({ quality: qualityValue })
                    .toBuffer();

                // Add to PDF
                const image = await pdfDoc.embedJpg(processedImage);
                const page = pdfDoc.addPage([image.width, image.height]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: image.width,
                    height: image.height,
                });
            } catch (imageError) {
                console.error('Error processing image:', imageError);
                // Continue with next image instead of failing completely
                continue;
            }
        }

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        
        // Set response headers
        setHeaders(event, {
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBytes.length,
            'Content-Disposition': `attachment; filename="${groupName}-${lessonName}.pdf"`
        });

        // Return PDF bytes for streaming
        return pdfBytes;
    } catch (error: any) {
        console.error('PDF generation error:', error);
        throw createError({
            statusCode: 500,
            message: error.message || 'Failed to generate PDF'
        });
    }
});
