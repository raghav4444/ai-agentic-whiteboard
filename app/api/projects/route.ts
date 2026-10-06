import { db, projects, users } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req: NextRequest) {
    if (!db) {
        return NextResponse.json({error: 'Database not configured'}, {status: 503})
    }

    const {projectName, projectId}= await req.json();
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const trimmedProjectName = typeof projectName === 'string' ? projectName.trim() : '';

    if (!userEmail) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401})
    }

    if (!projectId || trimmedProjectName.length < 1 || trimmedProjectName.length > 30) {
        return NextResponse.json({error: 'Project Information Missing'}, {status: 400})
    }

    const debitedUser = db.$with("debited_user").as(
        db.update(users)
            .set({credits: sql`${users.credits} - 1`})
            .where(and(eq(users.email, userEmail), gt(users.credits, 0)))
            .returning({email: users.email})
    );
    const result = await db.with(debitedUser).insert(projects).select((queryBuilder) =>
        queryBuilder.select({
            projectId: sql`${projectId}`.as("projectId"),
            projectName: sql`${trimmedProjectName}`.as("projectName"),
            userEmail: sql`${userEmail}`.as("userEmail")
        }).from(debitedUser)
    ).returning();

    if (result.length === 0) {
        return NextResponse.json({error: "Insufficient Credits"}, {status: 402});
    }

    return NextResponse.json(result[0]);
}