import { Expose, Type } from "class-transformer";

/**
 * ============================================
 * GỢI Ý COLLOCATION RESPONSE (CHUNG CHO CẢ 2 TÍNH NĂNG)
 * ============================================
 */
export class CollocationSuggestionResDto {
    @Expose()
    collocation!: string; // Cụm từ gợi ý (VD: "accept the offer")

    @Expose()
    meaning!: string; // Nghĩa tiếng Việt

    @Expose()
    example!: string; // Câu ví dụ sử dụng collocation này
}

export class SuggestCollocationsResDto {
    @Expose()
    @Type(() => CollocationSuggestionResDto)
    suggestions!: CollocationSuggestionResDto[]; // 5 gợi ý collocation

    @Expose()
    required_words!: string[]; // 2 từ cho trước

    @Expose()
    note?: string; // Ghi chú bổ sung (VD: "Các collocation này phù hợp với ngữ cảnh formal")
}

/**
 * ============================================
 * CHẤM BÀI RESPONSE (CHUNG CHO CẢ 2 TÍNH NĂNG)
 * ============================================
 */

// SECTION 1: Ý nghĩa
export class MeaningAnalysisResDto {
    @Expose()
    is_correct!: boolean; // Câu có đúng nghĩa không?

    @Expose()
    explanation!: string; // Giải thích chi tiết

    @Expose()
    image_relevance?: string; // (CHỈ DÀNH CHO TÍNH NĂNG 2) Câu có phù hợp với nội dung hình ảnh không?
}

// SECTION 2: Ngữ pháp
export class GrammarErrorResDto {
    @Expose()
    type!: string; // Loại lỗi: "Tense", "Subject-Verb Agreement"...

    @Expose()
    description!: string; // Mô tả lỗi

    @Expose()
    incorrect_part!: string; // Phần sai

    @Expose()
    suggestion!: string; // Gợi ý sửa
}

export class GrammarAnalysisResDto {
    @Expose()
    has_errors!: boolean; // Có lỗi không?

    @Expose()
    @Type(() => GrammarErrorResDto)
    errors!: GrammarErrorResDto[]; // Danh sách lỗi (empty array nếu không có lỗi)

    @Expose()
    explanation?: string; // Giải thích chung
}

// SECTION 3: Từ vựng & Collocation
export class VocabularyIssueResDto {
    @Expose()
    incorrect_usage!: string; // Từ/cụm sai

    @Expose()
    issue_type!: string; // "wrong_collocation" | "spelling_error" | "inappropriate_word"

    @Expose()
    explanation!: string; // Giải thích

    @Expose()
    correct_suggestion!: string; // Gợi ý đúng
}

export class VocabularyAnalysisResDto {
    @Expose()
    has_issues!: boolean; // Có vấn đề không?

    @Expose()
    @Type(() => VocabularyIssueResDto)
    issues!: VocabularyIssueResDto[]; // Danh sách vấn đề (empty array nếu không có)

    @Expose()
    positive_collocations?: string[]; // Các collocation dùng ĐÚNG (để khen)

    @Expose()
    required_words_usage?: {
        word: string;
        used_correctly: boolean;
        note: string;
    }[]; // Đánh giá việc sử dụng 2 từ bắt buộc
}

// SECTION 4: Chỉnh sửa
export class CorrectionResDto {
    @Expose()
    original_sentence!: string; // Câu gốc

    @Expose()
    corrected_sentence!: string; // Câu đã sửa

    @Expose()
    changes!: Array<{
        from: string;
        to: string;
        reason: string;
    }>; // Danh sách thay đổi (empty array nếu câu hoàn hảo)
}

/**
 * ============================================
 * RESPONSE CHÍNH - CHẤM BÀI
 * (Áp dụng cho cả Text Writing và Image Writing)
 * ============================================
 */
export class CheckWritingResDto {
    @Expose()
    @Type(() => MeaningAnalysisResDto)
    meaning!: MeaningAnalysisResDto; // Phần 1: Ý nghĩa

    @Expose()
    @Type(() => GrammarAnalysisResDto)
    grammar!: GrammarAnalysisResDto; // Phần 2: Ngữ pháp

    @Expose()
    @Type(() => VocabularyAnalysisResDto)
    vocabulary!: VocabularyAnalysisResDto; // Phần 3: Từ vựng

    @Expose()
    @Type(() => CorrectionResDto)
    correction!: CorrectionResDto; // Phần 4: Chỉnh sửa

    @Expose()
    overall_score!: number; // Điểm tổng thể 0-100

    @Expose()
    feedback_summary!: string; // Nhận xét tổng kết (có khích lệ)
}


/**
 * ============================================
 * EMAIL WRITING RESPONSES (TÍNH NĂNG 3)
 * ============================================
 */

// API 3.1: Tạo đề email
export class GenerateEmailPromptResDto {
    @Expose()
    from!: string; // "Marketing Department"

    @Expose()
    to!: string; // "All staff"

    @Expose()
    subject!: string; // "About the new project deadline"

    @Expose()
    sent!: string; // "May 15, 10:30"

    @Expose()
    body!: string; // Nội dung email chính

    @Expose()
    full_email!: string; // Toàn bộ email đã format (để hiển thị)
}

// API 3.2: Gợi ý từ khóa
export class EmailKeywordResDto {
    @Expose()
    keyword!: string; // Từ khóa (VD: "Project timeline")

    @Expose()
    meaning!: string; // Nghĩa tiếng Việt

    @Expose()
    usage_example!: string; // Câu ví dụ sử dụng trong email
}

export class SuggestEmailKeywordsResDto {
    @Expose()
    @Type(() => EmailKeywordResDto)
    keywords!: EmailKeywordResDto[]; // 5 từ khóa gợi ý

    @Expose()
    note?: string; // Ghi chú bổ sung
}

// API 3.3: Chấm điểm email
export class EmailScoreCriteriaResDto {
    @Expose()
    criterion!: string; // Tên tiêu chí (VD: "Task Fulfillment")

    @Expose()
    score!: number; // Điểm thành phần (0-100)

    @Expose()
    feedback!: string; // Nhận xét chi tiết
}

export class CheckEmailWritingResDto {
    @Expose()
    @Type(() => EmailScoreCriteriaResDto)
    criteria_scores!: EmailScoreCriteriaResDto[]; // 4 tiêu chí chấm điểm

    @Expose()
    overall_score!: number; // Điểm tổng (0-100)

    @Expose()
    cefr_level!: string; // Level: A1, A2, B1, B2, C1, C2

    @Expose()
    detailed_explanation!: string; // Diễn giải chi tiết

    @Expose()
    conclusion!: string; // Kết luận + khuyến khích
}