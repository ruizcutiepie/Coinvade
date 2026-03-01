// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
            kycStatus: true,
          },
        });

        if (!user?.passwordHash) return null;

        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        // Put only what you need into the JWT
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          kycStatus: user.kycStatus,
        } as any;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Initial sign-in
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.kycStatus = (user as any).kycStatus;
      }

      // Optional: keep token fresh (uncomment if you want KYC changes to reflect without re-login)
      // if (token?.id) {
      //   const dbUser = await prisma.user.findUnique({
      //     where: { id: token.id as string },
      //     select: { role: true, kycStatus: true },
      //   });
      //   if (dbUser) {
      //     token.role = dbUser.role;
      //     token.kycStatus = dbUser.kycStatus;
      //   }
      // }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).kycStatus = token.kycStatus;
      }
      return session;
    },
  },

  pages: { signIn: "/login" },
};

export default authOptions;