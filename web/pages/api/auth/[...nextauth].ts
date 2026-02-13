import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import { db } from "../../../lib/db";

export default NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log("🔥 AUTHORIZE HIT", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing email or password");
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: String(credentials.email) },
        });

        console.log(
          "USER FOUND:",
          !!user,
          "HAS HASH:",
          !!user?.passwordHash
        );

        if (!user || !user.passwordHash) {
          console.log("❌ User not found or no passwordHash");
          return null;
        }

        const ok = await bcrypt.compare(
            String(credentials.password),
            user.passwordHash
          );
          
          if (!ok) return null; // ⬅️ OBAVEZNO ODMAH
          
          const activeMembership = await db.membership.findFirst({
            where: {
              userId: user.id,
              status: "ACTIVE",
            },
            select: { id: true },
          });
          
          if (!activeMembership) return null;
          
          
        console.log("PASSWORD MATCH:", ok);

        if (!ok) {
          console.log("❌ Password mismatch");
          return null;
        }

        console.log("✅ AUTH SUCCESS");

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});
