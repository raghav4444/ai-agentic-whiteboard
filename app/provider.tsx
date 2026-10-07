"use client"

import React, { useContext, useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { UserDetailContext } from '@/context/UserDetailContext'

function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const { user } = useUser();
  const [userDetail, setUserDetail] = useState<any>();
  useEffect(() => {
    user && CreateNewUser();
  }, [user])

  const CreateNewUser = async () => {
    try {
      const result = await axios.post('/api/users', {})
      console.log(result.data);
      setUserDetail(result.data?.user);
    } catch (error: any) {
      console.error("Error creating user:", error);
      // Try to get existing user if creation failed
      try {
        const result = await axios.get('/api/users');
        setUserDetail(result.data?.user);
      } catch (getError) {
        console.error("Error fetching user:", getError);
      }
    }
  }

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      <div>{children}</div>
    </UserDetailContext.Provider>
  )
}

export default Provider
