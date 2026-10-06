"use client"
import { Separator } from '@/components/ui/separator'
import { BringToFront, Circle, Copy, Diamond, Lock, Palette, SendToBack, Square, Trash2, Type } from 'lucide-react'
import React, { useState } from 'react'


type Props = {
    selectedElement:any
    position:{
        left: number
        top: number
    }
    onDelete?: () => void
    onDuplicate?: () => void
    onLock?: () => void

    onBringToFront?: () => void
    onSendToBack?: () => void 

    onPropertyChange?: (
      property: string,
      value: any
    ) => void
}

const COLORS = [
  "#1e1e1e",
  "#e31313"
]

/**
 * Displays the selected element's type and palette button at an absolute
 * position, or renders nothing when there is no selected element.
 */
function FloatingProperties({ selectedElement, position, 
    onDelete, 
    onDuplicate, 
    onLock, 
    onBringToFront, 
    onSendToBack,  
    onPropertyChange }: Props) {

  
  const [dragOffset, setDragOffset] = useState({
    x: 0,
    y: 0,
  });

  if (!selectedElement) return null;
  
  const type = selectedElement.type;


  const isText = type === "text";
  const isShape = ["rectangle","ellipse","diamond"].includes(type);
  const isLine = type === "line";
  const isArrow = type === "arrow";
  const isFreeDraw = type === "freedraw"; 

  const toggleColor = () => {
    const currentColorIndex = COLORS.indexOf(selectedElement.strokeColor);
    const nextColor = COLORS[(currentColorIndex + 1) % COLORS.length];
    onPropertyChange?.("strokeColor", nextColor);
  };

  const toggleFont = () => {
    onPropertyChange?.("fontFamily", selectedElement.fontFamily === 1 ? 2 : 1);
  };

  const increaseFontSize = () => {
    onPropertyChange?.("fontSize", (selectedElement.fontSize || 20) + 2);
  };


  return (
    <div className='absolute z-100 flex -translate-x-1/2 items-center gap-1' style={{
        left: position.left,
        top: position.top, 
    }}>
      {/* Element Properties */}
      <div className='flex h-9 items-center gap-2 rounded-lg px-2 text-sm'>
        {type === "rectangle" && <Square size={17} />}
        {type === "ellipse" && <Circle size={17} />}
        {type === "diamond" && <Diamond size={17} />}
        {isText && <Type size={17} />}
        {isLine && <Type size={17} />}
        {isArrow && <Type size={17} />}
        {isFreeDraw && <Type size={17 }/>}

        <span className='capitalize'>{type}</span>

      </div>

    <Separator />
   

      {/* COMMON PROPERTY */}
      <button
        className='flex h-9 v-9 items-center justify-center rounded-xl'
        aria-label='Change color'
        onClick={toggleColor}
      >
        <Palette size={18} />
      </button>

       {/* TEXT */}

       {isText && (
          <>
            <Separator />
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={toggleFont}>
              Font
            </button>
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={increaseFontSize}>
              {selectedElement.fontSize || 20}px

            </button>
          </>
       )}

       {/* LINE */}

       {isLine && (
          <>
            <Separator />
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={toggleFont}>
              Font
            </button>
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={increaseFontSize}>
              {selectedElement.fontSize || 20}px

            </button>
          </>
       )}

       {/* ARROW */}

       {isArrow && (
          <>
            <Separator />
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={toggleFont}>
              Font
            </button>
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={increaseFontSize}>
              {selectedElement.fontSize || 20}px

            </button>
          </>
       )}

       {/* FREEDRAW */}

       {isFreeDraw && (
          <>
            <Separator />
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={toggleFont}>
              Font
            </button>
            <button className='h-9 rounded-lg px-3 text-sm hover:bg-green-50' onClick={increaseFontSize}>
              {selectedElement.fontSize || 20}px

            </button>
          </>
       )}

      <Separator />
      <button className='flex h-9 w-9 items-center justify-center rounded-xl hover:bg-green-50' aria-label='Delete' onClick={onDelete}>
        <Trash2 size={17} />
      </button>
      <button className='flex h-9 w-9 items-center justify-center rounded-xl hover:bg-green-50' aria-label='Duplicate' onClick={onDuplicate}>
        <Copy size={17} />
      </button>
      <button className='flex h-9 w-9 items-center justify-center rounded-xl hover:bg-green-50' aria-label='Lock' onClick={onLock}>
        <Lock size={17} />
      </button>
      <button className='flex h-9 w-9 items-center justify-center rounded-xl hover:bg-green-50' aria-label='Bring to front' onClick={onBringToFront}>
        <BringToFront size={17} />
      </button>
      <button className='flex h-9 w-9 items-center justify-center rounded-xl hover:bg-green-50' aria-label='Send to back' onClick={onSendToBack}>
        <SendToBack size={17} />
      </button>




    </div>
  )
}

export default FloatingProperties;
