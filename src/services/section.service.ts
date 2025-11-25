import { injectable } from "tsyringe";
import SectionModel from "../models/section.model";
import LessonModel from "../models/lesson.model";
import AppError from "../utils/AppError";
import s3Util, { S3Folder } from "../utils/s3.util";
import { CreateSectionReqDto, UpdateSectionReqDto } from "../dtos/request/section.request.dto";
import fs from "fs/promises";

@injectable()
class SectionService {
	// Helper: upload file từ Multer (path trên disk hoặc buffer) lên S3
	// Nếu Multer lưu file tạm trên disk (file.path) sẽ đọc buffer từ file đó
	// Sau khi upload sẽ cố gắng xóa file tạm (không block luồng chính nếu xóa thất bại)
	private async uploadMulterFileToS3(
		file: Express.Multer.File | undefined,
		folder: S3Folder,
		fileNamePrefix?: string
	): Promise<string | undefined> {
		if (!file) return undefined;

		let buffer: Buffer | undefined;
		let tempPath: string | undefined;

		try {
			// Nếu Multer sử dụng diskStorage thì file.path tồn tại
			if ((file as any).path) {
				tempPath = (file as any).path as string;
				buffer = await fs.readFile(tempPath);
			} else if ((file as any).buffer) {
				// Nếu Multer lưu trong bộ nhớ (memoryStorage)
				buffer = (file as any).buffer as Buffer;
			} else {
				return undefined;
			}

			const finalName = fileNamePrefix ? `${fileNamePrefix}-${file.originalname}` : file.originalname;
			const s3Url = await s3Util.uploadFile(buffer, folder, `${Date.now()}-${finalName}`, file.mimetype);
			return s3Url;
		} finally {
			// Cố gắng xóa file tạm nếu có, nhưng không làm throw error
			if (tempPath) {
				try {
					await fs.unlink(tempPath);
				} catch (err) {
					console.warn("SectionService: xóa file tạm thất bại", tempPath, err);
				}
			}
		}
	}

	/**
	 * Tạo section
	 * - dto: CreateSectionReqDto (đã validate ở controller)
	 * - files: object chứa video và mindmap (do multer cung cấp)
	 * Luồng:
	 *  1) Kiểm tra lesson tồn tại
	 *  2) Upload video lên S3 (bắt buộc)
	 *  3) Upload mindmap nếu có
	 *  4) Nếu upload thành công tạo record trong DB
	 *  5) Nếu tạo DB lỗi -> rollback các object đã upload trên S3
	 *  6) Trả về object đã convert id sang string
	 */
	async createSection(
		dto: CreateSectionReqDto,
		files: { video?: Express.Multer.File; mindmap?: Express.Multer.File }
	) {
		// Kiểm tra lesson tồn tại
		const lesson = await LessonModel.findById(dto.lesson_id);
		if (!lesson) throw AppError.notFoundError("Lesson không tồn tại");

		const uploadedS3Urls: string[] = [];
		let video_url: string | undefined;
		let mindmap_url: string | undefined;

		// Video bắt buộc
		if (!files?.video) {
			throw AppError.badRequestError("Video là trường bắt buộc");
		}

		// Validate định dạng video
		const validVideoTypes = [".mp4", ".mov", ".avi"];
		if (!s3Util.validateFileType(files.video.originalname, validVideoTypes)) {
			throw AppError.badRequestError("Video phải là định dạng MP4, MOV hoặc AVI");
		}

		// Upload video lên S3
		video_url = await this.uploadMulterFileToS3(files.video, S3Folder.VIDEOS, `lesson-${dto.lesson_id}`);
		if (video_url) uploadedS3Urls.push(video_url);

		// Upload mindmap nếu có
		if (files?.mindmap) {
			const validImageTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
			if (!s3Util.validateFileType(files.mindmap.originalname, validImageTypes)) {
				// Nếu validation mindmap sai -> rollback các file đã upload
				if (uploadedS3Urls.length) await s3Util.deleteMultipleFiles(uploadedS3Urls);
				throw AppError.badRequestError("Mindmap phải là định dạng JPG, PNG, GIF hoặc WEBP");
			}
			mindmap_url = await this.uploadMulterFileToS3(files.mindmap, S3Folder.IMAGES, `lesson-${dto.lesson_id}-mindmap`);
			if (mindmap_url) uploadedS3Urls.push(mindmap_url);
		}

		// Tạo section trong DB, rollback S3 nếu DB lỗi
		let sectionDoc;
		try {
			sectionDoc = await SectionModel.create({
				lesson_id: dto.lesson_id,
				title: dto.title,
				order: dto.order,
				description: dto.description,
				test_id: dto.test_id,
				video_url,
				mindmap_url
			});
		} catch (err) {
			// rollback trên S3
			if (uploadedS3Urls.length) {
				try {
					await s3Util.deleteMultipleFiles(uploadedS3Urls);
				} catch (e) {
					console.warn("SectionService: rollback S3 thất bại", e);
				}
			}
			throw AppError.internalServerError("Tạo section thất bại", (err as Error).message);
		}

		// Chuẩn hoá id -> string trước khi trả về controller
		return {
			...sectionDoc.toObject(),
			_id: sectionDoc._id.toString(),
			lesson_id: sectionDoc.lesson_id.toString()
		};
	}

