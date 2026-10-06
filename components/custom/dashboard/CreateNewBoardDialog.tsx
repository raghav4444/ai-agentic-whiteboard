import React, { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Loader2, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import axios from 'axios'
import { useRouter } from 'next/navigation'


function CreateNewBoardDialog() {

  const [workspaceName, setWorkspaceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);
  const route = useRouter();
  const projectId = crypto.randomUUID();

  const handleCreateBoard= async ()=>{
    if (workspaceName.trim() === ""  || workspaceName?.length > 30){

        toast.add({
            type:"error",
            title: "Invalid Workspace Name",
            description: "Please enter a valid workspace name (1-30 characters)."
        })

        return;
    }
        setLoading(true);
        try {
            const result = await axios.post('/api/projects',{
                projectName: workspaceName,
                projectId: projectId 
            })

            console.log(result?.data);
            toast.add({
                type:'success',
                title:'New Workspace Created'
            })
            setDialog(false);
            route.push('/workspace/' + projectId)
        } catch {
            toast.add({
                type:'error',
                title:'Workspace Creation Failed',
                description:'Unable to create the workspace. Please try again.'
            })
        } finally {
            setLoading(false);
        }
  }

  return (
        <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogTrigger render={<Button className="w-full" />}>
                <Plus />Create New Board
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
            <DialogTitle className="text-lg font-bold">Whiteboard Workspace Title</DialogTitle>
            </DialogHeader>
            <div>
                <label>Enter Workspace Name</label>
                <Input placeholder='Workspace Name' className='mt-1'
                onChange={(e) => setWorkspaceName(e.target.value)} />
            </div>
              <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
            disabled={workspaceName?.length == 0 || loading} 
            onClick={handleCreateBoard}>
            {loading&&<Loader2 className='animate-spin'/>}Create
            </Button>
        </DialogFooter>
        </DialogContent>
      
        </Dialog>
  )
}

export default CreateNewBoardDialog;
