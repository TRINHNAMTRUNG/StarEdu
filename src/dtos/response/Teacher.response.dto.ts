import { UserBaseResDto } from "../UserBase";
import { PickType } from "@nestjs/mapped-types";
import { Expose, Type } from "class-transformer";

export class QualificationResDto {
    @Expose()
    degree!: string;

    @Expose()
    major!: string;

    @Expose()
    institution!: string;

    @Expose()
    issue_date!: Date;
}

// User info trong teacher
export class TeacherUserResDto {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    phone!: string;

    @Expose()
    avatar?: string;

    @Expose()
    gender!: string;
}

export class TeacherInfoResDto {
    @Expose()
    _id!: string;

    @Expose()
    experience_years?: number;

    @Expose()
    @Type(() => QualificationResDto)
    qualifications?: QualificationResDto[];
}

// Dùng chung cho Create và List
export class TeacherWithUserResDto {
    @Expose()
    _id!: string;

    @Expose()
    @Type(() => TeacherUserResDto)
    user!: TeacherUserResDto;

    @Expose()
    experience_years!: number;

    @Expose()
    employment_status!: string;

    @Expose()
    @Type(() => QualificationResDto)
    qualifications!: QualificationResDto[];
}

export class CreateTeacherResDto extends TeacherWithUserResDto {}

// PATCH /admin/teachers/:id (giống GetTeacherListItemResDto)
export class UpdateTeacherResDto extends TeacherWithUserResDto {}

// GET /admin/teachers (list)
export class GetTeacherListResDto {
    @Expose()
    @Type(() => TeacherWithUserResDto)
    data!: TeacherWithUserResDto[];
}

// /admin/teachers/set-status
export class SetTeacherStatusResDto {
    @Expose()
    modifiedCount!: number;

    @Expose()
    updatedTeachers!: {
        _id: string;
        user: string;
        employment_status: string;
    }[];
}

