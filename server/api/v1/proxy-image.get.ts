import sharp from 'sharp';

export default defineEventHandler(async (event) => {
  try {
    const { "imageUrl":img, "quality":qualityValue="75", format='jpeg' } =  getQuery(event) as {imageUrl:string, quality:string,format:'jpeg'|'png'};
    const imageUrl = decodeURIComponent(img)
    const qualityNum = parseInt(qualityValue)
    const quality = isNaN(qualityNum)?1:qualityNum

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Process the image with sharp
    let processedImage = sharp(buffer);

    // Resize based on quality setting
    if (quality === 32) {
      processedImage = processedImage.resize(120, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    } else if (quality === 75) {
      processedImage = processedImage.resize(320, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    } else {
      processedImage = processedImage.resize(480, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to specified format and quality
    if (format === 'jpeg') {
      processedImage = processedImage.jpeg({ quality });
    } else if (format === 'png') {
      processedImage = processedImage.png({ quality });
    }

    const outputBuffer = await processedImage.toBuffer();

    // Set appropriate headers
    event.node.res.setHeader('Content-Type', `image/${format}`);
    
    return outputBuffer;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
});
