import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

interface UploadResult {
  fileUrl: string;
  thumbnailUrl?: string;
  compressedUrl?: string;
  fileSize: number;
  originalFileName: string;
}

class StorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private cdnDomain: string;
  private useLocalStorage: boolean;

  constructor() {
    this.bucketName = process.env.AWS_S3_BUCKET || 'zariya-fmc-files';
    this.cdnDomain = process.env.CDN_DOMAIN || '';
    this.useLocalStorage = !process.env.AWS_ACCESS_KEY_ID;

    if (!this.useLocalStorage) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
    }

    // Ensure uploads directory exists for local storage fallback
    this.ensureUploadsDirectory();
  }

  private async ensureUploadsDirectory() {
    try {
      await fs.access('uploads');
    } catch {
      await fs.mkdir('uploads', { recursive: true });
      await fs.mkdir('uploads/compressed', { recursive: true });
      await fs.mkdir('uploads/thumbnails', { recursive: true });
    }
  }

  private getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  private generateUniqueFileName(originalName: string): string {
    const ext = this.getFileExtension(originalName);
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    return `${timestamp}-${uuid}${ext}`;
  }

  private async compressImage(inputBuffer: Buffer, quality: number = 80): Promise<Buffer> {
    try {
      return await sharp(inputBuffer)
        .jpeg({ quality, mozjpeg: true })
        .png({ compressionLevel: 9 })
        .webp({ quality })
        .toBuffer();
    } catch (error) {
      console.error('Image compression failed:', error);
      return inputBuffer; // Return original if compression fails
    }
  }

  private async generateImageThumbnail(inputBuffer: Buffer, width: number = 300): Promise<Buffer> {
    try {
      return await sharp(inputBuffer)
        .resize(width, null, { withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw error;
    }
  }

  private async uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // Make files publicly readable
    });

    await this.s3Client.send(command);

    // Return CDN URL if available, otherwise S3 URL
    if (this.cdnDomain) {
      return `https://${this.cdnDomain}/${key}`;
    }
    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  private async saveToLocalStorage(buffer: Buffer, filename: string, subfolder: string = ''): Promise<string> {
    const filePath = path.join('uploads', subfolder, filename);
    await fs.writeFile(filePath, buffer);
    return `/uploads/${subfolder ? subfolder + '/' : ''}${filename}`;
  }

  async uploadFile(fileBuffer: Buffer, originalFileName: string, contentType: string, requestId?: string): Promise<UploadResult> {
    const fileName = this.generateUniqueFileName(originalFileName);
    const fileKey = requestId ? `requests/${requestId}/${fileName}` : `files/${fileName}`;
    
    let fileUrl: string;
    let compressedUrl: string | undefined;
    let thumbnailUrl: string | undefined;
    let finalSize = fileBuffer.length;

    try {
      if (this.useLocalStorage) {
        // Local storage implementation
        fileUrl = await this.saveToLocalStorage(fileBuffer, fileName);

        // Handle image compression and thumbnails for local storage
        if (contentType.startsWith('image/')) {
          try {
            // Generate compressed version
            const compressedBuffer = await this.compressImage(fileBuffer);
            const compressedFileName = `compressed_${fileName}`;
            compressedUrl = await this.saveToLocalStorage(compressedBuffer, compressedFileName, 'compressed');
            finalSize = compressedBuffer.length;

            // Generate thumbnail
            const thumbnailBuffer = await this.generateImageThumbnail(fileBuffer);
            const thumbnailFileName = `thumb_${fileName}`;
            thumbnailUrl = await this.saveToLocalStorage(thumbnailBuffer, thumbnailFileName, 'thumbnails');
          } catch (error) {
            console.error('Error processing image locally:', error);
          }
        }
      } else {
        // S3 implementation
        fileUrl = await this.uploadToS3(fileBuffer, fileKey, contentType);

        // Handle image processing for S3
        if (contentType.startsWith('image/')) {
          try {
            // Upload compressed version
            const compressedBuffer = await this.compressImage(fileBuffer);
            const compressedKey = `compressed/${fileKey}`;
            compressedUrl = await this.uploadToS3(compressedBuffer, compressedKey, contentType);
            finalSize = compressedBuffer.length;

            // Upload thumbnail
            const thumbnailBuffer = await this.generateImageThumbnail(fileBuffer);
            const thumbnailKey = `thumbnails/${fileKey}`;
            thumbnailUrl = await this.uploadToS3(thumbnailBuffer, thumbnailKey, 'image/jpeg');
          } catch (error) {
            console.error('Error processing image for S3:', error);
          }
        }
      }

      return {
        fileUrl: compressedUrl || fileUrl,
        thumbnailUrl,
        compressedUrl,
        fileSize: finalSize,
        originalFileName,
      };

    } catch (error) {
      console.error('File upload failed:', error);
      throw new Error('Failed to upload file');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      if (this.useLocalStorage) {
        // Extract filename from URL and delete from local storage
        const filename = path.basename(fileUrl);
        const filePath = path.join('uploads', filename);
        await fs.unlink(filePath).catch(() => {}); // Ignore errors if file doesn't exist
        
        // Also try to delete compressed and thumbnail versions
        const compressedPath = path.join('uploads', 'compressed', `compressed_${filename}`);
        const thumbnailPath = path.join('uploads', 'thumbnails', `thumb_${filename}`);
        await fs.unlink(compressedPath).catch(() => {});
        await fs.unlink(thumbnailPath).catch(() => {});
      } else {
        // S3 implementation
        const key = fileUrl.replace(`https://${this.bucketName}.s3.amazonaws.com/`, '');
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        await this.s3Client!.send(deleteCommand);

        // Also delete compressed and thumbnail versions
        await this.s3Client!.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: `compressed/${key}`,
        })).catch(() => {});
        
        await this.s3Client!.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: `thumbnails/${key}`,
        })).catch(() => {});
      }
    } catch (error) {
      console.error('File deletion failed:', error);
      throw new Error('Failed to delete file');
    }
  }

  async generatePresignedUrl(fileUrl: string, expiresIn: number = 3600): Promise<string> {
    if (this.useLocalStorage || !this.s3Client) {
      // For local storage, return the URL as-is (files are served directly)
      return fileUrl;
    }

    try {
      const key = fileUrl.replace(`https://${this.bucketName}.s3.amazonaws.com/`, '');
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Failed to generate presigned URL:', error);
      return fileUrl; // Fallback to original URL
    }
  }

  // Utility method to get file info
  getFileInfo(fileUrl: string): { isLocal: boolean; key?: string; filename?: string } {
    if (this.useLocalStorage) {
      return {
        isLocal: true,
        filename: path.basename(fileUrl),
      };
    } else {
      const key = fileUrl.replace(`https://${this.bucketName}.s3.amazonaws.com/`, '');
      return {
        isLocal: false,
        key,
        filename: path.basename(key),
      };
    }
  }
}

export const storageService = new StorageService();