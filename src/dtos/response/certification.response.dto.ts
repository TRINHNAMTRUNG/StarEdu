import { Expose, Transform, Type } from "class-transformer";

export class CreateCertificationResDto {
    @Expose()
    @Transform(({ value }) => value?.toString())
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    type!: string;

    @Expose()
    description?: string;

    @Expose()
    issuer!: string;

    @Expose()
    validityPeriod?: number;

    @Expose()
    passingScore?: number;
}

export class CertificationItemResDto {
    @Expose()
    @Transform(({ value }) => value?.toString())
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    type!: string;

    @Expose()
    description?: string;

    @Expose()
    issuer!: string;

    @Expose()
    validityPeriod?: number;

    @Expose()
    passingScore?: number;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

export class GetCertificationListResDto {
    @Expose()
    total!: number;

    @Expose()
    page!: number;

    @Expose()
    limit!: number;

    @Expose()
    @Type(() => CertificationItemResDto)
    data!: CertificationItemResDto[];
}

export class UpdateCertificationResDto {
    @Expose()
    @Transform(({ value }) => value?.toString())
    _id!: string;

    @Expose()
    name!: string;

    @Expose()
    type!: string;

    @Expose()
    description?: string;

    @Expose()
    issuer!: string;

    @Expose()
    validityPeriod?: number;

    @Expose()
    passingScore?: number;
}

export class DeleteCertificationResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;
}
