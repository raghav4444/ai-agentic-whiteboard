import { db, users } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

export async function POST(req: NextRequest){
    if (!isClerkConfigured) {
        return NextResponse.json({ message: "Clerk is not configured" }, { status: 200 });
    }

    if (!db) {
        return NextResponse.json({ message: "Database not configured" }, { status: 503 });
    }

    const user = await currentUser()

    // If user exist?
    if (user) {
        const clerkEmail = user.primaryEmailAddress?.emailAddress;

        if (!clerkEmail) {
            return NextResponse.json({ message: "User email not found" }, { status: 400 });
        }

        const userData = await db.select().from(users)
            .where(eq(users.email, clerkEmail));

        if (userData?.length > 0) {
            return NextResponse.json(userData[0]);
        } else {
            const result = await db.insert(users).values({
                name: user?.fullName,
                email: user?.primaryEmailAddress?.emailAddress ?? '',
            }).returning();


            return NextResponse.json(result[0]);
        }
    }

    return NextResponse.json({ message: "User not found" }, { status: 404 });
}