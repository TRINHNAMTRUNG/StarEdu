import { Router } from "express";
import { container } from "tsyringe";
import VocabularyController from "../../controllers/vocabulary.controller";
import { validationBody, validationParams } from "../../middlewares/validationError.middleware";
import { CreateSetReqDto, AddFlashCardsReqDto, SetIdParamDto } from "../../dtos/request/vocabulary.request.dto";
const adminVocabularyRoutes = Router();
const vocabularyController = container.resolve(VocabularyController);

// GET danh sách bộ flashcard theo từ loại
adminVocabularyRoutes.get("/sets", vocabularyController.getVocabularySets);

// GET tất cả flashcard trong 1 bộ
adminVocabularyRoutes.get("/sets/:setId/cards", vocabularyController.getFlashCardsBySet);

// POST tạo bộ flashcard
adminVocabularyRoutes.post("/sets", validationBody(CreateSetReqDto), vocabularyController.createVocabularySet);

// POST thêm flashcard vào bộ
adminVocabularyRoutes.post(
    "/sets/:setId/cards",
    validationParams(SetIdParamDto),
    validationBody(AddFlashCardsReqDto),
    vocabularyController.addFlashCards
);

// DELETE xóa flashcard trong bộ
adminVocabularyRoutes.delete("/sets/:setId/cards", vocabularyController.deleteFlashCards);

// DELETE xóa 1 hoặc nhiều bộ flashcard
adminVocabularyRoutes.delete("/sets", vocabularyController.deleteVocabularySets);

export default adminVocabularyRoutes;
