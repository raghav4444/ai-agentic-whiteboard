"use client"
import { Button } from '@/components/ui/button';
import { useUser } from '@clerk/nextjs';
import { Sparkle } from 'lucide-react';
import React from 'react'
import CreateNewBoardDialog from './CreateNewBoardDialog';

function WelcomeBanner() {

  const {user} = useUser();
  return (
    <div>
        <div className="p-10 border rounded-xl bg-linear-to-r from-blue-200 to-purple-200">
            <h2 className='text-2xl font-bold'>Welcome, {user?.fullName}</h2>
            <p>Bring your ideas to life with infinite canvas</p>

            <div className='mt-4 flex items-center gap-2'>
                <CreateNewBoardDialog />
                <Button variant="outline" size="lg"><Sparkle className='h-4 w-4 text-violet-600'/>Ask AI</Button>
            </div>
        </div>
    </div>
  )
}

export default WelcomeBanner
