import { Textarea } from '@/components/ui/textarea'
import { Button } from '@base-ui/react'
import { convertToExcalidrawElements } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import axios from 'axios'
import {
  Monitor,
  Network,
  PencilRuler,
  Smartphone,
  Sparkles,
  Workflow,
  X,
  ArrowUp,
  Loader2Icon
} from 'lucide-react'
import React, { useState } from 'react'

type Props={
  excalidrawApi:ExcalidrawImperativeAPI | null
  onDismiss: () => void
}

const AiTools = [
    {
      name: 'Generate Diagram',
      desc: 'Create a visual diagram from an idea',
      icon: PencilRuler,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50',
      prompt: `
      You are an expert visual diagram generation agent.
      Your task is to convert the user's idea into a clear, structured, professional diagram.
      Instructions:
      - Understand the user's intent before generating.
      - Identify the main entities, concepts, steps, and relationships.
      - Create a clean virtual hierarchy.
      - Use rectangle for main concepts or processes.
      - Use diamonds only for dicussions.
      - Use arrows to show relationships or direction.
      - Keep labels short and readable.
      - Avoid overlapping elements.
      - Maintain consistent spacing between elements.
      - Organize the diagram from left-to-right or top-to-bottom depending on which is easiest to understand.
      - Add groups or sections when the diagram contains multiple categories. 
      - Prefer simple layout over overly complex diagrams.
      - Output only valid Excalidraw-compatible JSON elements.
      - Do not include markdown, explanation, or additional texts outside the JSON.
      `
    },
    {
      name: 'Flowchart',
      desc: 'Turn ideas into visual flows',
      icon: Workflow,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50',
      prompt: `
      You are an export flowchart generation agent.
      Convert the user's description into a professional flowchart.
      Instructions:
      - Identify the starting point, actions, decisions, branches and ending points.
      - Use rounded rectangles for start and end nodes.
      - Use rectangles for actions or processes.
      - Use diamonds for decisions.
      - Use arrows to connect nodes in the correct logical order.
      - Label decision arrows clearly, such as "Yes" and "No"
      - Branch secondary flows to the left or right.
      - Keep node labels concise.
      - Avoid crossing arrow whereever possible.
      - Maintain consistent node dimensions and spacing.
      `
    },
    {
      name: 'Architecture',
      desc: 'Design system architecture diagrams',
      icon: Network,
      iconColor: 'text-orange-600',
      iconBg: 'bg-orange-50',
      prompt: `
      You are a senior software architect and system design visualization agent.
      Convert the user's application or system description into a clear architecture diagram.
      Instructions:
      - Identify clients, frontend applications, backend services, APIs, databases, queues, storage and infrastructure.
      - Group related components into logical sections.
      - Show the direction of data flow using arrows.
      - Clearly label important connections when useful.
      - Place users or client applications on the left or top.
      - Place application services in the center.
      - Place databases, storage and infrastructure on the right or bottom.
      - Place third-party APIs or external sources in a separate section.
      - Use consistent component sizes.
      - Keep architecture readable and avoid unnecessary implementation details.
      - Include technologies mentioned by the user as labels.
      - Infer standard architectural components only when necessary.
      - Do not invent unncessary technologies. 
      `
    },
    {
      name: 'Web Mockup',
      desc: 'Generate website wireframes',
      icon: Monitor,
      iconColor: 'text-cyan-600',
      iconBg: 'bg-cyan-50',
      prompt: `
      You are an expert product designer and web UI wireframe generation agent.
      Convert the user's description into a professional desktop web application wireframe.
      Instructions:
      - Create the interface using simple wireframe-style Excalidraw elements.
      - Assume a desktop viewport unless the user specifies otherwise.
      - Identify the main page structure and user goals.
      - Include relevant UI sections such as:
          - Navbar or header
          - Sidebar
          - Page title
          - Search
          - Filters
          - Cards
          - Tables
      `
    },
    {
      name: 'Mobile Mockup',
      desc: 'Create mobile app wireframes',
      icon: Smartphone,
      iconColor: 'text-pink-600',
      iconBg: 'bg-pink-50',
      prompt: `
      You are an expert product designer and mobile UI wireframe generation agent.
      Convert the user's description into a professional mobile application wireframe.
      Instructions:
      - Create the interface using simple wireframe-style Excalidraw elements.
      - Assume a mobile viewport unless the user specifies otherwise.
      - Identify the main page structure and user goals.
      - Include relevant UI sections such as:
          - Navbar or header
          - Sidebar
          - Page title
          - Search
          - Filters
          - Cards
          - Tables
      `
    },
  ]

