import { Request, Response, NextFunction } from "express";
import { injectable } from "tsyringe";
import { asyncHandler } from "../middlewares/handleErorr.middleware";
import VocabularyService from "../services/vocabulary.service";
import { plainToInstance, instanceToPlain } from "class-transformer";
import {
    GetStudentVocabularySetsResDto,
    GetStudentVocabularySetDetailResDto
} from "../dtos/response/student-vocabulary.response.dto";
import ResponseFormat from "../utils/ResponseFormat";
import { CreateSetReqDto, AddFlashCardsReqDto } from "../dtos/request/vocabulary.request.dto";
import { AddFlashCardsResDto, FlashCardResDto, VocabularySetResDto } from "../dtos/response/vocabulary.response.dto";

@injectable()
class VocabularyController {
    constructor(private readonly vocabularyService: VocabularyService) { }

    // GET /admin/vocabulary/sets
    getVocabularySets = asyncHandler(async (req: Request, res: Response) => {
        const { part_of_speech, page = 1, limit = 100 } = req.query;
        const result = await this.vocabularyService.getVocabularySets(
            String(part_of_speech || ""),
            Number(page),
            Number(limit)
        );

        const response = instanceToPlain(
            plainToInstance(GetStudentVocabularySetsResDto, { total: result.length, data: result }, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy danh sách bộ từ vựng thành công", 200, req.requestId)
        );
    });

    // GET /admin/vocabulary/sets/:setId
    getVocabularySetById = asyncHandler(async (req: Request, res: Response) => {
        const { setId } = req.params;
        const result = await this.vocabularyService.getVocabularySetById(setId);

        const response = instanceToPlain(
            plainToInstance(GetStudentVocabularySetDetailResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Lấy chi tiết bộ từ vựng thành công", 200, req.requestId)
        );
    });

    // POST /admin/vocabulary/sets
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

    // POST /admin/vocabulary/sets/:setId/cards
    addFlashCards = asyncHandler(async (req: Request, res: Response) => {
        const dto: AddFlashCardsReqDto = req.body;
        const result = await this.vocabularyService.addFlashCards(req.params.setId, dto);

        const response = instanceToPlain(
            plainToInstance(AddFlashCardsResDto, result, { excludeExtraneousValues: true })
        );

        return res.status(200).json(
            ResponseFormat.successResponse(response, "Thêm flashcard thành công", 200, req.requestId)
        );
    });

    // DELETE /admin/vocabulary/sets/:setId/cards
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

    // DELETE /admin/vocabulary/sets
    deleteVocabularySets = asyncHandler(async (req: Request, res: Response) => {
        const { setIds } = req.body;
        const result = await this.vocabularyService.deleteVocabularySets(setIds);

        return res.status(200).json(
            ResponseFormat.successResponse(result, "Xóa bộ flashcard thành công", 200, req.requestId)
        );
    });
}

export default VocabularyController;