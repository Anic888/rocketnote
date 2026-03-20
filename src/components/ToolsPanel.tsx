import { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { RegexMatch } from '../types';
import { FileJson, Type, Link, Hash, Fingerprint, FileText, Ticket, Clock, Palette, Search, Scale, Copy } from '../icons';
import './ToolsPanel.css';

type ToolType = 'json' | 'base64' | 'hash' | 'uuid' | 'timestamp' | 'regex' | 'url' | 'color' | 'case' | 'lorem' | 'diff' | 'jwt';

function ToolsPanel() {
  const [activeTool, setActiveTool] = useState<ToolType>('json');
  const [input, setInput] = useState('');
  const [input2, setInput2] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  
  // Regex specific
  const [regexPattern, setRegexPattern] = useState('');
  const [regexFlags, setRegexFlags] = useState('gi');
  const [regexMatches, setRegexMatches] = useState<RegexMatch[]>([]);
  
  // Lorem specific
  const [loremCount, setLoremCount] = useState(3);
  const [loremType, setLoremType] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');

  const clearAll = () => {
    setInput('');
    setInput2('');
    setOutput('');
    setError('');
    setRegexMatches([]);
  };

  // Case conversion functions
  const toCamelCase = (str: string) => str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
  const toSnakeCase = (str: string) => str.replace(/\s+/g, '_').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '').replace(/__+/g, '_');
  const toKebabCase = (str: string) => str.replace(/\s+/g, '-').replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '').replace(/--+/g, '-');
  const toTitleCase = (str: string) => str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const toPascalCase = (str: string) => str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/^./, c => c.toUpperCase());

  // Color conversion functions
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    return { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) };
  };

  const rgbToHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  // Lorem Ipsum generator
  const loremWords = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate', 'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'];

  const generateLorem = () => {
    const getRandomWords = (count: number) => {
      const words = [];
      for (let i = 0; i < count; i++) {
        words.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
      }
      words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
      return words.join(' ') + '.';
    };

    if (loremType === 'words') {
      const words = [];
      for (let i = 0; i < loremCount; i++) {
        words.push(loremWords[Math.floor(Math.random() * loremWords.length)]);
      }
      setOutput(words.join(' '));
    } else if (loremType === 'sentences') {
      const sentences = [];
      for (let i = 0; i < loremCount; i++) {
        sentences.push(getRandomWords(8 + Math.floor(Math.random() * 8)));
      }
      setOutput(sentences.join(' '));
    } else {
      const paragraphs = [];
      for (let i = 0; i < loremCount; i++) {
        const sentences = [];
        const sentenceCount = 4 + Math.floor(Math.random() * 4);
        for (let j = 0; j < sentenceCount; j++) {
          sentences.push(getRandomWords(8 + Math.floor(Math.random() * 8)));
        }
        paragraphs.push(sentences.join(' '));
      }
      setOutput(paragraphs.join('\n\n'));
    }
  };

  // JWT Decoder
  const decodeJwt = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      
      return JSON.stringify({ header, payload }, null, 2);
    } catch {
      throw new Error('Invalid JWT token');
    }
  };

  // Simple diff
  const generateDiff = (text1: string, text2: string) => {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    const result: string[] = [];
    
    const maxLines = Math.max(lines1.length, lines2.length);
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 === line2) {
        result.push(`  ${line1}`);
      } else {
        if (line1) result.push(`- ${line1}`);
        if (line2) result.push(`+ ${line2}`);
      }
    }
    
    return result.join('\n');
  };

  const handleAction = async (action: string) => {
    setError('');
    setOutput('');

    try {
      switch (action) {
        case 'format-json':
          const formatted = await invoke<string>('format_json', { input });
          setOutput(formatted);
          break;
        case 'minify-json':
          const minified = await invoke<string>('minify_json', { input });
          setOutput(minified);
          break;
        case 'base64-encode':
          const encoded = await invoke<string>('base64_encode', { input });
          setOutput(encoded);
          break;
        case 'base64-decode':
          const decoded = await invoke<string>('base64_decode', { input });
          setOutput(decoded);
          break;
        case 'url-encode':
          setOutput(encodeURIComponent(input));
          break;
        case 'url-decode':
          setOutput(decodeURIComponent(input));
          break;
        case 'hash-md5':
          const md5 = await invoke<string>('hash_md5', { input });
          setOutput(md5);
          break;
        case 'hash-sha256':
          const sha256 = await invoke<string>('hash_sha256', { input });
          setOutput(sha256);
          break;
        case 'generate-uuid':
          const uuid = await invoke<string>('generate_uuid');
          setOutput(uuid);
          break;
        case 'timestamp-to-date':
          const date = await invoke<string>('timestamp_to_date', { timestamp: parseInt(input) });
          setOutput(date);
          break;
        case 'date-to-timestamp':
          const timestamp = await invoke<number>('date_to_timestamp', { date: input });
          setOutput(timestamp.toString());
          break;
        case 'current-timestamp':
          setOutput(Math.floor(Date.now() / 1000).toString());
          break;
        case 'test-regex':
          const matches = await invoke<RegexMatch[]>('regex_test', {
            pattern: regexPattern,
            text: input,
            flags: regexFlags,
          });
          setRegexMatches(matches);
          setOutput(`Found ${matches.length} match(es)`);
          break;
        // Case conversions
        case 'uppercase':
          setOutput(input.toUpperCase());
          break;
        case 'lowercase':
          setOutput(input.toLowerCase());
          break;
        case 'titlecase':
          setOutput(toTitleCase(input));
          break;
        case 'camelcase':
          setOutput(toCamelCase(input));
          break;
        case 'pascalcase':
          setOutput(toPascalCase(input));
          break;
        case 'snakecase':
          setOutput(toSnakeCase(input));
          break;
        case 'kebabcase':
          setOutput(toKebabCase(input));
          break;
        // Color conversions
        case 'color-convert':
          const trimmed = input.trim();
          if (trimmed.startsWith('#') || /^[0-9a-f]{6}$/i.test(trimmed)) {
            const hex = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
            const rgb = hexToRgb(hex);
            if (rgb) {
              const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
              setOutput(`HEX: ${hex}\nRGB: rgb(${rgb.r}, ${rgb.g}, ${rgb.b})\nHSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
            } else {
              throw new Error('Invalid hex color');
            }
          } else if (trimmed.startsWith('rgb')) {
            const match = trimmed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (match) {
              const [, r, g, b] = match.map(Number);
              const hex = rgbToHex(r, g, b);
              const hsl = rgbToHsl(r, g, b);
              setOutput(`HEX: ${hex}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
            } else {
              throw new Error('Invalid RGB format');
            }
          } else {
            throw new Error('Enter HEX (#ff5500) or RGB (rgb(255, 85, 0))');
          }
          break;
        // JWT decode
        case 'decode-jwt':
          setOutput(decodeJwt(input));
          break;
        // Diff
        case 'diff':
          setOutput(generateDiff(input, input2));
          break;
        // Lorem
        case 'generate-lorem':
          generateLorem();
          break;
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="tools-panel">
      <div className="tools-sidebar">
        <div className="tools-section">
          <span className="section-label">Transform</span>
          <button className={activeTool === 'json' ? 'active' : ''} onClick={() => { setActiveTool('json'); clearAll(); }}>
            <FileJson size={16} strokeWidth={1.75} /> JSON
          </button>
          <button className={activeTool === 'base64' ? 'active' : ''} onClick={() => { setActiveTool('base64'); clearAll(); }}>
            <Type size={16} strokeWidth={1.75} /> Base64
          </button>
          <button className={activeTool === 'url' ? 'active' : ''} onClick={() => { setActiveTool('url'); clearAll(); }}>
            <Link size={16} strokeWidth={1.75} /> URL
          </button>
          <button className={activeTool === 'case' ? 'active' : ''} onClick={() => { setActiveTool('case'); clearAll(); }}>
            Aa Case
          </button>
        </div>
        
        <div className="tools-section">
          <span className="section-label">Generate</span>
          <button className={activeTool === 'hash' ? 'active' : ''} onClick={() => { setActiveTool('hash'); clearAll(); }}>
            <Hash size={16} strokeWidth={1.75} /> Hash
          </button>
          <button className={activeTool === 'uuid' ? 'active' : ''} onClick={() => { setActiveTool('uuid'); clearAll(); }}>
            <Fingerprint size={16} strokeWidth={1.75} /> UUID
          </button>
          <button className={activeTool === 'lorem' ? 'active' : ''} onClick={() => { setActiveTool('lorem'); clearAll(); }}>
            <FileText size={16} strokeWidth={1.75} /> Lorem
          </button>
        </div>
        
        <div className="tools-section">
          <span className="section-label">Decode</span>
          <button className={activeTool === 'jwt' ? 'active' : ''} onClick={() => { setActiveTool('jwt'); clearAll(); }}>
            <Ticket size={16} strokeWidth={1.75} /> JWT
          </button>
          <button className={activeTool === 'timestamp' ? 'active' : ''} onClick={() => { setActiveTool('timestamp'); clearAll(); }}>
            <Clock size={16} strokeWidth={1.75} /> Time
          </button>
          <button className={activeTool === 'color' ? 'active' : ''} onClick={() => { setActiveTool('color'); clearAll(); }}>
            <Palette size={16} strokeWidth={1.75} /> Color
          </button>
        </div>
        
        <div className="tools-section">
          <span className="section-label">Test</span>
          <button className={activeTool === 'regex' ? 'active' : ''} onClick={() => { setActiveTool('regex'); clearAll(); }}>
            <Search size={16} strokeWidth={1.75} /> Regex
          </button>
          <button className={activeTool === 'diff' ? 'active' : ''} onClick={() => { setActiveTool('diff'); clearAll(); }}>
            <Scale size={16} strokeWidth={1.75} /> Diff
          </button>
        </div>
      </div>

      <div className="tools-content">
        {activeTool === 'json' && (
          <>
            <div className="tool-header">
              <h3>JSON Formatter</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('format-json')}>Format</button>
                <button onClick={() => handleAction('minify-json')}>Minify</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste JSON here..."
            />
          </>
        )}

        {activeTool === 'base64' && (
          <>
            <div className="tool-header">
              <h3>Base64 Encoder/Decoder</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('base64-encode')}>Encode</button>
                <button onClick={() => handleAction('base64-decode')}>Decode</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text or Base64..."
            />
          </>
        )}

        {activeTool === 'url' && (
          <>
            <div className="tool-header">
              <h3>URL Encoder/Decoder</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('url-encode')}>Encode</button>
                <button onClick={() => handleAction('url-decode')}>Decode</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter URL or encoded string..."
            />
          </>
        )}

        {activeTool === 'case' && (
          <>
            <div className="tool-header">
              <h3>Case Converter</h3>
              <div className="tool-actions case-actions">
                <button onClick={() => handleAction('uppercase')}>UPPER</button>
                <button onClick={() => handleAction('lowercase')}>lower</button>
                <button onClick={() => handleAction('titlecase')}>Title</button>
                <button onClick={() => handleAction('camelcase')}>camel</button>
                <button onClick={() => handleAction('pascalcase')}>Pascal</button>
                <button onClick={() => handleAction('snakecase')}>snake_</button>
                <button onClick={() => handleAction('kebabcase')}>kebab-</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text to convert..."
            />
          </>
        )}

        {activeTool === 'hash' && (
          <>
            <div className="tool-header">
              <h3>Hash Generator</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('hash-md5')}>MD5</button>
                <button onClick={() => handleAction('hash-sha256')}>SHA-256</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text to hash..."
            />
          </>
        )}

        {activeTool === 'uuid' && (
          <>
            <div className="tool-header">
              <h3>UUID Generator</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('generate-uuid')}>Generate UUID v4</button>
              </div>
            </div>
            <p className="tool-description">Generate random UUID v4 identifiers</p>
          </>
        )}

        {activeTool === 'lorem' && (
          <>
            <div className="tool-header">
              <h3>Lorem Ipsum Generator</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('generate-lorem')}>Generate</button>
              </div>
            </div>
            <div className="lorem-options">
              <input
                type="number"
                value={loremCount}
                onChange={(e) => setLoremCount(parseInt(e.target.value) || 1)}
                min={1}
                max={50}
                className="lorem-count"
              />
              <select value={loremType} onChange={(e) => setLoremType(e.target.value as 'paragraphs' | 'sentences' | 'words')}>
                <option value="paragraphs">Paragraphs</option>
                <option value="sentences">Sentences</option>
                <option value="words">Words</option>
              </select>
            </div>
          </>
        )}

        {activeTool === 'jwt' && (
          <>
            <div className="tool-header">
              <h3>JWT Decoder</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('decode-jwt')}>Decode</button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste JWT token here..."
            />
          </>
        )}

        {activeTool === 'timestamp' && (
          <>
            <div className="tool-header">
              <h3>Timestamp Converter</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('current-timestamp')}>Current</button>
                <button onClick={() => handleAction('timestamp-to-date')}>→ Date</button>
                <button onClick={() => handleAction('date-to-timestamp')}>→ Unix</button>
              </div>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Unix timestamp or YYYY-MM-DD..."
              className="tool-input"
            />
          </>
        )}

        {activeTool === 'color' && (
          <>
            <div className="tool-header">
              <h3>Color Converter</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('color-convert')}>Convert</button>
              </div>
            </div>
            <div className="color-preview" style={{ backgroundColor: input.startsWith('#') || input.startsWith('rgb') ? input : '#' + input }} />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="#ff5500 or rgb(255, 85, 0)"
              className="tool-input"
            />
          </>
        )}

        {activeTool === 'regex' && (
          <>
            <div className="tool-header">
              <h3>Regex Tester</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('test-regex')}>Test</button>
              </div>
            </div>
            <div className="regex-inputs">
              <input
                type="text"
                value={regexPattern}
                onChange={(e) => setRegexPattern(e.target.value)}
                placeholder="Regex pattern..."
                className="tool-input"
              />
              <input
                type="text"
                value={regexFlags}
                onChange={(e) => setRegexFlags(e.target.value)}
                placeholder="Flags (gi)"
                className="tool-input flags"
              />
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Test string..."
            />
            {regexMatches.length > 0 && (
              <div className="regex-matches">
                {regexMatches.map((match, i) => (
                  <div key={i} className="match-item">
                    <span className="match-index">#{i + 1}</span>
                    <span className="match-text">{match.text}</span>
                    <span className="match-pos">[{match.start}-{match.end}]</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTool === 'diff' && (
          <>
            <div className="tool-header">
              <h3>Text Diff</h3>
              <div className="tool-actions">
                <button onClick={() => handleAction('diff')}>Compare</button>
              </div>
            </div>
            <div className="diff-inputs">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Original text..."
              />
              <textarea
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                placeholder="Modified text..."
              />
            </div>
          </>
        )}

        {/* Output area */}
        {(output || error) && (
          <div className="tool-output">
            {error ? (
              <div className="output-error">{error}</div>
            ) : (
              <>
                <div className="output-header">
                  <span>Output</span>
                  <button onClick={() => copyToClipboard(output)}><Copy size={14} strokeWidth={1.75} /> Copy</button>
                </div>
                <pre className="output-content">{output}</pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolsPanel;
