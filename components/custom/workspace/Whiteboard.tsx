"use client"
import React, { useRef, useState } from 'react'
import dynamic from "next/dynamic"
import "@excalidraw/excalidraw/index.css"
import axios from 'axios'
import { useParams } from 'next/navigation'
import { toast } from '@/components/ui/toast'
import './whiteboard.css'
import { ArrowRight, Circle, Diamond, Eraser, Hand, Image, Minus, MousePointer2, Pencil, Sparkle, Square, Type } from 'lucide-react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import FloatingProperties from './FloatingProperties'
import { version } from 'os'
import { except } from 'drizzle-orm/gel-core'
import { Button } from '@/components/ui/button'
import AIFloatingSidebar from './AIFloatingSidebar'



const tools = [
  {
    name:'selection',
    icon:MousePointer2,
    color:"text-blue-600"
  },
  {
    name:'hand',
    icon:Hand,
    color:"text-cyan-600"
  },
   {
    name:'rectangle',
    icon: Square,
    color:"text-blue-600"
  },
  {
    name:'diamond',
    icon: Diamond,
    color:"text-emerald-500"
  },
  {
    name:'ellipse',
    icon: Circle,
    color:"text-amber-500"
  },
  {
    name:'arrow',
    icon: ArrowRight,
    color:"text-violet-500"
  },
  {
    name:'line',
    icon: Minus,
    color:"text-pink-500"
  },
  {
    name:'freedraw',
    icon: Pencil,
    color:"text-orange-500"
  },
  {
    name:'text',
    icon: Type,
    color:"text-indigo-500"
  },
  {
    name:'image',
    icon: Image,
    color:"text-green-600"
  },
  {
    name:'eraser',
    icon: Eraser,
    color:"text-black-500"
  }
]

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((module) => module.Excalidraw),
  { ssr: false }
)

/**
 * Renders the Excalidraw canvas with tool selection, debounced persistence,
 * and a contextual toolbar for a single selected element.
 */
