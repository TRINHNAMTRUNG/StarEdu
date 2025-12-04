import { injectable } from "tsyringe";
import AppError from "../utils/AppError";
import ImageWritingQuestionModel, { 
    IImageWritingQuestion, 
    ImageWritingDifficulty, 
    ImageWritingCategory 
} from "../models/ImageWritingQuestion.model";
import { 
    CreateImageQuestionReqDto, 
    GetImageQuestionReqDto, 
    UpdateImageQuestionReqDto,
    AnalyzeImageReqDto
} from "../dtos/request/imageWriting.request.dto";
import s3Util, { S3Folder } from "../utils/s3.util";
import { ENV } from "../config/environment";
import axios from "axios";

@injectable()
class ImageWritingService {
    private s3Util = s3Util;

    constructor() {
        // S3Util is singleton instance, no need to instantiate
    }

    /**
     * Upload ảnh lên S3
     */
    async uploadImage(file: Express.Multer.File): Promise<{
        image_url: string;
        file_name: string;
        file_size: number;
    }> {
        if (!file) {
            throw AppError.badRequestError("File ảnh là bắt buộc");
        }

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.mimetype)) {
            throw AppError.badRequestError("Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP)");
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw AppError.badRequestError("Kích thước ảnh không được vượt quá 5MB");
        }

        try {
            // Sanitize filename: replace spaces and special chars with underscores
            const sanitizedName = file.originalname
                .replace(/\s+/g, '_')  // Replace spaces with underscore
                .replace(/[^a-zA-Z0-9._-]/g, '_');  // Replace special chars
            
            // Upload to S3
            const imageUrl = await this.s3Util.uploadFile(
                file.buffer,
                S3Folder.IMAGES,
                `writing_${Date.now()}_${sanitizedName}`,
                file.mimetype
            );

            return {
                image_url: imageUrl,
                file_name: file.originalname,
                file_size: file.size
            };
        } catch (error: any) {
            console.error("Error uploading image to S3:", error);
            throw AppError.internalServerError("Lỗi khi upload ảnh lên S3");
        }
    }

    /**
     * Phân tích ảnh bằng OpenAI GPT-4o Vision
     * Sử dụng S3 public URL (không cần download)
     */
    async analyzeImageWithGemini(dto: AnalyzeImageReqDto): Promise<{
        image_url: string;
        image_description: string;
        suggested_category: string;
        suggested_words: string[];
    }> {
        const OPENAI_API_KEY = ENV.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            throw AppError.internalServerError("Thiếu OPENAI_API_KEY trong cấu hình");
        }

        try {
            console.log("🤖 Calling OpenAI GPT-4o Vision for image analysis...");

            // Call OpenAI Vision API - Truyền trực tiếp URL (không cần download)
            const openaiResponse = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: `Analyze this image for a TOEIC Writing exercise. Please provide:

1. **Detailed Description** (50-100 words): Describe what you see in the image clearly and objectively. Focus on:
   - Main subjects (people, objects, places)
   - Actions or activities happening
   - Setting/environment
   - Important details

2. **Suggested Category**: Choose ONE from: people, places, objects, activities, nature, technology, business, education

3. **Suggested Words** (2 words): Suggest 2 important English words that would be useful for describing this image. Choose words that are:
   - Relevant to the main content
   - Intermediate level (B1-B2)
   - Can be used in a natural sentence

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "description": "detailed description here",
  "category": "category_name",
  "suggested_words": ["word1", "word2"]
}`
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: dto.image_url,
                                        detail: "low" // Low cost, enough for description
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.7
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENAI_API_KEY}`
                    },
                    timeout: 30000
                }
            );

            const responseText = openaiResponse.data.choices[0].message.content;
            console.log("✅ OpenAI response:", responseText);

            // Parse JSON response
            let analysisResult;
            try {
                // Remove markdown code blocks if present
                const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                analysisResult = JSON.parse(cleanedText);
            } catch (parseError) {
                console.error("Failed to parse OpenAI response:", responseText);
                throw AppError.internalServerError("AI trả về format không hợp lệ");
            }

            return {
                image_url: dto.image_url,
                image_description: analysisResult.description,
                suggested_category: analysisResult.category,
                suggested_words: analysisResult.suggested_words || []
            };

        } catch (error: any) {
            console.error("❌ Error in analyzeImageWithGemini:", error.response?.data || error.message);

            if (error.response?.status === 400) {
                throw AppError.badRequestError("URL ảnh không hợp lệ hoặc không thể tải xuống");
            }

            if (error.response?.status === 401) {
                throw AppError.internalServerError("OpenAI API key không hợp lệ");
            }

            throw AppError.internalServerError(
                `Lỗi khi phân tích ảnh: ${error.message}`
            );
        }
    }

    /**
     * Tạo đề bài Image Writing mới
     */
    async createImageQuestion(
        dto: CreateImageQuestionReqDto,
        adminId: string
    ): Promise<IImageWritingQuestion> {
        // Validate required_words
        if (dto.required_words.length !== 2) {
            throw AppError.badRequestError("Required words phải có đúng 2 từ");
        }

        try {
            const question = await ImageWritingQuestionModel.create({
                image_url: dto.image_url,
                image_description: dto.image_description,
                required_words: dto.required_words.map(w => w.trim().toLowerCase()),
                difficulty: dto.difficulty || ImageWritingDifficulty.MEDIUM,
                category: dto.category || ImageWritingCategory.OTHER,
                hint: dto.hint,
                sample_answer: dto.sample_answer,
                createdBy: adminId,
                isActive: true,
                usageCount: 0
            });

            return question;
        } catch (error: any) {
            console.error("Error creating image question:", error);
            throw AppError.internalServerError("Lỗi khi tạo đề bài");
        }
    }

    /**
     * Lấy danh sách đề bài (Admin)
     */
    async getImageQuestions(
        page: number = 1,
        limit: number = 20,
        difficulty?: ImageWritingDifficulty,
        category?: ImageWritingCategory
    ): Promise<{
        questions: IImageWritingQuestion[];
        total: number;
        page: number;
        limit: number;
    }> {
        const filter: any = {};
        if (difficulty) filter.difficulty = difficulty;
        if (category) filter.category = category;

        const skip = (page - 1) * limit;

        const [questions, total] = await Promise.all([
            ImageWritingQuestionModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ImageWritingQuestionModel.countDocuments(filter)
        ]);

        return {
            questions: questions as any,
            total,
            page,
            limit
        };
    }

    /**
     * Lấy 1 đề bài ngẫu nhiên (Student)
     */
    async getRandomQuestion(dto: GetImageQuestionReqDto): Promise<IImageWritingQuestion> {
        const filter: any = { isActive: true };
        if (dto.difficulty) filter.difficulty = dto.difficulty;
        if (dto.category) filter.category = dto.category;

        // Count total matching questions
        const count = await ImageWritingQuestionModel.countDocuments(filter);
        if (count === 0) {
            throw AppError.notFoundError("Không tìm thấy đề bài phù hợp");
        }

        // Get random question
        const random = Math.floor(Math.random() * count);
        const question = await ImageWritingQuestionModel.findOne(filter)
            .skip(random)
            .lean();

        if (!question) {
            throw AppError.notFoundError("Không tìm thấy đề bài");
        }

        // Increment usage count
        await ImageWritingQuestionModel.updateOne(
            { _id: question._id },
            { $inc: { usageCount: 1 } }
        );

        return question as any;
    }

    /**
     * Lấy đề bài theo ID
     */
    async getQuestionById(questionId: string): Promise<IImageWritingQuestion> {
        const question = await ImageWritingQuestionModel.findById(questionId).lean();
        if (!question) {
            throw AppError.notFoundError("Không tìm thấy đề bài");
        }
        return question as any;
    }

    /**
     * Cập nhật đề bài
     */
    async updateQuestion(
        questionId: string,
        dto: UpdateImageQuestionReqDto
    ): Promise<IImageWritingQuestion> {
        const question = await ImageWritingQuestionModel.findByIdAndUpdate(
            questionId,
            { $set: dto },
            { new: true, runValidators: true }
        ).lean();

        if (!question) {
            throw AppError.notFoundError("Không tìm thấy đề bài");
        }

        return question as any;
    }

    /**
     * Xóa đề bài (soft delete)
     */
    async deleteQuestion(questionId: string): Promise<void> {
        const question = await ImageWritingQuestionModel.findByIdAndUpdate(
            questionId,
            { isActive: false },
            { new: true }
        );

        if (!question) {
            throw AppError.notFoundError("Không tìm thấy đề bài");
        }
    }
}

export default ImageWritingService;
