import { useEffect, useRef } from 'react';
import { FilePlus, FolderPlus, Save, Scissors, Copy, ClipboardList, Trash2, Pencil, Square, Search, Undo2, Redo2 } from '../icons';
import './ContextMenu.css';

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  divider?: false;
}

interface Divider {
  divider: true;
}

type ContextMenuEntry = MenuItem | Divider;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

const iconMap: Record<string, JSX.Element> = {
  'New File': <FilePlus size={14} strokeWidth={1.75} />,
  'New Folder': <FolderPlus size={14} strokeWidth={1.75} />,
  'Save': <Save size={14} strokeWidth={1.75} />,
  'Save As': <Save size={14} strokeWidth={1.75} />,
  'Cut': <Scissors size={14} strokeWidth={1.75} />,
  'Copy': <Copy size={14} strokeWidth={1.75} />,
  'Paste': <ClipboardList size={14} strokeWidth={1.75} />,
  'Delete': <Trash2 size={14} strokeWidth={1.75} />,
  'Rename': <Pencil size={14} strokeWidth={1.75} />,
  'Select All': <Square size={14} strokeWidth={1.75} />,
  'Find': <Search size={14} strokeWidth={1.75} />,
  'Undo': <Undo2 size={14} strokeWidth={1.75} />,
  'Redo': <Redo2 size={14} strokeWidth={1.75} />,
};

function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const el = menuRef.current;

    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, [x, y]);

  return (
    <div
      className="context-menu"
      ref={menuRef}
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => {
        if (item.divider) {
          return <div key={index} className="context-menu-divider" />;
        }
        return (
          <button
            key={index}
            className="context-menu-item"
            disabled={item.disabled}
            onClick={() => {
              item.action();
              onClose();
            }}
          >
            {iconMap[item.label] && <span className="context-menu-icon">{iconMap[item.label]}</span>}
            <span className="context-menu-label">{item.label}</span>
            {item.shortcut && (
              <span className="context-menu-shortcut">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ContextMenu;