function Whiteboard() {

  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI|null>(null);
  const saveTimeRef=useRef<any>(null);
  const {projectid} = useParams();
  const [activeTool, setActiveTool] = useState('selection');
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [canvasState, setCanvasState] = useState<any>(null);
  const [showAISidebar, setShowAISidebar] = useState(true);

  /**
   * Tracks a sole selected element and schedules the latest canvas state to be
   * saved after ten seconds without another change.
   */
  const handleCanvasChange =(elements:readonly any[], appState:any, files:any)=>{

    setCanvasState(appState);
    
    const selectedIds = Object.keys(
      appState.selectedElementsIds || {}
    )

    if (selectedIds?.length==1) {
      const element = elements.find(
        (element)=>element.id==selectedIds[0]
      )
      setSelectedElement(element);
    } else {
       setSelectedElement(null);
    }

    //Cancel Prev Time
    if (saveTimeRef?.current)
    {

      clearTimeout(saveTimeRef.current)

    }
    saveTimeRef.current=setTimeout(() => {
      void (async () => {
        try {
          await saveCanvasChanges(elements, appState, files);
          toast.add({
            title:'Changes Saved!',
            type:'success'
          })
        } catch {
          toast.add({
            title:'Failed to save changes',
            type:'error'
          })
        }
      })();
    },10000)
  };

  const saveCanvasChanges = async (elements:readonly any[], appState:any, files:any) => {

    const result = await axios.post('/api/whiteboard',{
        elements:elements,
        appState:appState,
        files:files,
        projectId:projectid
    }, {
      validateStatus: (status) => status >= 200 && status < 300
    });

  }

  const changeTool = (tool:any) => {
    if(!excalidrawAPI) return;

    setActiveTool(tool);
    excalidrawAPI.setActiveTool({
      type:tool
    })

  }
  
  /**
   * Locates the point 60 pixels above the selected element's top center after
   * applying the canvas scroll offsets and zoom. Falls back to the origin until
   * both the selection and canvas state are available.
   */
  const getFloatingPosition=() => {
    if(!selectedElement || !canvasState)
    {
      return {left:0,top:0}
    }

    const zoom = canvasState.zoom?.value ?? 1

    const scrollX = canvasState.scrollX?.value ?? 0

    const scrollY = canvasState.scrollY?.value ?? 0

    const centerX = selectedElement.x + selectedElement.width / 2

    const screenX = (centerX + scrollX) * zoom 

    const screenY = (selectedElement.y + scrollY) * zoom

    return {
      left : screenX,
      top: screenY - 60
    }

  }

  const handlePropertyChange=(property:string, value:any)=>{
    if (!excalidrawAPI || !selectedElement) return ;

    const element =excalidrawAPI.getSceneElements();
    const updatedElement = element.map((element)=>{
       if(element.id!=selectedElement.id)
      {
        return element;
      }
      return {
      ...element,
      [property]:value,
      version: element.version+1,
      updated: Date.now()
      }
    });

    excalidrawAPI.updateScene({
      elements:updatedElement
    })


  }

  const handleDeleteElement=()=>{
    if (!excalidrawAPI || !selectedElement) return ;

      const elements = excalidrawAPI.getSceneElements();
      const updatedElements = elements.map((element)=>{
        if(element.id===selectedElement.id)
        {
          return {
            ...element,
            isDeleted:true,
            version: element.version + 1,
            updated: Date.now()
          }
        }
        return element

      })
        excalidrawAPI.updateScene({
      elements:updatedElements
    })

    setSelectedElement(null);

  }

  const handleOnDuplicate=()=>{
    if (!excalidrawAPI || !selectedElement) return ;

    const elements = excalidrawAPI.getSceneElements();
    const duplicateElement = {
      ...selectedElement,
      id: crypto.randomUUID(),
      x: selectedElement.x + 20,
      y: selectedElement.y + 20,
      seed: Math.floor(Math.random()*100000),
      version:1,
      updated:Date.now(),
      isDeleted:false,
    };
    excalidrawAPI.updateScene({
      elements:[
        ...elements,
        duplicateElement
      ]
    })
 
  }

  const handleBringFrontBack=(type:string)=>{
    if (!excalidrawAPI || !selectedElement) return ;

    const elements = excalidrawAPI.getSceneElements();

    const selected = elements.find((element)=>element.id===selectedElement.id);

      if(!selected) return ;
      const remainingElements = elements.filter((element)=>element.id!==selectedElement.id);

      if(type == 'front') {
        excalidrawAPI.updateScene({
          elements:[
            ...remainingElements,
            selected

          ]
        })
      } else {
         excalidrawAPI.updateScene({
          elements:[
            selected,
            ...remainingElements,
          ]
        })
      }

  } 

  const floatingPostion = getFloatingPosition();


  return (
    <div style={{height: "90vh"}}>
      <Excalidraw
      //@ts-ignore
      excalidrawAPI={(api)=>setExcalidrawAPI(api)} 
      onChange={handleCanvasChange} />
      <div className='absolute left-4 top-1/2 z-50 -translate-1/2 
      flex flex-col gap-1 rounded-2xl bg-white border p-1.5 shadow-xl'>

        {tools.map((tool) => {
           const Icon=tool.icon
           return (
            <button className={`flex h-10 w-10 items-center justify-center 
            rounded-xl transition hover:bg-primary/10 hover:cursor-pointer 
            ${activeTool==tool.name ? "bg-primary/10": null}`} 
            aria-label={tool.name}
            aria-pressed={activeTool === tool.name}
            onClick={()=>changeTool(tool.name)}>
                <Icon size='19' className={tool.color} />
            </button>
           )
        })}

      </div>
      <FloatingProperties 
      selectedElement={selectedElement} 
      position={floatingPostion}
      onPropertyChange={(property, value)=>handlePropertyChange(property, value)}
      onDelete={()=>handleDeleteElement()}
      onDuplicate={()=>handleOnDuplicate()}
      onBringToFront={()=>handleBringFrontBack("front")}
      onSendToBack={()=>handleBringFrontBack("back")} 
      />
      <div className='absolute right-15 bottom-3 z-50'>
        <Button size={'lg'} onClick={()=>setShowAISidebar(!showAISidebar)}>
          <Sparkle /> AI
        </Button>
      </div>
      {showAISidebar && (
       <AIFloatingSidebar
       excalidrawApi={excalidrawAPI}
       onDismiss={() => setShowAISidebar(false)}
       />
      )}
    </div>
  )
}

export default Whiteboard