	/**
	 * Lấy section theo id
	 */
	async getSectionById(id: string) {
		const section = await SectionModel.findById(id).lean();
		if (!section) throw AppError.notFoundError("Section không tồn tại");

		return {
			...section,
			_id: section._id.toString(),
			lesson_id: section.lesson_id.toString()
		};
	}

	/**
	 * Cập nhật section
	 * - dto: UpdateSectionReqDto
	 * - files: video/mindmap nếu có
	 * Luồng:
	 *  1) Nếu có file mới -> upload mới lên S3
	 *  2) Cập nhật URL mới vào document
	 *  3) Xóa file cũ trên S3 (nếu có)
	 *  4) Lưu DB
	 */
	async updateSection(
		id: string,
		dto: UpdateSectionReqDto,
		files: { video?: Express.Multer.File; mindmap?: Express.Multer.File }
	) {
		const section = await SectionModel.findById(id);
		if (!section) throw AppError.notFoundError("Section không tồn tại");

		const oldVideoUrl = section.video_url;
		const oldMindmapUrl = section.mindmap_url;
		const newlyUploaded: string[] = [];

		// Xử lý video mới
		if (files?.video) {
			const validVideoTypes = [".mp4", ".mov", ".avi"];
			if (!s3Util.validateFileType(files.video.originalname, validVideoTypes)) {
				throw AppError.badRequestError("Video phải là định dạng MP4, MOV hoặc AVI");
			}
			const newVideoUrl = await this.uploadMulterFileToS3(files.video, S3Folder.VIDEOS, `section-${id}`);
			if (newVideoUrl) newlyUploaded.push(newVideoUrl);
			section.video_url = newVideoUrl;
			// Xóa video cũ trên S3 sau khi upload thành công
			if (oldVideoUrl) await s3Util.deleteFile(oldVideoUrl);
		}

		// Xử lý mindmap mới
		if (files?.mindmap) {
			const validImageTypes = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
			if (!s3Util.validateFileType(files.mindmap.originalname, validImageTypes)) {
				if (newlyUploaded.length) await s3Util.deleteMultipleFiles(newlyUploaded);
				throw AppError.badRequestError("Mindmap phải là định dạng JPG, PNG, GIF hoặc WEBP");
			}
			const newMindmapUrl = await this.uploadMulterFileToS3(files.mindmap, S3Folder.IMAGES, `section-${id}-mindmap`);
			if (newMindmapUrl) newlyUploaded.push(newMindmapUrl);
			section.mindmap_url = newMindmapUrl;
			if (oldMindmapUrl) await s3Util.deleteFile(oldMindmapUrl);
		}

		// Xóa theo flag nếu yêu cầu
		if (dto.removeVideo && section.video_url) {
			await s3Util.deleteFile(section.video_url);
			section.video_url = undefined;
		}
		if (dto.removeMindmap && section.mindmap_url) {
			await s3Util.deleteFile(section.mindmap_url);
			section.mindmap_url = undefined;
		}

		// Cập nhật trường văn bản
		if (dto.title !== undefined) section.title = dto.title;
		if (dto.order !== undefined) section.order = dto.order;
		if (dto.description !== undefined) section.description = dto.description;

		await section.save();

		return {
			...section.toObject(),
			_id: section._id.toString(),
			lesson_id: section.lesson_id.toString()
		};
	}

	/**
	 * Xóa section và xóa các file liên quan trên S3
	 */
	async deleteSection(id: string) {
		const section = await SectionModel.findById(id);
		if (!section) throw AppError.notFoundError("Section không tồn tại");

		const filesToDelete: string[] = [];
		if (section.video_url) filesToDelete.push(section.video_url);
		if (section.mindmap_url) filesToDelete.push(section.mindmap_url);

		if (filesToDelete.length > 0) {
			await s3Util.deleteMultipleFiles(filesToDelete);
		}

		await SectionModel.findByIdAndDelete(id);

		return {
			message: "Xóa section thành công",
			deletedId: id,
			deletedFiles: filesToDelete.length
		};
	}
}

export default SectionService;
