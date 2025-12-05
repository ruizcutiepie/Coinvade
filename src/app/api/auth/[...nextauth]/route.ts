// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import authOptions from '../../../../lib/auth'; // ⬅️ relative path to src/lib/auth.ts

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
