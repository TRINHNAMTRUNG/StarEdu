import { JwtUserPayload } from "../utils/token.util";

declare global {
    namespace Express {
        export interface Request {
            user?: JwtUserPayload;
            requestId?: string;
        }
    }
}

export { };
