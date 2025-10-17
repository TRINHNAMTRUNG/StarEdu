import { Expose, Type } from "class-transformer";
import { PickType } from "@nestjs/mapped-types";
import { UserBaseResDto } from "../UserBase";

// /refresh-token
export class RefreshTokenResDto {
    @Expose()
    accessToken!: string;

    @Expose()
    refreshToken!: string;
}

/**
 * --------------
 *  STUDENT APIs
 * --------------
 */

// /student/register
export class StudentRegisterResDto extends PickType(UserBaseResDto, [
    'phone',
    'name'
]) { }

// /student/verify-account
export class StudentVerifyResDto extends PickType(UserBaseResDto, [
    'avatar',
    'phone',
    'name',
    'gender'
]) {
    @Expose()
    accessToken!: string;

    @Expose()
    refreshToken!: string;
}

// /student/login
export class StudentLoginResDto extends PickType(UserBaseResDto, [
    'avatar',
    'phone',
    'name',
    'gender'
]) {
    @Expose()
    accessToken!: string;

    @Expose()
    refreshToken!: string;
}

/**
 * --------------
 *  ADMIN APIs
 * --------------
 */

// /admin/ban-users
export class BannedUserItem {
    @Expose()
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    phone!: string;

    @Expose()
    role!: string;
}

export class BanUserResDto {
    @Expose()
    modified!: number;

    @Expose()
    @Type(() => BannedUserItem)
    bannedUsers!: BannedUserItem[];
}


/**
 * --------------
 *  TEACHER APIs
 * --------------
 */

// /auth/logout
export class LogoutResDto {
    @Expose()
    message!: string;
}

// /auth/logout-all
export class LogoutAllResDto {
    @Expose()
    message!: string;
}
