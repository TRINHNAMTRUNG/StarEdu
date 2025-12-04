import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "../config/environment";
import AppError from "./AppError";
import { v4 as uuidv4 } from "uuid";
import path from "path";

export enum S3Folder {
    AUDIOS_VOCABULARY = "audios/vocabulary",
    IMAGES = "images",
    VIDEOS = "videos"
}

class S3Util {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        this.s3Client = new S3Client({
            region: ENV.AWS_S3_REGION,
            credentials: {
                accessKeyId: ENV.AWS_ACCESS_KEY_ID,
                secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY
            }
        });
        this.bucketName = ENV.AWS_S3_BUCKET_NAME;
    }

    /**
     * Upload file lên S3
     * @param file - File buffer hoặc stream
     * @param folder - Folder đích (audios/images/videos)
     * @param fileName - Tên file (optional, auto gen nếu không có)
     * @returns S3 URL
     */
    async uploadFile(
        file: Buffer | Uint8Array,
        folder: S3Folder,
        fileName?: string,
        contentType?: string
    ): Promise<string> {
        try {
            const finalFileName = fileName || `${uuidv4()}${path.extname(fileName || ".jpg")}`;
            const key = `${folder}/${finalFileName}`; // ✅ Đơn giản hơn

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file,
                ContentType: contentType || this.getContentType(finalFileName),
                ACL: "public-read"
            });

            await this.s3Client.send(command);

            return `https://${this.bucketName}.s3.${ENV.AWS_S3_REGION}.amazonaws.com/${key}`;
        } catch (error: any) {
            console.error("S3 Upload Error:", error);
            throw AppError.internalServerError("Upload file lên S3 thất bại", error.message);
        }
    }

    /**
     * Upload vocabulary audio - Đơn giản hơn
     */
    async uploadVocabularyAudio(
        file: Buffer | Uint8Array,
        fileName: string,
        contentType?: string
    ): Promise<string> {
        return this.uploadFile(
            file,
            S3Folder.AUDIOS_VOCABULARY, // ✅ Dùng trực tiếp
            fileName,
            contentType || "audio/mpeg"
        );
    }

    /**
     * Upload nhiều files cùng lúc
     */
    async uploadMultipleFiles(
        files: Array<{ buffer: Buffer; fileName?: string; contentType?: string }>,
        folder: S3Folder
    ): Promise<string[]> {
        const uploadPromises = files.map(file =>
            this.uploadFile(file.buffer, folder, file.fileName, file.contentType)
        );
        return await Promise.all(uploadPromises);
    }

    /**
     * Xóa 1 file khỏi S3
     * @param fileUrl - URL đầy đủ hoặc key
     */
    async deleteFile(fileUrl: string): Promise<void> {
        try {
            const key = this.extractKeyFromUrl(fileUrl);

            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            await this.s3Client.send(command);
            console.log(`✅ Deleted file from S3: ${key}`);
        } catch (error: any) {
            console.error("❌ S3 Delete Error:", error);
            // KHÔNG throw error để không block delete DB
        }
    }

    /**
     * Xóa nhiều files cùng lúc (batch delete)
     * @param fileUrls - Array URLs hoặc keys
     */
    async deleteMultipleFiles(fileUrls: string[]): Promise<void> {
        if (!fileUrls || fileUrls.length === 0) return;

        try {
            const keys = fileUrls.map(url => this.extractKeyFromUrl(url));

            // S3 cho phép delete tối đa 1000 objects/request
            const batchSize = 1000;
            for (let i = 0; i < keys.length; i += batchSize) {
                const batch = keys.slice(i, i + batchSize);

                const command = new DeleteObjectsCommand({
                    Bucket: this.bucketName,
                    Delete: {
                        Objects: batch.map(key => ({ Key: key })),
                        Quiet: true
                    }
                });

                await this.s3Client.send(command);
            }

            console.log(`✅ Deleted ${keys.length} files from S3`);
        } catch (error: any) {
            console.error("❌ S3 Batch Delete Error:", error);
            // KHÔNG throw error
        }
    }

    /**
     * Generate pre-signed URL (cho upload trực tiếp từ client)
     */
    async generatePresignedUploadUrl(
        folder: S3Folder,
        fileName: string,
        expiresIn: number = 900
    ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
        try {
            const key = `${folder}/${fileName}`; // ✅ Đơn giản

            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                ContentType: this.getContentType(fileName)
            });

            const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
            const fileUrl = `https://${this.bucketName}.s3.${ENV.AWS_S3_REGION}.amazonaws.com/${key}`;

            return { uploadUrl, fileUrl, key };
        } catch (error: any) {
            console.error("❌ Generate Presigned URL Error:", error);
            throw AppError.internalServerError("Tạo URL upload thất bại", error.message);
        }
    }

    /**
     * Generate presigned URL cho vocabulary audio
     */
    async generatePresignedVocabularyAudioUrl(
        fileName: string,
        expiresIn: number = 900
    ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
        return this.generatePresignedUploadUrl(
            S3Folder.AUDIOS_VOCABULARY, // ✅ Dùng trực tiếp
            fileName,
            expiresIn
        );
    }

    /**
     * Generate pre-signed URL cho download (file private)
     */
    async generatePresignedDownloadUrl(
        fileUrl: string,
        expiresIn: number = 3600
    ): Promise<string> {
        try {
            const key = this.extractKeyFromUrl(fileUrl);

            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key
            });

            return await getSignedUrl(this.s3Client, command, { expiresIn });
        } catch (error: any) {
            console.error("❌ Generate Download URL Error:", error);
            throw AppError.internalServerError("Tạo URL download thất bại", error.message);
        }
    }

    /**
     * Extract S3 key từ URL
     * @param url - Full URL hoặc key
     * @returns S3 key (e.g., "images/abc.jpg")
     */
    private extractKeyFromUrl(url: string): string {
        if (url.startsWith("http")) {
            const urlObj = new URL(url);
            return urlObj.pathname.substring(1); // Bỏ dấu '/' đầu
        }
        return url; // Đã là key
    }

    /**
     * Determine content type từ file extension
     */
    private getContentType(fileName: string): string {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes: Record<string, string> = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".avi": "video/x-msvideo",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".pdf": "application/pdf"
        };
        return mimeTypes[ext] || "application/octet-stream";
    }

    /**
     * Validate file type
     */
    validateFileType(fileName: string, allowedTypes: string[]): boolean {
        const ext = path.extname(fileName).toLowerCase();
        return allowedTypes.includes(ext);
    }

    /**
     * Validate file size
     */
    validateFileSize(fileSize: number, maxSizeMB: number): boolean {
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        return fileSize <= maxSizeBytes;
    }
}

// Export singleton instance
export const s3Util = new S3Util();
export default s3Util;
