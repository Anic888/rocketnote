import { createPortal } from 'react-dom';
import { shell } from '@tauri-apps/api';
import { Heart, Bug, Lightbulb, Star, GitBranch, ExternalLink } from '../icons';
import './SupportPanel.css';

interface SupportPanelProps {
  onClose: () => void;
}

const GITHUB_REPO = 'https://github.com/Anic888/rocketnote';

function SupportPanel({ onClose }: SupportPanelProps) {
  const openUrl = (url: string) => shell.open(url);

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal support-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Heart size={16} strokeWidth={1.75} /> Support</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          <div className="support-intro">
            <p>
              <strong>RocketNote</strong> is a free, open-source, privacy-first code editor.
              Help us grow by starring the repo or reporting issues on GitHub!
            </p>
          </div>

          <div className="support-section">
            <h3><Star size={16} strokeWidth={1.75} /> Support the Project</h3>
            <div className="feedback-buttons">
              <button className="feedback-btn star-btn" onClick={() => openUrl(GITHUB_REPO)}>
                <Star size={14} strokeWidth={1.75} /> Star on GitHub
              </button>
              <button className="feedback-btn" onClick={() => openUrl(`${GITHUB_REPO}/fork`)}>
                <GitBranch size={14} strokeWidth={1.75} /> Fork
              </button>
            </div>
          </div>

          <div className="support-section">
            <h3><Bug size={16} strokeWidth={1.75} /> Feedback & Bugs</h3>
            <div className="feedback-buttons">
              <button className="feedback-btn" onClick={() => openUrl(`${GITHUB_REPO}/issues/new?labels=bug&template=bug_report.md`)}>
                <Bug size={14} strokeWidth={1.75} /> Report Bug
              </button>
              <button className="feedback-btn" onClick={() => openUrl(`${GITHUB_REPO}/issues/new?labels=enhancement&template=feature_request.md`)}>
                <Lightbulb size={14} strokeWidth={1.75} /> Suggest Feature
              </button>
            </div>
            <p className="email-hint">
              <ExternalLink size={11} strokeWidth={1.75} /> Opens GitHub Issues
            </p>
          </div>

          <div className="support-footer">
            <p>Thank you for using <strong>RocketNote</strong>! <Heart size={14} strokeWidth={1.75} /></p>
            <p className="tagline">Fast. Private. Local.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default SupportPanel;
