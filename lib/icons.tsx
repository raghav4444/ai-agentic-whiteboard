'use client';

import { forwardRef } from 'react';
import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { HugeiconsIconProps, IconSvgElement } from '@hugeicons/react';
import {
  Add01Icon, AiBrain01Icon, Alert02Icon, ArrowDown01Icon, ArrowDown02Icon,
  ArrowDownToLineIcon, ArrowLeft01Icon, ArrowLeft02Icon, ArrowRight01Icon,
  ArrowRight02Icon, ArrowUp01Icon, ArrowUp02Icon, ArrowUpRight01Icon,
  ArrowUpToLineIcon, BulbIcon, Calendar01Icon, Cancel01Icon,
  CheckmarkCircle02Icon, CircleDotIcon, CircleIcon, ComputerIcon, Copy01Icon,
  CubeIcon, Cursor01Icon, Delete02Icon, DiamondIcon, Download01Icon,
  DragDropVerticalIcon, DropletIcon, EraserIcon, File01Icon, FileScriptIcon,
  FloppyDiskIcon, Folder01Icon, GitBranchIcon, Globe02Icon, GridViewIcon,
  HandIcon, Heading01Icon, HierarchySquare02Icon, Image01Icon,
  InformationCircleIcon, Layers01Icon, LeftToRightListBulletIcon, Link01Icon,
  Loading03Icon, LockKeyIcon, LockOpenIcon, MagicWand01Icon, MinusSignIcon,
  MoreHorizontalIcon as MoreHorizontalData, MoreVerticalIcon, OctagonXIcon as OctagonXData,
  PaintBoardIcon, PauseIcon as PauseData, PencilEdit01Icon, PencilEdit02Icon,
  PencilRulerIcon, PlayIcon as PlayData, RotateLeft01Icon, Search01Icon, SidebarLeftIcon,
  Share01Icon, SmartPhone01Icon, SourceCodeIcon, SquareIcon, Target01Icon, TextAlignCenterIcon,
  TextAlignLeftIcon, TextAlignRightIcon, TextBoldIcon, TextIcon, Tick02Icon,
  TypeCursorIcon, VolumeHighIcon, VolumeOffIcon, WorkflowSquare01Icon, FlashIcon,
} from '@hugeicons/core-free-icons';

export type IconProps = Omit<HugeiconsIconProps, 'icon' | 'strokeWidth'> & { strokeWidth?: SVGProps<SVGSVGElement>['strokeWidth'] };
export type AppIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;
export type LucideIcon = AppIcon;

/**
 * One rounded-stroke icon system for every app-owned surface. Semantic names
 * keep existing controls, tool registries and Base UI render slots unchanged;
 * each renderer uses real Hugeicons data, never the previous icon geometry.
 * Named imports and pure exports let the bundler discard unused artwork.
 */
function createIcon(icon: IconSvgElement, name: string): AppIcon {
  const Component = forwardRef<SVGSVGElement, IconProps>(function AppIconRenderer({ size = 24, color = 'currentColor', strokeWidth = 1.75, ...props }, ref) {
    const labelled = Boolean(props['aria-label'] || props['aria-labelledby']);
    return (
      <HugeiconsIcon
        {...props}
        ref={ref}
        icon={icon}
        size={size}
        color={color}
        strokeWidth={typeof strokeWidth === 'number' ? strokeWidth : undefined}
        aria-hidden={props['aria-hidden'] ?? (labelled ? undefined : true)}
        role={props.role ?? (labelled ? 'img' : undefined)}
        focusable={props.focusable ?? 'false'}
        data-icon={name}
      />
    );
  });
  Component.displayName = `Hugeicons.${name}`;
  return Component;
}

