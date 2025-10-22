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

export class TeacherInfoResDto {
    @Expose()
    _id!: string;

    @Expose()
    experience_years?: number;

    @Expose()
    @Type(() => QualificationResDto)
    qualifications?: QualificationResDto[];
}

export class CreateTeacherResDto extends PickType(UserBaseResDto, [
    'phone',
    'name',
    'avatar',
    'gender'
]) {
    @Expose()
    @Type(() => TeacherInfoResDto)
    teacher!: TeacherInfoResDto;
}

// /admin/teachers/:id
export class UpdateTeacherResDto extends PickType(UserBaseResDto, [
    'phone',
    'name',
    'avatar',
    'gender'
]) {
    @Expose()
    @Type(() => TeacherInfoResDto)
    teacher!: TeacherInfoResDto;
}

// /admin/teachers
export class GetTeacherListItemResDto extends PickType(UserBaseResDto, [
    'phone',
    'name',
    'avatar'
]) {
    @Expose()
    @Type(() => TeacherInfoResDto)
    teacher!: TeacherInfoResDto;
}

export class GetTeacherListResDto {
    @Expose()
    @Type(() => GetTeacherListItemResDto)
    data!: GetTeacherListItemResDto[];
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