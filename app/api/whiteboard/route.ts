import { db, projects, whiteboardData } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { profileEnd } from "console";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    if (!db) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const {projectId,elements,appState,files} = await req.json();
    const user = await currentUser();

    if (!user)
    {
        return NextResponse.json('Unauthorized User')
    }

    if (projectId)
    {
        try{
        const projectResult = await db.select({
            projectId: projects.projectId,
            userEmail: projects.userEmail
        }).from(projects).where(eq(projects.projectId, projectId)).limit(1);
        const project = projectResult[0];

        if (!project) {
            return NextResponse.json('Project Not Found', { status: 404 });
        }

        if (project.userEmail !== user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json('Forbidden', { status: 403 });
        }

        const result = await db.insert(whiteboardData).values({
            projectId: projectId,
            elements: elements,
            appState: appState,
            files: files
        }).onConflictDoUpdate({
            target:whiteboardData.projectId,
            set:{
                 elements: elements,
                 appState: appState,
                files: files
            }
        })

        return NextResponse.json(result);
    }
    catch (e)
 {

    return NextResponse.json('Internal Server Error!', { status:500 })

 }    
}

    return NextResponse.json('Project Information Missing')
}