export const ArrowRight = /* @__PURE__ */ createIcon(ArrowRight02Icon, 'arrow-right');
export const ArrowLeft = /* @__PURE__ */ createIcon(ArrowLeft02Icon, 'arrow-left');
export const ArrowUp = /* @__PURE__ */ createIcon(ArrowUp02Icon, 'arrow-up');
export const ArrowDown = /* @__PURE__ */ createIcon(ArrowDown02Icon, 'arrow-down');
export const ArrowUpRight = /* @__PURE__ */ createIcon(ArrowUpRight01Icon, 'arrow-up-right');
export const ArrowDownToLine = /* @__PURE__ */ createIcon(ArrowDownToLineIcon, 'send-to-back');
export const ArrowUpToLine = /* @__PURE__ */ createIcon(ArrowUpToLineIcon, 'bring-to-front');
export const ChevronDown = /* @__PURE__ */ createIcon(ArrowDown01Icon, 'chevron-down');
export const ChevronUp = /* @__PURE__ */ createIcon(ArrowUp01Icon, 'chevron-up');
export const ChevronLeft = /* @__PURE__ */ createIcon(ArrowLeft01Icon, 'chevron-left');
export const ChevronRight = /* @__PURE__ */ createIcon(ArrowRight01Icon, 'chevron-right');
export const Check = /* @__PURE__ */ createIcon(Tick02Icon, 'check');
export const CheckCircle2 = /* @__PURE__ */ createIcon(CheckmarkCircle02Icon, 'check-circle');
export const X = /* @__PURE__ */ createIcon(Cancel01Icon, 'close');
export const Info = /* @__PURE__ */ createIcon(InformationCircleIcon, 'information');
export const TriangleAlert = /* @__PURE__ */ createIcon(Alert02Icon, 'warning');
export const OctagonX = /* @__PURE__ */ createIcon(OctagonXData, 'error');
export const Loader2 = /* @__PURE__ */ createIcon(Loading03Icon, 'loading');
export const Search = /* @__PURE__ */ createIcon(Search01Icon, 'search');
export const Plus = /* @__PURE__ */ createIcon(Add01Icon, 'add');
export const Minus = /* @__PURE__ */ createIcon(MinusSignIcon, 'minus');
export const MoreHorizontal = /* @__PURE__ */ createIcon(MoreHorizontalData, 'more-horizontal');
export const MoreVertical = /* @__PURE__ */ createIcon(MoreVerticalIcon, 'more-vertical');
export const PanelLeft = /* @__PURE__ */ createIcon(SidebarLeftIcon, 'sidebar');
export const LayoutGrid = /* @__PURE__ */ createIcon(GridViewIcon, 'grid-view');
export const Folder = /* @__PURE__ */ createIcon(Folder01Icon, 'folder');
export const Calendar = /* @__PURE__ */ createIcon(Calendar01Icon, 'calendar');
export const Trash2 = /* @__PURE__ */ createIcon(Delete02Icon, 'delete');
export const Edit3 = /* @__PURE__ */ createIcon(PencilEdit02Icon, 'edit');
export const ExternalLink = /* @__PURE__ */ createIcon(ArrowUpRight01Icon, 'external-link');
export const Save = /* @__PURE__ */ createIcon(FloppyDiskIcon, 'save');
export const Share = /* @__PURE__ */ createIcon(Share01Icon, 'share');
export const Copy = /* @__PURE__ */ createIcon(Copy01Icon, 'copy');
export const Download = /* @__PURE__ */ createIcon(Download01Icon, 'download');
export const RotateCcw = /* @__PURE__ */ createIcon(RotateLeft01Icon, 'reset');
export const Play = /* @__PURE__ */ createIcon(PlayData, 'play');
export const Pause = /* @__PURE__ */ createIcon(PauseData, 'pause');
export const Volume2 = /* @__PURE__ */ createIcon(VolumeHighIcon, 'volume');
export const VolumeX = /* @__PURE__ */ createIcon(VolumeOffIcon, 'mute');

