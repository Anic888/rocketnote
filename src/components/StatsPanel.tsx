import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { CodingStats } from '../types';
import { BarChart3, Trash2, FileText, Keyboard, Clock } from '../icons';
import './StatsPanel.css';

function StatsPanel() {
  const [stats, setStats] = useState<CodingStats | null>(null);

  const loadStats = () => {
    invoke<CodingStats>('get_coding_stats')
      .then(setStats)
      .catch(console.error);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const resetStats = async () => {
    if (!confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
      return;
    }
    
    try {
      await invoke('reset_coding_stats');
      loadStats();
    } catch (error) {
      alert(`Failed to reset stats: ${error}`);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (!stats) {
    return (
      <div className="stats-panel loading">
        <p>Loading statistics...</p>
      </div>
    );
  }

  // Get last 7 days stats
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyData = last7Days.map(date => ({
    date,
    day: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
    stats: stats.daily_stats[date] || { lines: 0, characters: 0, time_seconds: 0 },
  }));

  const maxLines = Math.max(...dailyData.map(d => d.stats.lines), 1);

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h4><BarChart3 size={16} /> Coding Statistics</h4>
        <button onClick={resetStats} className="reset-btn" title="Reset all statistics">
          <Trash2 size={14} /> Reset
        </button>
      </div>
      
      <div className="stats-overview">
        <div className="stat-card">
          <span className="stat-icon"><FileText size={14} /></span>
          <div className="stat-info">
            <span className="stat-value">{formatNumber(stats.total_lines_written)}</span>
            <span className="stat-label">Lines Written</span>
          </div>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon"><Keyboard size={14} /></span>
          <div className="stat-info">
            <span className="stat-value">{formatNumber(stats.total_characters)}</span>
            <span className="stat-label">Characters</span>
          </div>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon"><Clock size={14} /></span>
          <div className="stat-info">
            <span className="stat-value">{formatTime(stats.total_time_seconds)}</span>
            <span className="stat-label">Time Coding</span>
          </div>
        </div>
      </div>

      <div className="stats-chart">
        <h4>Last 7 Days Activity</h4>
        <div className="chart-container">
          {dailyData.map((data, i) => (
            <div key={i} className="chart-bar-container">
              <div 
                className="chart-bar"
                style={{ height: `${(data.stats.lines / maxLines) * 100}%` }}
                title={`${data.stats.lines} lines`}
              >
                <span className="bar-value">{data.stats.lines}</span>
              </div>
              <span className="bar-label">{data.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-details">
        <h4>Today's Summary</h4>
        <div className="today-stats">
          {(() => {
            const todayStr = today.toISOString().split('T')[0];
            const todayStats = stats.daily_stats[todayStr] || { lines: 0, characters: 0, time_seconds: 0 };
            return (
              <>
                <div className="today-stat">
                  <span className="label">Lines</span>
                  <span className="value">{todayStats.lines}</span>
                </div>
                <div className="today-stat">
                  <span className="label">Characters</span>
                  <span className="value">{todayStats.characters}</span>
                </div>
                <div className="today-stat">
                  <span className="label">Time</span>
                  <span className="value">{formatTime(todayStats.time_seconds)}</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default StatsPanel;
