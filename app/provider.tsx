"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { UserDetailContext } from '@/context/UserDetailContext';

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function Provider({ children }:{ children: React.ReactNode}) {

    const [userDetail, setUserDetail] = useState<any>(null);

    useEffect(() => {
      if (!isClerkConfigured) {
        return;
      }

      void CreateNewUser();
    }, []);

    const CreateNewUser = async () => {
      try {
        const result = await axios.post('/api/users');
        setUserDetail(result.data);
      } catch (error) {
        setUserDetail(null);
      }
    }
  return (
    <UserDetailContext.Provider value={{userDetail, setUserDetail}}>

      <div>{ children }</div>

    </UserDetailContext.Provider>
    
  )
}

export default Provider
