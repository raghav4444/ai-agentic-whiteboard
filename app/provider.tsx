"use client";
import { UserDetailContext, type UserDetailValue } from "@/context/UserDetailContext";
import axios from "axios";
import React, { useEffect, useState } from "react";

function Provider({ children }: { children: React.ReactNode }) {
  const [userDetail, setUserDetail] = useState<UserDetailValue | null>();

  useEffect(() => {
    let cancelled = false;
    const fetchOrCreateUser = async () => {
      try {
        const result = await axios.get<UserDetailValue>("/api/users");
        if (!cancelled) setUserDetail(result.data);
      } catch {
        try {
          const postResult = await axios.post<UserDetailValue>("/api/users");
          if (!cancelled) setUserDetail(postResult.data);
        } catch {
          // Gracefully continue if user creation fails
        }
      }
    };

    fetchOrCreateUser();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
      <div>{children}</div>
    </UserDetailContext.Provider>
  );
}

export default Provider;
