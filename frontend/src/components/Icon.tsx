import {
  AlertTriangle,
  BarChart3,
  Beef,
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  Bubbles,
  Building2,
  Calculator,
  Cat,
  Check,
  CheckCircle2,
  Circle,
  CircleDot,
  Clapperboard,
  ClipboardList,
  Cloud,
  Code2,
  Dna,
  Dog,
  Download,
  Dumbbell,
  Eye,
  EyeOff,
  FileEdit,
  FileText,
  Flag,
  Flame,
  FlaskConical,
  GitBranch,
  Globe,
  GraduationCap,
  Hash,
  Image,
  Inbox,
  Key,
  Landmark,
  Library,
  Lightbulb,
  Link2,
  Map,
  Martini,
  Medal,
  MessageCircle,
  MessageSquare,
  Microscope,
  Moon,
  Mountain,
  Network,
  Package,
  Palette,
  Panda,
  Paperclip,
  PenLine,
  Puzzle,
  Radar,
  RefreshCw,
  Rocket,
  School,
  Scissors,
  Search,
  SearchCheck,
  Send,
  Settings,
  Shell,
  Shuffle,
  Signal,
  Sparkles,
  Star,
  Target,
  Timer,
  Trash2,
  TreeDeciduous,
  Trophy,
  Type,
  Undo2,
  Unplug,
  User,
  Video,
  Wand2,
  Waves,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'

/**
 * 全局 emoji → Lucide 图标映射表。
 * 键均已去除 VS16(U+FE0F)变体选择符,查找时会自动归一化。
 */
const iconMap: Record<string, LucideIcon> = {
  // —— 通用 / 导航 ——
  '⚡': Zap,
  '⚙': Settings,
  '💬': MessageSquare,
  '💭': MessageCircle,
  '📊': BarChart3,
  '🗺': Map,
  '📚': Library,
  '🧠': Brain,
  '🎯': Target,
  '💡': Lightbulb,
  '⚠': AlertTriangle,
  '✓': Check,
  '✕': X,
  '✅': CheckCircle2,
  '🔄': RefreshCw,
  '🔍': Search,
  '🔎': SearchCheck,
  '🚀': Rocket,
  '🔥': Flame,
  '⭐': Star,
  '🏆': Trophy,
  '🏅': Medal,
  '🏁': Flag,
  '🌐': Globe,
  '🌍': Globe,
  '🔗': Link2,
  '📎': Paperclip,
  '🗑': Trash2,
  '🔑': Key,
  '🔧': Wrench,
  '📤': Send,
  '📥': Inbox,
  '📭': Inbox,
  '⬇': Download,
  '🖼': Image,
  '🎬': Clapperboard,
  '🎥': Video,
  '📋': ClipboardList,
  '📝': FileEdit,
  '📄': FileText,
  '📖': BookOpen,
  '📗': BookOpen,
  '📘': BookOpen,
  '📙': BookOpen,
  '📦': Package,
  '🎨': Palette,
  '🧩': Puzzle,
  '🤖': Bot,
  '👤': User,
  '✏': PenLine,
  '👁': Eye,
  '🙈': EyeOff,
  '🔮': Sparkles,
  '🪄': Wand2,
  '🌙': Moon,
  '☁': Cloud,
  '🧬': Dna,
  '🔌': Unplug,
  '🧪': FlaskConical,
  '🏛': Landmark,
  '📶': Signal,
  '✂': Scissors,
  '↩': Undo2,
  '🕸': Network,
  '🌳': TreeDeciduous,
  '🌿': GitBranch,
  '🏔': Mountain,
  '⛰': Mountain,
  '🧱': Building2,
  '🏗': Building2,
  '🔤': Type,
  '🔢': Hash,
  '🔟': Hash,
  '🧮': Calculator,
  '💻': Code2,
  '🏋': Dumbbell,
  '🎓': GraduationCap,
  '📡': Radar,
  '🫧': Bubbles,
  '🔀': Shuffle,
  '🐚': Shell,
  '🍸': Martini,
  '🌊': Waves,
  '🕳': CircleDot,
  '⏱': Timer,
  '🐮': Beef,
  // —— 头像 ——
  '🧑‍💻': Code2,
  '👨‍💻': Code2,
  '👩‍💻': Code2,
  '🧑‍🎓': GraduationCap,
  '👨‍🔬': Microscope,
  '👩‍🏫': School,
  '🧑‍🚀': Rocket,
  '👨‍💼': Briefcase,
  '👩‍💼': Briefcase,
  '🐱': Cat,
  '🐶': Dog,
  '🐼': Panda,
}

/** 彩色圆点(难度标识等),保留语义配色 */
const dotStyles: Record<string, string> = {
  '🔴': 'text-red-500 fill-red-500',
  '🟠': 'text-orange-400 fill-orange-400',
  '🟡': 'text-yellow-400 fill-yellow-400',
  '🟢': 'text-green-500 fill-green-500',
  '🔵': 'text-blue-500 fill-blue-500',
}

interface AppIconProps {
  /** emoji 字符(作为图标键) */
  name: string
  size?: number
  className?: string
  strokeWidth?: number
}

/**
 * 将数据中的 emoji 字符串渲染为统一的 Lucide 线性图标。
 * 未收录的 emoji 会原样回退显示,保证不破坏现有内容。
 */
export function AppIcon({ name, size = 16, className = '', strokeWidth = 2 }: AppIconProps) {
  const key = name.replace(/\uFE0F/g, '')

  if (dotStyles[key]) {
    return (
      <Circle
        size={Math.round(size * 0.55)}
        className={`${dotStyles[key]} shrink-0 ${className}`}
        strokeWidth={0}
      />
    )
  }

  const Icon = iconMap[key]
  if (!Icon) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none ${className}`}
        style={{ fontSize: size, width: size, height: size }}
      >
        {name}
      </span>
    )
  }

  return <Icon size={size} strokeWidth={strokeWidth} className={`shrink-0 ${className}`} />
}

export default AppIcon
