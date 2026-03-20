import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { FileInfo, Bookmark } from '../types';
import { getFileIcon, Folder as FolderIcon, Bookmark as BookmarkIcon, Loader2 } from '../icons';
import './Sidebar.css';

interface SidebarProps {
  width: number;
  onWidthChange: (width: number) => void;
  currentFolder: string | null;
  onFileOpen: (path: string) => void;
  onFolderOpen: () => void;
  bookmarks: Bookmark[];
  onBookmarkClick: (bookmark: Bookmark) => void;
}

interface TreeNode extends FileInfo {
  children?: TreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

function Sidebar({ width, onWidthChange, currentFolder, onFileOpen, onFolderOpen, bookmarks, onBookmarkClick }: SidebarProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'bookmarks'>('files');

  // Load directory contents
  const loadDirectory = useCallback(async (path: string): Promise<TreeNode[]> => {
    try {
      const files = await invoke<FileInfo[]>('read_directory', { path });
      return files.map(f => ({
        ...f,
        children: f.is_dir ? undefined : undefined,
        isExpanded: false,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading directory:', error);
      return [];
    }
  }, []);

  // Load root folder
  useEffect(() => {
    if (currentFolder) {
      loadDirectory(currentFolder).then(setTree);
    } else {
      setTree([]);
    }
  }, [currentFolder, loadDirectory]);

  // Toggle folder expansion
  const toggleFolder = async (node: TreeNode, path: number[]) => {
    if (!node.is_dir) {
      onFileOpen(node.path);
      return;
    }

    setTree(prevTree => {
      const newTree = JSON.parse(JSON.stringify(prevTree));
      let current = newTree;
      
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]].children;
      }
      
      const targetNode = current[path[path.length - 1]];
      
      if (targetNode.isExpanded) {
        targetNode.isExpanded = false;
      } else {
        targetNode.isExpanded = true;
        targetNode.isLoading = true;
      }
      
      return newTree;
    });

    if (!node.isExpanded) {
      const children = await loadDirectory(node.path);
      
      setTree(prevTree => {
        const newTree = JSON.parse(JSON.stringify(prevTree));
        let current = newTree;
        
        for (let i = 0; i < path.length - 1; i++) {
          current = current[path[i]].children;
        }
        
        current[path[path.length - 1]].children = children;
        current[path[path.length - 1]].isLoading = false;
        
        return newTree;
      });
    }
  };

  // Render tree node
  const renderNode = (node: TreeNode, path: number[], depth: number = 0) => {
    const isFolder = node.is_dir;
    
    return (
      <div key={node.path} className="tree-item-wrapper">
        <div
          className={`tree-item ${isFolder ? 'folder' : 'file'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleFolder(node, path)}
          title={node.path}
        >
          {isFolder && (
            <span className={`folder-arrow ${node.isExpanded ? 'expanded' : ''}`}>
              {node.isLoading ? <Loader2 size={14} strokeWidth={1.75} className="spin" /> : '▶'}
            </span>
          )}
          <span className="tree-icon">{(() => { const Icon = getFileIcon(node.name, isFolder); return <Icon size={14} strokeWidth={1.75} />; })()}</span>
          <span className="tree-name">{node.name}</span>
        </div>
        
        {isFolder && node.isExpanded && node.children && (
          <div className="tree-children">
            {node.children.map((child, index) => 
              renderNode(child, [...path, index], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.max(150, Math.min(500, e.clientX));
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  return (
    <div className="sidebar" style={{ width: `${width}px` }}>
      <div className="sidebar-header">
        <button 
          className={`sidebar-tab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FolderIcon size={14} strokeWidth={1.75} /> Files
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          <BookmarkIcon size={14} strokeWidth={1.75} /> Bookmarks
        </button>
      </div>
      
      <div className="sidebar-content">
        {activeTab === 'files' ? (
          currentFolder ? (
            <>
              <div className="folder-header">
                <span className="folder-icon"><FolderIcon size={14} strokeWidth={1.75} /></span>
                <span className="folder-name">{currentFolder.split('/').pop()}</span>
              </div>
              <div className="file-tree">
                {tree.map((node, index) => renderNode(node, [index]))}
              </div>
            </>
          ) : (
            <div className="no-folder">
              <p>No folder opened</p>
              <button onClick={onFolderOpen}>Open Folder</button>
            </div>
          )
        ) : (
          <div className="bookmarks-list">
            {bookmarks.length === 0 ? (
              <div className="no-bookmarks">
                <p>No bookmarks yet</p>
                <p className="hint">Press F2 to add a bookmark</p>
              </div>
            ) : (
              bookmarks.map((bookmark, i) => (
                <div 
                  key={i} 
                  className="bookmark-item"
                  onClick={() => onBookmarkClick(bookmark)}
                >
                  <span className="bookmark-icon"><BookmarkIcon size={14} strokeWidth={1.75} /></span>
                  <span className="bookmark-file">{bookmark.file_path.split('/').pop()}</span>
                  <span className="bookmark-line">:{bookmark.line}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      <div
        className={`sidebar-resizer ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}

export default Sidebar;
