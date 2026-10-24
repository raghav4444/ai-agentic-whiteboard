"use client"
import { useUser } from '@clerk/nextjs';
import React, { useContext, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Zap, Layers, CheckCircle2 } from '@/lib/icons';
import CreateNewBoardDialog from './CreateNewBoardDialog';
import { UserDetailContext } from '@/context/UserDetailContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

const prompts = [
    "Microservices architecture with Next.js, API Gateway, Kafka & Neon",
    "E-Commerce checkout and Stripe payment flow with fallback",
    "User authentication flowchart with MFA and session token refresh",
    "High-fidelity SaaS product landing page wireframe",
]

const subscribeToNothing = () => () => {}

function getTimeGreeting() {
    const hour = new Date().getHours()
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
}

function WelcomeBanner() {
    const { user } = useUser();
    const { userDetail } = useContext(UserDetailContext) || {};
    const [showAiModal, setShowAiModal] = useState(false);
    // Read the clock through an external store so the server renders a stable
    // fallback and the client updates after hydration without an effect.
    const greeting = useSyncExternalStore(
        subscribeToNothing,
        getTimeGreeting,
        () => "Welcome back"
    );

    return (
        <div
            data-glass-reactive
            className="glass-dark relative mt-5 overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10"
        >
            {/* Light moving through smoked glass. */}
            <div
                aria-hidden
                className="hero-light pointer-events-none absolute -left-32 -top-36 size-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(42,171,112,0.42),transparent_68%)] blur-2xl"
            />
            <div
                aria-hidden
                className="hero-light hero-light-late pointer-events-none absolute -bottom-44 left-[34%] size-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(229,196,119,0.24),transparent_68%)] blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.075)_1px,transparent_1.1px)] bg-[size:26px_26px] opacity-35 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.34),transparent)]"
            />
            <div className="liquid-lens liquid-drift pointer-events-none absolute -bottom-32 left-[44%] hidden size-64 lg:block xl:size-72" />

            <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
                <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="size-1.5 rounded-full bg-[#5ee0a4] shadow-[0_0_0_4px_rgba(94,224,164,0.12)]" />
                        <span className="mono-label text-[#a7e8c8]">AI-assisted systems thinking</span>
                        <span className="hidden h-px w-10 bg-white/20 sm:block" />
                        <span className="mono-label hidden text-white/40 sm:block">Studio · 01</span>
                    </div>

                    <h1 className="mt-5 text-[2.3rem] font-semibold leading-[0.95] tracking-[-0.058em] text-[#f7f4eb] sm:text-[3rem] lg:text-[3.5rem]">
                        {greeting},<br />
                        <span className="font-editorial text-[#a7e8c8]">{user?.firstName || "creator"}.</span>
                    </h1>

                    <p className="mt-5 max-w-[34rem] text-[14px] leading-[1.75] text-white/62">
                        Make ambitious technical ideas visible. Generate architectures,
                        workflows and wireframes on an infinite canvas — then keep the
                        specification beside them in SmartDoc.
                    </p>

                    <div className="mt-7 flex flex-wrap items-center gap-2.5">
                        <CreateNewBoardDialog
                            buttonVariant="inverse"
                            buttonLabel="Start a board"
                            buttonClassName="h-11 gap-2 px-5.5 text-[12.5px]"
                        />
                        <Button
                            variant="onDark"
                            onClick={() => setShowAiModal(true)}
                            className="h-11 gap-2 px-4.5 text-[12.5px]"
                        >
                            <Wand2 size={15} className="text-[#a7e8c8]" />
                            What AI can draw
                        </Button>
                    </div>

                    <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-medium text-white/44">
                        <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-[#5ee0a4]/70" /> Infinite canvas</span>
                        <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-white/40" /> Editable output</span>
                        <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-white/40" /> Living spec</span>
                    </div>
                </div>

                {/* The reference transaction stack: compact glass capsules with quiet contrast. */}
                <div className="lg:pl-4">
                    <div className="mb-2.5 flex items-center justify-between px-1">
                        <span className="mono-label text-white/42">Workspace pulse</span>
                        <span className="mono-label flex items-center gap-1.5 text-[#a7e8c8]">
                            <span className="relative flex size-1.5">
                                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#5ee0a4] opacity-50" />
                                <span className="relative inline-flex size-1.5 rounded-full bg-[#5ee0a4]" />
                            </span>
                            Live
                        </span>
                    </div>

                    <div className="space-y-2" aria-label="Workspace status">
                        <HeroRow
                            icon={<Sparkles size={15} />}
                            label="AI credits"
                            detail="Ready when you are"
                            value={`${userDetail?.user?.credits ?? 3} left`}
                            accent
                        />
                        <HeroRow
                            icon={<Layers size={15} />}
                            label="Canvas"
                            detail="Infinite surface"
                            value="Unlimited"
                        />
                        <HeroRow
                            icon={<CheckCircle2 size={15} />}
                            label="Auto-save"
                            detail="Every change"
                            value="On"
                        />
                        <HeroRow
                            icon={<Zap size={15} />}
                            label="Model"
                            detail="Gemini"
                            value="Flash"
                        />
                    </div>
                </div>
            </div>

            <Dialog open={showAiModal} onOpenChange={setShowAiModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <p className="mono-label text-[#2aab70]">Prompt library</p>
                        <DialogTitle className="mt-2 flex items-center gap-2 text-[24px] leading-[1.05] tracking-[-0.045em]">
                            <span className="font-editorial text-[#065f46]">Begin</span> with a sentence.
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-1 text-xs">
                        <p className="mb-3 text-[12.5px] leading-relaxed text-[#6c726d]">
                            Open a board, choose the AI assistant, and start from any of these. The result lands on the canvas as editable shapes — not a screenshot.
                        </p>
                        {prompts.map((prompt, idx) => (
                            <div
                                key={idx}
                                className="glass-panel-soft flex items-start gap-3 p-3.5 text-[11.5px] leading-relaxed text-[#4d534e]"
                            >
                                <span className="mono-label mt-0.5 shrink-0 text-[#2aab70]">0{idx + 1}</span>
                                <span>&ldquo;{prompt}&rdquo;</span>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function HeroRow({
    icon,
    label,
    detail,
    value,
    accent = false,
}: {
    icon: React.ReactNode
    label: string
    detail: string
    value: string
    accent?: boolean
}) {
    return (
        <div
            data-glass-reactive
            className="glass-row flex items-center gap-3 px-3.5 py-3"
        >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${accent ? 'border-[#5ee0a4]/25 bg-[#5ee0a4]/12 text-[#a7e8c8]' : 'border-white/12 bg-white/6 text-white/60'}`}>
                {icon}
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#f7f4eb]/92">{label}</p>
                <p className="mt-1.5 truncate text-[10px] text-white/42">{detail}</p>
            </div>
            <span className={`text-[12px] font-semibold tabular-nums ${accent ? 'text-[#a7e8c8]' : 'text-white/72'}`}>
                {value}
            </span>
        </div>
    )
}

export default WelcomeBanner
