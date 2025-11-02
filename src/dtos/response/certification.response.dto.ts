import { Expose, Type } from "class-transformer";

export class CreateCertificationResDto {
    @Expose()
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
}

export class CertificationItemResDto {
    @Expose()
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
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}

export class GetCertificationListResDto {
    @Expose()
    @Type(() => CertificationItemResDto)
    data!: CertificationItemResDto[];
}

export class UpdateCertificationResDto {
    @Expose()
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
}

export class DeleteCertificationResDto {
    @Expose()
    message!: string;

    @Expose()
    deletedId!: string;
}
