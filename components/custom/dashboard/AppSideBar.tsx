"use client"
import { Progress, ProgressIndicator, ProgressValue } from "@/components/ui/progress"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { CreateOrganization, useUser } from "@clerk/nextjs"
import { Archive, LayoutGrid, Settings, Sparkles, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import CreateNewBoardDialog from "./CreateNewBoardDialog"
import { useContext } from "react"
import { UserDetailContext } from "@/context/UserDetailContext"


 
export function AppSidebar() {

  const path = usePathname();
  const {user}= useUser();
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const totalMaxCredits = 3;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
        <Image src="/logo.svg" alt="logo" width={40} height={40} />
        <h2 className="text-xl font-bold">Whizboard</h2>
        </div>
        </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
            <CreateNewBoardDialog />
        </SidebarGroup>
        <SidebarGroup>
            <SidebarGroupLabel>
                My Boards
            </SidebarGroupLabel>
            <SidebarMenuButton render={<Link href="/dashboard" />} className="p-5 mt-2" isActive={path === '/dashboard'}>
                <LayoutGrid />
                <span>All Files</span>
            </SidebarMenuButton>
            <SidebarMenuButton render={<Link href="/shared-files" />} className="p-5 mt-2" isActive={path === "/shared-files"}>
                <Users />
                <span>Shared</span>
            </SidebarMenuButton>
            <SidebarMenuButton render={<Link href="/archive" />} className="p-5 mt-2" isActive={path === "/archive"}>
                <Archive />
                <span>Archived</span>
            </SidebarMenuButton>
        </SidebarGroup>
        <SidebarGroup>
            <SidebarGroupLabel>
                Others
            </SidebarGroupLabel>
            <SidebarMenuButton render={<Link href="/ai" />} className="p-5 mt-2" isActive={path === '/ai'}>
                <Sparkles />
                <span>AI Helper</span>
            </SidebarMenuButton>
              <SidebarMenuButton render={<Link href="/settings" />} className="p-5 mt-2" isActive={path === '/settings'}>
                <Settings />
                <span>Settings</span>
            </SidebarMenuButton>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter>
        <CreateNewBoardDialog />
        <div className="p-4 my-3 border rounded-md">
            <h2 className="text-sm flex justify-between mb-1">{totalMaxCredits - userDetail?.credits} files created <span>Total {totalMaxCredits}</span></h2>
            <Progress value={((totalMaxCredits - userDetail?.credits) / totalMaxCredits) * 100} className="h-2 mt-2" />
        </div>
        <div className="flex items-center gap-2 p-4 border rounded-md">
            {user?.imageUrl && (
              <Image src={user?.imageUrl ?? ''} alt="User Image" width={40} height={40} className="rounded-full" />
            )}
            <h2>{user?.firstName} {user?.lastName}</h2>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}



