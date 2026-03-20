import { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Camera, Copy, Save, Loader2 } from '../icons';
import './CodeScreenshot.css';

interface CodeScreenshotProps {
  code: string;
  language: string;
  theme: 'dark' | 'light';
  onClose: () => void;
}

const THEMES = {
  'Dracula': { bg: '#282a36', text: '#f8f8f2', accent: '#bd93f9' },
  'Monokai': { bg: '#272822', text: '#f8f8f2', accent: '#a6e22e' },
  'One Dark': { bg: '#282c34', text: '#abb2bf', accent: '#61afef' },
  'GitHub': { bg: '#ffffff', text: '#24292e', accent: '#0366d6' },
  'Nord': { bg: '#2e3440', text: '#d8dee9', accent: '#88c0d0' },
  'Solarized': { bg: '#002b36', text: '#839496', accent: '#268bd2' },
};

const PADDINGS = [16, 32, 64, 128];

function CodeScreenshot({ code, language, onClose }: CodeScreenshotProps) {
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof THEMES>('Dracula');
  const [padding, setPadding] = useState(64);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [showWindowButtons, setShowWindowButtons] = useState(true);
  const [title, setTitle] = useState(`snippet.${language}`);
  const [downloading, setDownloading] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);

  const theme = THEMES[selectedTheme];
  const lines = code.split('\n');

  const handleDownload = async () => {
    if (!previewRef.current) return;
    
    setDownloading(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2,
        backgroundColor: 'transparent',
      });
      
      const link = document.createElement('a');
      link.download = `code-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    }
    setDownloading(false);
  };

  const handleCopy = async () => {
    if (!previewRef.current) return;
    
    try {
      const dataUrl = await toPng(previewRef.current, {
        pixelRatio: 2,
        backgroundColor: 'transparent',
      });
      
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      
      alert('Image copied to clipboard!');
    } catch (error) {
      console.error('Error copying image:', error);
    }
  };

  return (
    <div className="screenshot-modal" onClick={onClose}>
      <div className="screenshot-container" onClick={(e) => e.stopPropagation()}>
        <div className="screenshot-header">
          <h3><Camera size={16} /> Code Screenshot</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="screenshot-content">
          {/* Controls */}
          <div className="screenshot-controls">
            <div className="control-group">
              <label>Theme</label>
              <select 
                value={selectedTheme} 
                onChange={(e) => setSelectedTheme(e.target.value as keyof typeof THEMES)}
              >
                {Object.keys(THEMES).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>Padding</label>
              <select value={padding} onChange={(e) => setPadding(Number(e.target.value))}>
                {PADDINGS.map(p => (
                  <option key={p} value={p}>{p}px</option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label>Font Size</label>
              <input 
                type="range" 
                min="10" 
                max="20" 
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span>{fontSize}px</span>
            </div>

            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={showLineNumbers}
                  onChange={(e) => setShowLineNumbers(e.target.checked)}
                />
                Line Numbers
              </label>
            </div>

            <div className="control-group">
              <label>
                <input 
                  type="checkbox" 
                  checked={showWindowButtons}
                  onChange={(e) => setShowWindowButtons(e.target.checked)}
                />
                Window Buttons
              </label>
            </div>

            <div className="control-group">
              <label>Title</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="filename.js"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="screenshot-preview-area">
            <div 
              ref={previewRef}
              className="screenshot-preview"
              style={{ 
                padding,
                background: `linear-gradient(135deg, ${theme.accent}40, ${theme.bg})`,
              }}
            >
              <div 
                className="code-window"
                style={{ 
                  backgroundColor: theme.bg,
                  color: theme.text,
                }}
              >
                {/* Window header */}
                <div className="window-header">
                  {showWindowButtons && (
                    <div className="window-buttons">
                      <span className="btn red"></span>
                      <span className="btn yellow"></span>
                      <span className="btn green"></span>
                    </div>
                  )}
                  <span className="window-title">{title}</span>
                </div>

                {/* Code */}
                <div className="code-content" style={{ fontSize }}>
                  {lines.map((line, i) => (
                    <div key={i} className="code-line">
                      {showLineNumbers && (
                        <span className="line-number" style={{ color: `${theme.text}60` }}>
                          {i + 1}
                        </span>
                      )}
                      <span className="line-content">{line || ' '}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="screenshot-actions">
          <button onClick={handleCopy}><Copy size={14} /> Copy to Clipboard</button>
          <button onClick={handleDownload} disabled={downloading} className="primary">
            {downloading ? <><Loader2 size={14} className="spin" /> Generating...</> : <><Save size={14} /> Download PNG</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CodeScreenshot;
