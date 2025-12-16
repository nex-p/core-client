import NextAuth from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    accessToken: string;
    refreshToken: string;
    accessTokenExpired: number;
    refreshTokenExpired: number;
    // idToken: string;

    error: string;
  }
}

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string;
  }

  interface Session {
    token: JWT;
    accessToken: JWT;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      image: string;
    };
  }
}
