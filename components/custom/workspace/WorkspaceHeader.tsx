"use client"
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Share } from 'lucide-react';
import Image from 'next/image'
import React from 'react'

type Props = {
    selectedTab:any
}

function WorkspaceHeader({ selectedTab }: Props) {
  return (
    <div className='p-3 border-b flex justify-between'>
        <div className='flex gap-2 items-center'>
      <Image src="/logo.svg" alt="logo" width={40} height={40} />
      <h2>Workspace Name Placeholder</h2>
        </div>
         {/* Switch */}
        <div>
            <Tabs defaultValue="whiteboard"  
            onValueChange={(value) => selectedTab(value)}>
                <TabsList>
                    <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
                    <TabsTrigger value="doc">Doc</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className='flex gap-2'>
            <Button><Save/>Save</Button>
            <Button variant={'outline'}><Share/>Share</Button>
        </div>
    </div>
  )
}

export default WorkspaceHeader;
