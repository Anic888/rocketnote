// src/icons.ts — Centralized Lucide icon exports + getFileIcon replacement
import type { LucideIcon } from 'lucide-react';

// Re-export all icons used across the app
export {
  FilePlus, FolderOpen, Folder, Save, Undo2, Redo2,
  Search, SearchCode, Lock, Unlock, Cloud, Camera, Columns2,
  Maximize, PanelLeft, Terminal, GitBranch, Bot, Wrench,
  ClipboardList, Scissors, BarChart3, Settings, Moon, Sun,
  Heart, File, FileCode, FileJson, FileText, Bookmark,
  Check, Timer, Coffee, Eye, EyeOff, Shield, AlertTriangle,
  Key, Trash2, Plus, Pencil, Lightbulb, Bug, RefreshCw,
  Download, Upload, ChevronUp, ChevronDown, ChevronRight,
  Copy, Hash, Link, Type, Ticket, Clock, Palette, Scale,
  Rocket, BookOpen, Globe, Package, Image, TestTube,
  Zap, Brain, Gem, Circle, User, Send, Fingerprint,
  MessageSquare, X, FolderPlus, Play, Coins,
  Square, Maximize2, ArrowUp, ArrowDown,
  ExternalLink, Home, Loader2, HardDrive, Database,
  ScrollText, Braces, FileWarning, Keyboard, Target, Cpu,
  MoreHorizontal, Minimize2, Star
} from 'lucide-react';

export type { LucideIcon } from 'lucide-react';

// --- getFileIcon: returns a LucideIcon component instead of an emoji string ---

import {
  File as FileIcon, FileCode as FileCodeIcon, FileJson as FileJsonIcon,
  FileText as FileTextIcon, Image as ImageIcon, Package as PackageIcon,
  Folder as FolderIcon, FolderOpen as FolderOpenIcon, Globe as GlobeIcon,
  Palette as PaletteIcon, TestTube as TestTubeIcon, Settings as SettingsIconAlias,
  GitBranch as GitBranchIcon, Cpu as CpuIcon, HardDrive as HardDriveIcon,
  BookOpen as BookOpenIcon, Lock as LockIcon, FileWarning as FileWarningIcon,
  Database as DatabaseIcon, Terminal as TerminalIcon, ScrollText as ScrollTextIcon,
  Braces as BracesIcon
} from 'lucide-react';

const folderIcons: Record<string, LucideIcon> = {
  'src': FolderIcon, 'lib': BookOpenIcon, 'node_modules': PackageIcon,
  'public': GlobeIcon, 'assets': PaletteIcon, 'images': ImageIcon,
  'img': ImageIcon, 'docs': FileTextIcon, 'test': TestTubeIcon,
  'tests': TestTubeIcon, '__tests__': TestTubeIcon, 'spec': TestTubeIcon,
  'config': SettingsIconAlias, '.git': GitBranchIcon, '.vscode': CpuIcon,
  'build': HardDriveIcon, 'dist': HardDriveIcon, 'out': HardDriveIcon,
  'target': HardDriveIcon,
};

const fileIcons: Record<string, LucideIcon> = {
  'js': FileCodeIcon, 'mjs': FileCodeIcon, 'cjs': FileCodeIcon, 'jsx': FileCodeIcon,
  'ts': FileCodeIcon, 'tsx': FileCodeIcon, 'py': FileCodeIcon, 'rb': FileCodeIcon,
  'rs': FileCodeIcon, 'go': FileCodeIcon, 'java': FileCodeIcon, 'kt': FileCodeIcon,
  'swift': FileCodeIcon, 'c': FileCodeIcon, 'cpp': FileCodeIcon, 'h': FileCodeIcon,
  'cs': FileCodeIcon, 'php': FileCodeIcon, 'lua': FileCodeIcon, 'dart': FileCodeIcon,
  'ex': FileCodeIcon, 'hs': FileCodeIcon, 'elm': FileCodeIcon, 'clj': FileCodeIcon,
  'zig': FileCodeIcon, 'vue': FileCodeIcon, 'svelte': FileCodeIcon,
  'html': GlobeIcon, 'htm': GlobeIcon,
  'css': PaletteIcon, 'scss': PaletteIcon, 'sass': PaletteIcon, 'less': PaletteIcon,
  'json': FileJsonIcon, 'yaml': BracesIcon, 'yml': BracesIcon, 'toml': BracesIcon,
  'xml': FileTextIcon, 'csv': FileTextIcon,
  'md': FileTextIcon, 'txt': FileTextIcon, 'pdf': FileTextIcon,
  'doc': FileTextIcon, 'docx': FileTextIcon,
  'png': ImageIcon, 'jpg': ImageIcon, 'jpeg': ImageIcon, 'gif': ImageIcon,
  'svg': ImageIcon, 'ico': ImageIcon,
  'env': LockIcon, 'gitignore': FileWarningIcon,
  'dockerfile': PackageIcon, 'makefile': SettingsIconAlias,
  'sql': DatabaseIcon, 'sh': TerminalIcon, 'bash': TerminalIcon,
  'zip': PackageIcon, 'tar': PackageIcon, 'gz': PackageIcon,
  'lock': LockIcon, 'log': ScrollTextIcon,
};

const specialFiles: Record<string, LucideIcon> = {
  'readme.md': BookOpenIcon, 'readme': BookOpenIcon,
  'license': ScrollTextIcon, 'license.md': ScrollTextIcon,
  'package.json': PackageIcon, 'tsconfig.json': FileCodeIcon,
  'dockerfile': PackageIcon, 'makefile': SettingsIconAlias,
};

export function getFileIcon(name: string, isDir: boolean): LucideIcon {
  if (isDir) {
    return folderIcons[name.toLowerCase()] || FolderOpenIcon;
  }
  const filename = name.toLowerCase();
  if (specialFiles[filename]) return specialFiles[filename];
  if (filename.startsWith('.env')) return LockIcon;
  const ext = filename.split('.').pop() || '';
  return fileIcons[ext] || FileIcon;
}
