import { createContext } from "react";
import type { User } from "@/db/schema";

export type UserDetailValue = {
  user?: User;
};

export type UserDetailContextType = {
  userDetail?: UserDetailValue | null;
  setUserDetail?: React.Dispatch<React.SetStateAction<UserDetailValue | null | undefined>>;
} | null;

export const UserDetailContext = createContext<UserDetailContextType>(null);
