declare module "jsonwebtoken" {
  export interface JwtPayload {
    userId: number;
    email: string;
    isAdmin: boolean;
  }
}
