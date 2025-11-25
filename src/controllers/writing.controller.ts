import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    SuggestCollocationsResDto,
    CheckWritingResDto,
    GenerateEmailPromptResDto,
    SuggestEmailKeywordsResDto,
    CheckEmailWritingResDto
} from "../dtos/response/writing.response";
import {
    SuggestTextCollocationsReqDto,
    CheckTextWritingReqDto,
    SuggestImageCollocationsReqDto,
    CheckImageWritingReqDto,
    GenerateEmailPromptReqDto,
    SuggestEmailKeywordsReqDto,
    CheckEmailWritingReqDto
} from "../dtos/request/writing.request.dto";
import ResponseFormat from "../utils/ResponseFormat";
import WritingService from "../services/writing.service";

@injectable()
class WritingController {
    constructor(private readonly writingService: WritingService) { }

    /**
     * ========================================
     * TÍNH NĂNG 1: TEXT WRITING (VIẾT CÂU VỚI 2 TỪ CHO TRƯỚC)
     * ========================================
     */

    /**
     * API 1.1: POST /api/writing/text-writing/suggest-collocations
     * Gợi ý 5 collocation dựa vào 2 từ cho trước
     * 
     * Request Body:
     * {
     *   "required_words": ["accept", "so"],
     *   "context": "formal"  // Optional
     * }
     * 
     * Response:
     * {
     *   "suggestions": [
     *     {
     *       "collocation": "accept the offer",
     *       "meaning": "chấp nhận lời đề nghị",
     *       "example": "I decided to accept the offer."
     *     },
     *     ... (4 gợi ý nữa)
     *   ],
     *   "required_words": ["accept", "so"],
     *   "note": "Các collocation này phù hợp với ngữ cảnh formal"
     * }
     */
    suggestTextCollocations = asyncHandler(async (req: Request, res: Response) => {
        const dto: SuggestTextCollocationsReqDto = req.body;

        // Gọi service để lấy gợi ý
        const result = await this.writingService.suggestTextCollocations(dto);

        // Transform response theo DTO
        const response = instanceToPlain(
            plainToInstance(SuggestCollocationsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Gợi ý collocation thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * API 1.2: POST /api/writing/text-writing/check-sentence
     * Chấm bài viết câu (dựa vào 2 từ, KHÔNG có hình ảnh)
     * 
     * Request Body:
     * {
     *   "sentence": "she didn't accept the offer, so the manager had to find anort candledates",
     *   "required_words": ["accept", "so"],
     *   "context": "formal"  // Optional
     * }
     * 
     * Response:
     * {
     *   "meaning": { ... },
     *   "grammar": { ... },
     *   "vocabulary": { ... },
     *   "correction": { ... },
     *   "overall_score": 70,
     *   "feedback_summary": "Câu có cấu trúc tốt và sử dụng đúng 2 từ vựng..."
     * }
     */
    checkTextWriting = asyncHandler(async (req: Request, res: Response) => {
        const dto: CheckTextWritingReqDto = req.body;

        // Gọi service để chấm bài
        const result = await this.writingService.checkTextWriting(dto);

        // Transform response theo DTO
        const response = instanceToPlain(
            plainToInstance(CheckWritingResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Chấm bài thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * ========================================
     * TÍNH NĂNG 2: IMAGE WRITING (QUAN SÁT ẢNH + VIẾT CÂU VỚI 2 TỪ)
     * ========================================
     */

    /**
     * API 2.1: POST /api/writing/image-writing/suggest-collocations
     * Gợi ý 5 collocation dựa vào HÌNH ẢNH + 2 từ
     * 
     * Request Body:
     * {
     *   "image_url": "https://s3.amazonaws.com/bucket/image.jpg",
     *   "required_words": ["backpack", "across"],
     *   "context": "descriptive"  // Optional
     * }
     * 
     * Response:
     * {
     *   "suggestions": [
     *     {
     *       "collocation": "wearing a backpack",
     *       "meaning": "đeo ba lô",
     *       "example": "A man wearing a black backpack is walking across the bridge."
     *     },
     *     ... (4 gợi ý nữa)
     *   ],
     *   "required_words": ["backpack", "across"],
     *   "note": "Các collocation này phù hợp với nội dung hình ảnh"
     * }
     */
    suggestImageCollocations = asyncHandler(async (req: Request, res: Response) => {
        const dto: SuggestImageCollocationsReqDto = req.body;

        // Gọi service để lấy gợi ý (có xem xét hình ảnh)
        const result = await this.writingService.suggestImageCollocations(dto);

        // Transform response theo DTO
        const response = instanceToPlain(
            plainToInstance(SuggestCollocationsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Gợi ý collocation dựa vào hình ảnh thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * API 2.2: POST /api/writing/image-writing/check-sentence
     * Chấm bài viết câu (dựa vào HÌNH ẢNH + 2 từ)
     * 
     * Request Body:
     * {
     *   "sentence": "backpack is note across on the bright",
     *   "image_url": "https://s3.amazonaws.com/bucket/image.jpg",
     *   "required_words": ["backpack", "across"],
     *   "context": "descriptive"  // Optional
     * }
     * 
     * Response:
     * {
     *   "meaning": {
     *     "is_correct": false,
     *     "explanation": "Câu không có nghĩa rõ ràng...",
     *     "image_relevance": "Câu không mô tả đúng nội dung hình ảnh..."  // ⭐ THÊM CHO IMAGE WRITING
     *   },
     *   "grammar": { ... },
     *   "vocabulary": { ... },
     *   "correction": { ... },
     *   "overall_score": 35,
     *   "feedback_summary": "Câu cần cải thiện nhiều về ngữ pháp và phù hợp với hình ảnh..."
     * }
     */
    checkImageWriting = asyncHandler(async (req: Request, res: Response) => {
        const dto: CheckImageWritingReqDto = req.body;

        // Gọi service để chấm bài (có xem xét hình ảnh)
        const result = await this.writingService.checkImageWriting(dto);

        // Transform response theo DTO
        const response = instanceToPlain(
            plainToInstance(CheckWritingResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Chấm bài dựa vào hình ảnh thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * ========================================
     * TÍNH NĂNG 3: EMAIL WRITING (VIẾT EMAIL ĐÁP ỨNG ĐỀ TÀI TOEIC)
     * ========================================
     */

    /**
     * API 3.1: Generate TOEIC-style email prompt
     */
    generateEmailPrompt = asyncHandler(async (req: Request, res: Response) => {
        // no input required
        const result = await this.writingService.generateEmailPrompt();

        const response = instanceToPlain(
            plainToInstance(GenerateEmailPromptResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Tạo đề email thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * API 3.2: Suggest 5 keywords for replying to the prompt_email
     */
    suggestEmailKeywords = asyncHandler(async (req: Request, res: Response) => {
        const dto: SuggestEmailKeywordsReqDto = req.body;
        const result = await this.writingService.suggestEmailKeywords(dto);

        const response = instanceToPlain(
            plainToInstance(SuggestEmailKeywordsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Gợi ý từ khóa email thành công",
                200,
                req.requestId
            )
        );
    });

    /**
     * API 3.3: Check / grade student's reply email
     */
    checkEmailWriting = asyncHandler(async (req: Request, res: Response) => {
        const dto: CheckEmailWritingReqDto = req.body;
        const result = await this.writingService.checkEmailWriting(dto);

        const response = instanceToPlain(
            plainToInstance(CheckEmailWritingResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(
                response,
                "Chấm điểm email thành công",
                200,
                req.requestId
            )
        );
    });
}

export default WritingController;