import { Keyboard } from '../icons';
import './ShortcutsModal.css';

interface ShortcutsModalProps {
  onClose: () => void;
}

const shortcuts = [
  { category: 'File', items: [
    { key: '⌘N', action: 'New File' },
    { key: '⌘O', action: 'Open File' },
    { key: '⌘⇧O', action: 'Open Folder' },
    { key: '⌘S', action: 'Save' },
    { key: '⌘⇧S', action: 'Save As' },
    { key: '⌘W', action: 'Close Tab' },
  ]},
  { category: 'Edit', items: [
    { key: '⌘Z', action: 'Undo' },
    { key: '⌘⇧Z', action: 'Redo' },
    { key: '⌘X', action: 'Cut' },
    { key: '⌘C', action: 'Copy' },
    { key: '⌘V', action: 'Paste' },
    { key: '⌘A', action: 'Select All' },
    { key: '⌘D', action: 'Duplicate Line' },
  ]},
  { category: 'Search', items: [
    { key: '⌘F', action: 'Find' },
    { key: '⌘⇧H', action: 'Find & Replace' },
    { key: '⌘⇧F', action: 'Global Search' },
    { key: '⌘G', action: 'Go to Line' },
    { key: '⌘P', action: 'Quick Open' },
  ]},
  { category: 'View', items: [
    { key: '⌘B', action: 'Toggle Sidebar' },
    { key: '⌘⇧E', action: 'Split View' },
    { key: '⌘⇧↵', action: 'Focus Mode' },
    { key: '⌘+', action: 'Zoom In' },
    { key: '⌘-', action: 'Zoom Out' },
  ]},
  { category: 'Tools', items: [
    { key: '⌘`', action: 'Terminal' },
    { key: '⌘⇧G', action: 'Git Panel' },
    { key: '⌘K', action: 'AI Assistant' },
    { key: '⌘,', action: 'Settings' },
  ]},
  { category: 'Editor', items: [
    { key: '⌘/', action: 'Toggle Comment' },
    { key: '⌘]', action: 'Indent' },
    { key: '⌘[', action: 'Outdent' },
    { key: '⌥↑', action: 'Move Line Up' },
    { key: '⌥↓', action: 'Move Line Down' },
    { key: '⌘⇧K', action: 'Delete Line' },
  ]},
];

function ShortcutsModal({ onClose }: ShortcutsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Keyboard size={20} strokeWidth={1.75} /> Keyboard Shortcuts</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="shortcuts-content">
          {shortcuts.map((section) => (
            <div key={section.category} className="shortcut-section">
              <h3>{section.category}</h3>
              <div className="shortcut-list">
                {section.items.map((item) => (
                  <div key={item.key} className="shortcut-item">
                    <span className="shortcut-key">{item.key}</span>
                    <span className="shortcut-action">{item.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShortcutsModal;