// Use an intentional assistant/brain symbol rather than scattered generic
// sparkle artwork. The semantic alias avoids changing any AI-tool behavior.
export const Sparkles = /* @__PURE__ */ createIcon(AiBrain01Icon, 'ai-assistant');
export const Wand2 = /* @__PURE__ */ createIcon(MagicWand01Icon, 'generate');
export const Lightbulb = /* @__PURE__ */ createIcon(BulbIcon, 'idea');
export const Layers = /* @__PURE__ */ createIcon(Layers01Icon, 'layers');
export const Network = /* @__PURE__ */ createIcon(HierarchySquare02Icon, 'architecture');
export const Workflow = /* @__PURE__ */ createIcon(WorkflowSquare01Icon, 'workflow');
export const GitBranch = /* @__PURE__ */ createIcon(GitBranchIcon, 'branch');
export const Monitor = /* @__PURE__ */ createIcon(ComputerIcon, 'desktop');
export const Smartphone = /* @__PURE__ */ createIcon(SmartPhone01Icon, 'mobile');
export const HelpCircle = /* @__PURE__ */ createIcon(InformationCircleIcon, 'help');
export const FileText = /* @__PURE__ */ createIcon(File01Icon, 'document');
export const FileCode2 = /* @__PURE__ */ createIcon(FileScriptIcon, 'technical-document');
export const Code = /* @__PURE__ */ createIcon(SourceCodeIcon, 'code');
export const Bold = /* @__PURE__ */ createIcon(TextBoldIcon, 'bold');
export const Heading = /* @__PURE__ */ createIcon(Heading01Icon, 'heading');
export const List = /* @__PURE__ */ createIcon(LeftToRightListBulletIcon, 'list');
export const Type = /* @__PURE__ */ createIcon(TextIcon, 'text');
export const TextCursorInput = /* @__PURE__ */ createIcon(TypeCursorIcon, 'text-cursor');
export const MousePointer2 = /* @__PURE__ */ createIcon(Cursor01Icon, 'cursor');
export const Hand = /* @__PURE__ */ createIcon(HandIcon, 'pan');
export const Pencil = /* @__PURE__ */ createIcon(PencilEdit01Icon, 'draw');
export const PencilRuler = /* @__PURE__ */ createIcon(PencilRulerIcon, 'diagram');
export const Eraser = /* @__PURE__ */ createIcon(EraserIcon, 'eraser');
export const Square = /* @__PURE__ */ createIcon(SquareIcon, 'rectangle');
export const Circle = /* @__PURE__ */ createIcon(CircleIcon, 'circle');
export const Diamond = /* @__PURE__ */ createIcon(DiamondIcon, 'diamond');
export const CircleDot = /* @__PURE__ */ createIcon(CircleDotIcon, 'flow');
export const AlignLeft = /* @__PURE__ */ createIcon(TextAlignLeftIcon, 'align-left');
export const AlignCenter = /* @__PURE__ */ createIcon(TextAlignCenterIcon, 'align-center');
export const AlignRight = /* @__PURE__ */ createIcon(TextAlignRightIcon, 'align-right');
export const Palette = /* @__PURE__ */ createIcon(PaintBoardIcon, 'palette');
export const Droplet = /* @__PURE__ */ createIcon(DropletIcon, 'fill');
export const GripVertical = /* @__PURE__ */ createIcon(DragDropVerticalIcon, 'drag-handle');
export const ImageIcon = /* @__PURE__ */ createIcon(Image01Icon, 'image');
export const Lock = /* @__PURE__ */ createIcon(LockKeyIcon, 'lock');
export const Unlock = /* @__PURE__ */ createIcon(LockOpenIcon, 'unlock');
export const Box = /* @__PURE__ */ createIcon(CubeIcon, 'design');
export const Crosshair = /* @__PURE__ */ createIcon(Target01Icon, 'target');
export const Globe = /* @__PURE__ */ createIcon(Globe02Icon, 'client');
export const Link2 = /* @__PURE__ */ createIcon(Link01Icon, 'connect');
export const Zap = /* @__PURE__ */ createIcon(FlashIcon, 'system');
export const Layers3 = Layers;
export const Code2 = Code;
export const Ellipsis = MoreHorizontal;
export const ArrowDownIcon = ArrowDown;
export const CheckIcon = Check;
export const CircleCheckIcon = CheckCircle2;
export const ChevronDownIcon = ChevronDown;
export const ChevronUpIcon = ChevronUp;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;
export const Loader2Icon = Loader2;
export const InfoIcon = Info;
export const TriangleAlertIcon = TriangleAlert;
export const OctagonXIcon = OctagonX;
export const SearchIcon = Search;
export const XIcon = X;

export const MinusIcon = Minus;
export const MoreHorizontalIcon = MoreHorizontal;
export const PanelLeftIcon = PanelLeft;