function AIFloatingSidebar({excalidrawApi, onDismiss}:Props) {
  const [selectedTool, setSelectedTool] = useState("Generate Diagrams");
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);

  const getEmptyCanvasPosition = () =>{
    if(!excalidrawApi)
    {
      return {x:100,y:100}
    }

    const elements = excalidrawApi.getSceneElements().filter(element=>!element.isDeleted)

    if(elements.length==0)
    {
      return {x:100,y:100}
    }

    const maxRight=Math.max(...elements.map((element)=>element.x+element.width))
    const minTop=Math.min(...elements.map((element)=>element.y))

    return {
      x:maxRight + 150,
      y:minTop
    }
  }

  const addAiPlaceholder = () => {
    if (!excalidrawApi) return [];

    const position = getEmptyCanvasPosition();

    const placeHolderElements = 
      convertToExcalidrawElements([
        {
          type: 'rectangle',
          x: position.x,
          y: position.y,
          width:42,
          height: 250,
          backgroundColor: "#f5f3ff",
          strokeColor: "#8b5cf6",
          fillStyle: "solid",
          strokeWidth: 2,
          roughness: 0,
          roundness: {
            type: 3
          }
        }
      ])
      const currentElements = excalidrawApi.getSceneElements();

      excalidrawApi.updateScene({
        elements: [
          ...currentElements,
          ...placeHolderElements
        ]
      })

      return placeHolderElements.map(element => element.id);
  }

  const onClickGenerate= async ()=>{
    if (!excalidrawApi) return;

    console.log("userInput" + userInput);
    console.log("selectedTool" + selectedTool);
    setLoading(true);
    const placeholderIds = addAiPlaceholder();
    const currentAiTool=AiTools.find(tool=>tool.name == selectedTool);

    try {
      const result = await axios.post('/api/ai', {
        userInput: userInput,
        type: currentAiTool?.name,
        systemPrompt: currentAiTool?.prompt
      });

      const responseData: unknown = result.data;
      if (
        typeof responseData !== 'object'
        || responseData === null
        || !('result' in responseData)
        || typeof responseData.result !== 'string'
        || responseData.result.trim().length === 0
      ) {
        throw new Error('Invalid AI response');
      }

      const parsedElements: unknown = JSON.parse(responseData.result);
      if (
        !Array.isArray(parsedElements)
        || parsedElements.length === 0
        || !parsedElements.every((element) => {
          if (typeof element !== 'object' || element === null) return false;

          const candidate = element as Record<string, unknown>;
          return typeof candidate.type === 'string'
            && typeof candidate.x === 'number'
            && Number.isFinite(candidate.x)
            && typeof candidate.y === 'number'
            && Number.isFinite(candidate.y)
            && (candidate.type !== 'text' || typeof candidate.text === 'string');
        })
      ) {
        throw new Error('AI response did not contain valid Excalidraw elements');
      }

      const elements = parsedElements as Array<{
        type: string
        x: number
        y: number
        [key: string]: unknown
      }>;
      const position = getEmptyCanvasPosition();
      const minX = Math.min(...elements.map((element) => element.x));
      const minY = Math.min(...elements.map((element) => element.y));
      const positionedElements = elements.map((element) => ({
        ...element,
        x: element.x + position.x - minX,
        y: element.y + position.y - minY
      }));
      const generatedElements = convertToExcalidrawElements(
        positionedElements as NonNullable<Parameters<typeof convertToExcalidrawElements>[0]>,
        { regenerateIds: true }
      );

      excalidrawApi.updateScene({
        elements: [...excalidrawApi.getSceneElements(), ...generatedElements]
      });
    } catch (error) {
      console.error('Failed to generate AI content', error);
    } finally {
      setLoading(false);
      removeAiPlaceholder(placeholderIds);
    }
  }

  const removeAiPlaceholder = (placeholderIds: string[]) => {
    if (!excalidrawApi || placeholderIds.length === 0) return;

    const elements = excalidrawApi.getSceneElements();

    const updateElements = elements.filter(element => !placeholderIds.includes(element.id));

    excalidrawApi.updateScene({ elements: updateElements });
  }

  return (
    <div
      className="
        absolute z-50 right-6 bottom-20
        w-390px
        overflow-hidden
        rounded-2xl
        border border-gray-200/80
        bg-white/95
        shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]
        backdrop-blur-xl
      "
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-5 pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="
                flex h-9 w-9 items-center justify-center
                rounded-xl
                bg-linear-to-br from-violet-500 to-blue-500
                text-white
                shadow-sm
              "
            >
              <Sparkles size={18} />
            </div>

            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">
                AI Assistant
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Turn ideas into visuals
              </p>
            </div>
          </div>

          <button
            aria-label="Close AI assistant"
            onClick={onDismiss}
            className="
              flex h-8 w-8 items-center justify-center
              rounded-lg
              text-gray-400
              transition
              hover:bg-gray-100
              hover:text-gray-700
            "
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Tools */}
      <div className="px-5 pt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Create with AI
          </span>

          <span className="text-[11px] text-gray-400">
            5 tools
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {AiTools.map((tool) => {
            const Icon = tool.icon
            const isSelected = selectedTool === tool.name

            return (
              <button
                key={tool.name}
                onClick={() => setSelectedTool(tool.name)}
                className="
                  group
                  flex items-start gap-2.5
                  rounded-xl
                  border border-gray-100
                  bg-gray-50/50
                  p-3
                  text-left
                  transition-all
                  duration-200
                  hover:border-gray-200
                  hover:bg-white
                  hover:shadow-sm
                "
              >
                <div
                  className={`
                    flex h-8 w-8 shrink-0
                    items-center justify-center
                    rounded-lg
                    ${tool.iconBg}
                    ${tool.iconColor}
                    transition-transform
                    group-hover:scale-105
                  `}
                >
                  <Icon size={18} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-800">
                    {tool.name}
                  </p>

                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-gray-400">
                    {tool.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Prompt */}
      <div className="px-5 pb-5 pt-5">
        <div className="mb-2">
          <label className="text-xs font-semibold text-gray-700">
            Describe what you want to create
          </label>
          <p className="mt-0.5 text-[11px] text-gray-400">
            Be as specific as you'd like
          </p>
        </div>

        <div
          className="
            relative
            rounded-xl
            border border-gray-200
            bg-gray-50
            transition
            focus-within:border-violet-300
            focus-within:bg-white
            focus-within:ring-2
            focus-within:ring-violet-100
          "
        >
          <Textarea
            placeholder="E.g. Create a customer onboarding flow with decision points..."
            className="
              min-h-90px
              resize-none
              border-0
              bg-transparent
              pr-12
              text-xs
              shadow-none
              focus-visible:ring-0
            "
            onChange={(event)=>setUserInput(event.target.value)}
          />

          <Button
            className="
              absolute
              bottom-2.5
              right-2.5
              flex h-8 w-8
              items-center justify-center
              rounded-lg
              bg-gray-900
              p-0
              text-white
              shadow-sm
              transition
              hover:bg-gray-800
              disabled:opacity-50
            "
            disabled={loading}
            onClick={onClickGenerate}
          > {loading && <Loader2Icon className='animate-spin'/>} Generate
            <ArrowUp size={14} />
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-gray-400">
            AI-generated content may need review
          </span>

          <span className="text-[10px] text-gray-400">
            ⌘ ↵ to generate
          </span>
        </div>
      </div>
    </div>
  )
}

export default AIFloatingSidebar;