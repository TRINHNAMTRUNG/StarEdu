import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { ENV } from "./environment";
import AppError from "../utils/AppError";

// Khởi tạo S3 Client duy nhất cho toàn bộ hệ thống
export const s3Client = new S3Client({
    region: ENV.AWS_S3_REGION,
    credentials: {
        accessKeyId: ENV.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY || "",
    },
});

/**
 * Upload file lên S3
 * @param key - Đường dẫn file trên S3 (ví dụ: "audios/vocabulary/word.mp3")
 * @param body - Buffer hoặc Stream của file
 * @param contentType - MIME type của file
 * @returns URL công khai của file
 */
export const uploadToS3 = async (
    key: string,
    body: Buffer | string,
    contentType: string
): Promise<string> => {
    try {
        const command = new PutObjectCommand({
            Bucket: ENV.AWS_S3_BUCKET_NAME,
            Key: key,
            Body: body,
            ContentType: contentType,
            // ACL: "public-read", // Nếu cần public access
        });

        await s3Client.send(command);

        // Trả về URL công khai
        return `https://${ENV.AWS_S3_BUCKET_NAME}.s3.${ENV.AWS_S3_REGION}.amazonaws.com/${key}`;
    } catch (error: any) {
        console.error("S3 upload error:", error);
        throw AppError.internalServerError(`Lỗi khi upload file lên S3: ${error.message}`);
    }
};

/**
 * Xóa một file từ S3
 * @param key - Đường dẫn file trên S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
    try {
        const command = new DeleteObjectCommand({
            Bucket: ENV.AWS_S3_BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`✅ Deleted S3 file: ${key}`);
    } catch (error: any) {
        console.error(`❌ Failed to delete S3 file: ${key}`, error);
        // Không throw error để tránh làm gián đoạn flow chính
    }
};

/**
 * Xóa nhiều file từ S3
 * @param keys - Mảng các đường dẫn file trên S3
 */
export const deleteManyFromS3 = async (keys: string[]): Promise<void> => {
    if (!keys || keys.length === 0) return;

    try {
        const command = new DeleteObjectsCommand({
            Bucket: ENV.AWS_S3_BUCKET_NAME,
            Delete: {
                Objects: keys.map(key => ({ Key: key })),
                Quiet: true,
            },
        });

        const result = await s3Client.send(command);
        console.log(`✅ Deleted ${keys.length} S3 files`);

        // Log các file xóa lỗi (nếu có)
        if (result.Errors && result.Errors.length > 0) {
            console.error("❌ Failed to delete some files:", result.Errors);
        }
    } catch (error: any) {
        console.error("❌ Failed to delete S3 files:", error);
    }
};

/**
 * Trích xuất S3 key từ URL
 * @param url - URL đầy đủ của file trên S3
 * @returns S3 key (đường dẫn file)
 */
export const extractS3KeyFromUrl = (url: string): string => {
    try {
        const urlObj = new URL(url);
        // Loại bỏ dấu "/" đầu tiên
        return urlObj.pathname.substring(1);
    } catch (error) {
        console.error("Invalid S3 URL:", url);
        return "";
    }
};

/**
 * Xóa file S3 từ URL
 * @param url - URL đầy đủ của file trên S3
 */
export const deleteFromS3ByUrl = async (url: string): Promise<void> => {
    const key = extractS3KeyFromUrl(url);
    if (key) {
        await deleteFromS3(key);
    }
};

/**
 * Xóa nhiều file S3 từ URL
 * @param urls - Mảng các URL đầy đủ của file trên S3
 */
export const deleteManyFromS3ByUrl = async (urls: string[]): Promise<void> => {
    const keys = urls.map(extractS3KeyFromUrl).filter(Boolean);
    await deleteManyFromS3(keys);
};
