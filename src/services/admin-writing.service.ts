import { injectable } from "tsyringe";
import WritingPromptModel, { WritingPromptType } from "../models/writingPrompt.model";
import AppError from "../utils/AppError";
import s3Util, { S3Folder } from "../utils/s3.util";
import { CreateWritingPromptReqDto, UpdateWritingPromptReqDto } from "../dtos/request/writing.request.dto";

// Note: Create/Update DTO file created below (request for admin prompts)
@injectable()
class AdminWritingService {
    async createPrompt(dto: any, adminId: string, imageFile?: Express.Multer.File) {
        let imageUrl: string | undefined;
        if (dto.type === WritingPromptType.IMAGE) {
            if (!imageFile) throw AppError.badRequestError("Đề image writing phải có file ảnh");
            const allowed = [".jpg", ".jpeg", ".png", ".webp"];
            if (!s3Util.validateFileType(imageFile.originalname, allowed)) throw AppError.badRequestError("Ảnh không hợp lệ");
            if (!s3Util.validateFileSize(imageFile.size, 5)) throw AppError.badRequestError("Ảnh vượt quá 5MB");
            imageUrl = await s3Util.uploadFile(imageFile.buffer, S3Folder.IMAGES, `writing-prompt-${Date.now()}-${imageFile.originalname}`, imageFile.mimetype);
        }

        const prompt = await WritingPromptModel.create({
            type: dto.type,
            required_words: dto.required_words,
            image_url: imageUrl,
            created_by: adminId
        });

        return { ...prompt.toObject(), _id: prompt._id.toString(), created_by: prompt.created_by.toString() };
    }

    async updatePrompt(id: string, dto: any, imageFile?: Express.Multer.File) {
        const prompt = await WritingPromptModel.findById(id);
        if (!prompt) throw AppError.notFoundError("Prompt không tồn tại");

        if (imageFile) {
            if (prompt.type !== WritingPromptType.IMAGE) throw AppError.badRequestError("Chỉ prompt image mới upload ảnh");
            const allowed = [".jpg", ".jpeg", ".png", ".webp"];
            if (!s3Util.validateFileType(imageFile.originalname, allowed)) throw AppError.badRequestError("Ảnh không hợp lệ");
            const newUrl = await s3Util.uploadFile(imageFile.buffer, S3Folder.IMAGES, `writing-prompt-${Date.now()}-${imageFile.originalname}`, imageFile.mimetype);
            if (prompt.image_url) await s3Util.deleteFile(prompt.image_url);
            (prompt as any).image_url = newUrl;
        }

        if (dto.remove_image && prompt.image_url) {
            await s3Util.deleteFile(prompt.image_url);
            (prompt as any).image_url = undefined;
        }

        if (dto.required_words) prompt.required_words = dto.required_words;
        if (typeof dto.type === "string") prompt.type = dto.type;

        await prompt.save();
        return { ...prompt.toObject(), _id: prompt._id.toString(), created_by: (prompt as any).created_by?.toString?.() };
    }

    async deletePrompt(id: string) {
        const prompt = await WritingPromptModel.findById(id);
        if (!prompt) throw AppError.notFoundError("Prompt không tồn tại");
        let deletedImage = false;
        if (prompt.image_url) {
            await s3Util.deleteFile(prompt.image_url);
            deletedImage = true;
        }
        await WritingPromptModel.findByIdAndDelete(id);
        return { message: "Xóa prompt thành công", deleted_id: id, deleted_image: deletedImage };
    }

    async getRandomPrompt(type: WritingPromptType) {
        const items = await WritingPromptModel.aggregate([{ $match: { type, /* only active prompts can be added if needed */ } }, { $sample: { size: 1 } }]);
        if (!items.length) throw AppError.notFoundError("Không có đề phù hợp");
        const p = items[0];
        // increment usage_count optional (not included in minimal schema)
        await WritingPromptModel.findByIdAndUpdate(p._id, { $inc: { usage_count: 1 } }).catch(() => { });
        return {
            _id: p._id.toString(),
            type: p.type,
            required_words: p.required_words,
            image_url: p.image_url
        };
    }

    // Internal: return minimal prompt data for processing by WritingController/Service
    async getPromptForProcessing(promptId: string) {
        const prompt = await WritingPromptModel.findById(promptId).lean();
        if (!prompt) throw AppError.notFoundError("Prompt không tồn tại");
        return {
            _id: prompt._id.toString(),
            type: prompt.type,
            required_words: prompt.required_words,
            image_url: prompt.image_url
        };
    }

    async getAllPrompts() {
        const prompts = await WritingPromptModel.find().sort({ createdAt: -1 }).lean();
        return prompts.map(p => ({
            _id: p._id.toString(),
            type: p.type,
            required_words: p.required_words,
            image_url: p.image_url,
            created_by: p.created_by?.toString(),
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
        }));
    }
}

export default AdminWritingService;
