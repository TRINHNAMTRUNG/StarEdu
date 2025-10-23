import { Expose, Type } from "class-transformer";
import { PickType } from "@nestjs/mapped-types";
import { UserBaseResDto } from "../UserBase";

// /refresh-token
export class RefreshTokenResDto {
    @Expose()
    access_token!: string;  // ✅ Đổi từ accessToken

    @Expose()
    refresh_token!: string;  // ✅ Đổi từ refreshToken
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
    access_token!: string;  // ✅ Đổi từ accessToken

    @Expose()
    refresh_token!: string;  // ✅ Đổi từ refreshToken
}

// /student/login
export class StudentLoginResDto extends PickType(UserBaseResDto, [
    'avatar',
    'phone',
    'name',
    'gender'
]) {
    @Expose()
    access_token!: string;  // ✅ Đổi từ accessToken

    @Expose()
    refresh_token!: string;  // ✅ Đổi từ refreshToken
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

// /admin/ban-users (cải thiện)
export class BanUserResDto {
    @Expose()
    total!: number;

    @Expose()
    modified!: number;

    @Expose()
    alreadyBanned!: number;

    @Expose()
    notFound!: number;

    @Expose()
    @Type(() => BannedUserItem)
    bannedUsers!: BannedUserItem[];

    @Expose()
    notFoundIds!: string[];
}

// /admin/unban-users
export class UnbanUserResDto {
    @Expose()
    total!: number;

    @Expose()
    modified!: number;

    @Expose()
    alreadyActive!: number;

    @Expose()
    notFound!: number;

    @Expose()
    @Type(() => BannedUserItem)
    unbannedUsers!: BannedUserItem[];

    @Expose()
    notFoundIds!: string[];
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
