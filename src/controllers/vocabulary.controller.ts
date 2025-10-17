import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import VocabularyService from "../services/vocabulary.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import { VocabularySetResDto, VocabularySetListResDto, FlashCardResDto } from "../dtos/response/vocabulary.response.dto";
import ResponseFormat from "../utils/ResponseFormat";
import { CreateSetReqDto, AddFlashCardsReqDto } from "../dtos/request/vocabulary.request.dto";

@injectable()
class VocabularyController {
    constructor(private readonly vocabularyService: VocabularyService) { }

    // Lấy danh sách các bộ flashcard theo từ loại
    getVocabularySets = asyncHandler(async (req: Request, res: Response) => {
        const { part_of_speech, page = 1, limit = 10 } = req.query;
        const result = await this.vocabularyService.getVocabularySets(
            String(part_of_speech || ""),
            Number(page),
            Number(limit)
        );

        const response = instanceToPlain(
            plainToInstance(VocabularySetListResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách bộ flashcard thành công", 200, req.requestId)
        );
    });

    // Lấy tất cả flashcard trong một bộ
    getFlashCardsBySet = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.vocabularyService.getFlashCardsBySet(req.params.setId);
        const response = instanceToPlain(
            plainToInstance(FlashCardResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách flashcard thành công", 200, req.requestId)
        );
    });

    // Tạo 1 bộ flashcard mới
    createVocabularySet = asyncHandler(async (req: Request<{}, {}, CreateSetReqDto>, res: Response) => {
        const setInfo: CreateSetReqDto = req.body;
        const result = await this.vocabularyService.createVocabularySet(setInfo);

        const response = instanceToPlain(
            plainToInstance(VocabularySetResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(201).json(
            ResponseFormat.successResponse(response, "Tạo bộ flashcard thành công", 201, req.requestId)
        );
    });

    // Thêm flashcard vào bộ
    addFlashCards = asyncHandler(async (req: Request, res: Response) => {
        const dto = plainToInstance(AddFlashCardsReqDto, req.body, { excludeExtraneousValues: true });
        const result = await this.vocabularyService.addFlashCards(req.params.setId, dto);

        const response = instanceToPlain(
            plainToInstance(VocabularySetResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Thêm flashcard thành công", 200, req.requestId)
        );
    });

    // Xóa 1 hoặc nhiều flashcard
    deleteFlashCards = asyncHandler(async (req: Request, res: Response) => {
        const { cardIds } = req.body; // truyền mảng cardIds
        const result = await this.vocabularyService.deleteFlashCards(req.params.setId, cardIds);

        const response = instanceToPlain(
            plainToInstance(VocabularySetResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Xóa flashcard thành công", 200, req.requestId)
        );
    });

    // Xóa 1 hoặc nhiều bộ flashcard
    deleteVocabularySets = asyncHandler(async (req: Request, res: Response) => {
        const { setIds } = req.body;
        const result = await this.vocabularyService.deleteVocabularySets(setIds);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Xóa bộ flashcard thành công", 200, req.requestId)
        );
    });
}

export default VocabularyController;