import React, { useState, useEffect, useRef } from 'react';
import {
  Settings, Package, Trash2, KeyRound, DownloadCloud, AlertCircle, Play,
  Plus, Check, Info, RefreshCw, X, ChevronDown, Sliders, Globe, LayoutGrid,
  Terminal, Music, Search, Bot, Video, Cpu, Layers, Sparkles, ShieldCheck,
  ArrowUpRight, Zap, ExternalLink, Activity, Server, Code, Filter, FolderSync
} from 'lucide-react';
import OrdoApp from '../../../components/OrdoTilingWindowManager/src/App.jsx';
import HermesOrchestratorEngine from '../../../components/HermesOrchestratorEngine/src/App.jsx';

const BETO_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;color:#10b981">
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </svg>`;

function getLucideIconForComponent(name = '', category = '') {
  const n = name.toLowerCase();
  if (n.includes('ordo') || n.includes('tiling') || n.includes('workspace')) return <LayoutGrid size={15} color="#38bdf8" />;
  if (n.includes('media') || n.includes('player') || n.includes('audio') || n.includes('music')) return <Music size={15} color="#a855f7" />;
  if (n.includes('hermes') || n.includes('console') || n.includes('terminal') || n.includes('orchestrator')) return <Terminal size={15} color="#10b981" />;
  if (n.includes('bot') || n.includes('social') || n.includes('instagram') || n.includes('discord')) return <Bot size={15} color="#f59e0b" />;
  if (n.includes('creator') || n.includes('crm') || n.includes('layers') || n.includes('kanban')) return <Layers size={15} color="#ec4899" />;
  if (n.includes('video') || n.includes('processor') || n.includes('transcode') || n.includes('image')) return <Video size={15} color="#6366f1" />;
  if (n.includes('research') || n.includes('search') || n.includes('osint') || n.includes('ocr')) return <Search size={15} color="#14b8a6" />;
  return <Cpu size={15} color="#38bdf8" />;
}

// Hermes Host Platform Adapter Definition
function createHermesHostAPI() {
  return {
    environment: 'hermes-gui',
    workspace: {
      getActiveFile: async () => {
        return { path: '/home/hermes/workspace/DATACORE', name: 'DATACORE' };
      }
    },
    fs: {
      read: async (path) => {
        try {
          const res = await fetch(`http://localhost:7777/api/exec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: `cat '${path}'` })
          });
          const data = await res.json();
          return data.stdout || '';
        } catch (_) {}
        return localStorage.getItem(`hermes_${path}`) || '';
      },
      write: async (path, content) => {
        try {
          await fetch(`http://localhost:7777/api/exec`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: `cat << 'EOF' > '${path}'\n${content}\nEOF` })
          });
          return true;
        } catch (_) {}
        localStorage.setItem(`hermes_${path}`, content);
        return true;
      }
    },
    exec: async (command) => {
      try {
        const res = await fetch('http://localhost:7777/api/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command })
        });
        return await res.json();
      } catch (err) {
        return { error: err.message };
      }
    }
  };
}

export function GrexNexusHermesDashboard() {
  const [activeTab, setActiveTab] = useState('ordo');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ghRepoInput, setGhRepoInput] = useState('');
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [provisionUrl, setProvisionUrl] = useState('');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('grex_github_token') || '');
  const [tokenStatus, setTokenStatus] = useState({ state: 'idle', user: null, message: '' });
  const [installingMsg, setInstallingMsg] = useState('');
  const [provisioningMsg, setProvisioningMsg] = useState('');
  const [daemonStatus, setDaemonStatus] = useState({ online: false, version: '1.0.0' });

  const [communityRepos, setCommunityRepos] = useState([]);
  const [isLoadingStore, setIsLoadingStore] = useState(false);

  const dropdownRef = useRef(null);

  const [components, setComponents] = useState([
    { id: 'ordo', name: 'Ordo Tiling WM', category: 'workspace', repo: 'beto-group/ordo-tiling-window-manager', desc: 'Row, Rank, Series, & Tiling Engine' },
    { id: 'hermes', name: 'Hermes Orchestrator Engine', category: 'agent', repo: 'beto-group/HermesOrchestratorEngine', desc: 'Podman Container Sync & Plugin Management' },
    { id: 'pdfplus', name: 'PDF Plus Engine', category: 'pdf', repo: 'beto-group/PdfPlusEngine', desc: 'PDF Deep Backlinking & Rect Crop Suite' },
    { id: 'media', name: 'Universal Media Player', category: 'media', repo: 'beto-group/universal-media-player', desc: 'Cyberpunk HLS/Audio/Video Player' }
  ]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all beto-group repos from GitHub API
  useEffect(() => {
    (async () => {
      setIsLoadingStore(true);
      try {
        const token = (githubToken && githubToken.trim()) ? githubToken.trim() : '';
        const headers = { Accept: 'application/vnd.github.v3+json' };
        if (token) headers.Authorization = `token ${token}`;

        let allRepos = [];

        for (let page = 1; page <= 2; page++) {
          try {
            const res = await fetch(`https://api.github.com/users/beto-group/repos?per_page=100&page=${page}&sort=updated`, { headers });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                allRepos = [...allRepos, ...data];
              }
            }
          } catch (_) {}
        }

        if (token) {
          try {
            const res = await fetch(`https://api.github.com/user/repos?per_page=100&type=all&sort=updated`, { headers });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                const betoPrivate = data.filter(r => r.owner && r.owner.login && r.owner.login.toLowerCase() === 'beto-group');
                for (const repo of betoPrivate) {
                  if (!allRepos.some(r => r.id === repo.id)) {
                    allRepos.push(repo);
                  }
                }
              }
            }
          } catch (_) {}
        }

        if (allRepos.length > 0) {
          const formatted = allRepos.map(r => ({
            id: r.name.toLowerCase(),
            name: r.name,
            description: r.description || `Sovereign beto-group component repository.`,
            html_url: r.html_url
          }));
          setCommunityRepos(formatted);
        }
      } catch (err) {
        // quiet error
      } finally {
        setIsLoadingStore(false);
      }
    })();
  }, [githubToken]);

  // Validate GitHub Token
  useEffect(() => {
    if (!githubToken || !githubToken.trim()) {
      setTokenStatus({ state: 'idle', user: null, message: '' });
      return;
    }
    let isSubscribed = true;
    setTokenStatus({ state: 'validating', user: null, message: 'Validating...' });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${githubToken.trim()}`, Accept: 'application/vnd.github.v3+json' }
        });
        if (!isSubscribed) return;
        if (res.ok) {
          const user = await res.json();
          setTokenStatus({ state: 'valid', user: user.login, message: `VALID (@${user.login})` });
        } else {
          setTokenStatus({ state: 'invalid', user: null, message: res.status === 401 ? 'INVALID TOKEN (401)' : `FAILED (${res.status})` });
        }
      } catch {
        if (isSubscribed) setTokenStatus({ state: 'invalid', user: null, message: 'Network Error' });
      }
    }, 400);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [githubToken]);

  // Check Sidecar Daemon Status on Port 7777
  useEffect(() => {
    fetch('http://localhost:7777/api/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'online') {
          setDaemonStatus({ online: true, version: data.container || 'hermes-worker' });
        }
      })
      .catch(() => setDaemonStatus({ online: false, version: '1.0.0' }));
  }, []);

  const handleSaveGithubToken = (val) => {
    setGithubToken(val);
    localStorage.setItem('grex_github_token', val);
  };

  const handleInstallFromGitHub = async (targetRepo = null) => {
    const repoToInstall = targetRepo || ghRepoInput;
    if (!repoToInstall) return;
    setInstallingMsg(`Installing component from GitHub: ${repoToInstall}...`);
    try {
      const res = await fetch('http://localhost:7777/api/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `git clone ${repoToInstall.startsWith('http') ? repoToInstall : `https://github.com/${repoToInstall}.git`}` })
      });
      await res.json();
      setInstallingMsg(`Installed ${repoToInstall} successfully!`);
      const compId = repoToInstall.split('/').pop().replace(/\.git$/, '');
      const newComp = { id: compId.toLowerCase(), name: compId, category: 'github', repo: repoToInstall, desc: 'Installed GitHub Repository Component' };
      setComponents((prev) => [...prev.filter(c => c.id !== compId.toLowerCase()), newComp]);
      setActiveTab(compId.toLowerCase());
      setGhRepoInput('');
    } catch (err) {
      setInstallingMsg(`Failed: ${err.message}`);
    }
  };

  const handleProvisionComponent = async () => {
    if (!provisionUrl) return;
    setProvisioningMsg(`Pulling component release from ${provisionUrl}...`);
    setTimeout(() => {
      const compId = provisionUrl.split('/').pop().replace(/\.git$/, '') || 'provisioned-comp';
      const newComp = { id: compId.toLowerCase(), name: compId, category: 'provisioned', repo: provisionUrl, desc: 'Release Provisioned Component' };
      setComponents((prev) => [...prev.filter(c => c.id !== compId.toLowerCase()), newComp]);
      setProvisioningMsg(`Component ${compId} provisioned into memory cache.`);
      setActiveTab(compId.toLowerCase());
      setProvisionUrl('');
    }, 1200);
  };

  const handlePurgeComponent = (id) => {
    setComponents((prev) => prev.filter(c => c.id !== id));
    if (activeTab === id) setActiveTab('ordo');
  };

  const filteredCommunityRepos = communityRepos.filter(r =>
    r.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) ||
    r.description.toLowerCase().includes(storeSearchQuery.toLowerCase())
  );

  const activeComp = components.find(c => c.id === activeTab);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: '#030712',
      color: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Top Header Navigation */}
      <div style={{
        height: '44px',
        minHeight: '44px',
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        boxSizing: 'border-box',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span dangerouslySetInnerHTML={{ __html: BETO_LOGO_SVG }} style={{ display: 'flex', alignItems: 'center', color: '#10b981' }} />
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#f9fafb', letterSpacing: '-0.01em' }}>
            GREX Nexus
          </span>
          <span style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>
            Hermes GUI
          </span>
        </div>

        {/* Component Selector & Store Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setActiveTab('store')}
            style={{
              background: activeTab === 'store' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === 'store' ? '#38bdf8' : '#e5e7eb',
              border: activeTab === 'store' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Package size={14} color={activeTab === 'store' ? '#38bdf8' : '#9ca3af'} />
            <span>Component Store</span>
          </button>

          {/* Component Dropdown Button */}
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: '#111827',
              color: '#f9fafb',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: '185px',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              {activeTab === 'settings' ? <Settings size={14} color="#c084fc" /> : getLucideIconForComponent(activeComp?.name)}
              <span style={{ color: activeTab === 'settings' ? '#c084fc' : '#f9fafb' }}>
                {activeTab === 'settings' ? 'GREX Nexus Dashboard' : (activeComp?.name || 'Select Component')}
              </span>
            </span>
            <ChevronDown size={13} style={{ opacity: 0.6, transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '46px',
              right: '0',
              width: '260px',
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              zIndex: 2000
            }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#6b7280', padding: '6px 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Components
              </div>
              {components.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => {
                    setActiveTab(comp.id);
                    setDropdownOpen(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: activeTab === comp.id ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    color: activeTab === comp.id ? '#38bdf8' : '#e5e7eb',
                    fontSize: '12px',
                    fontWeight: activeTab === comp.id ? '600' : '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (activeTab !== comp.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { if (activeTab !== comp.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getLucideIconForComponent(comp.name)}
                    <span>{comp.name}</span>
                  </span>
                  {activeTab === comp.id && <Check size={13} color="#38bdf8" />}
                </div>
              ))}

              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />

              <div
                onClick={() => {
                  setActiveTab('settings');
                  setDropdownOpen(false);
                }}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: activeTab === 'settings' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(192, 132, 252, 0.08)',
                  border: '1px solid rgba(192, 132, 252, 0.25)',
                  color: '#c084fc',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(192, 132, 252, 0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = activeTab === 'settings' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(192, 132, 252, 0.08)'}
              >
                <Settings size={14} color="#c084fc" />
                <span>GREX Nexus Dashboard</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'ordo' ? (
          <OrdoApp platformAPI={createHermesHostAPI()} />
        ) : activeTab === 'hermes' ? (
          <HermesOrchestratorEngine platformAPI={createHermesHostAPI()} />
        ) : activeTab === 'settings' ? (
          <div style={{ padding: '36px 28px', maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px', overflowY: 'auto', height: 'calc(100vh - 44px)', boxSizing: 'border-box' }}>
            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
                  <Settings size={22} color="#c084fc" /> GREX Nexus Dashboard
                </h1>
                <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>
                  Configure sovereign tokens, component provisioners, and runtime sidecar daemon inside Hermes GUI.
                </p>
              </div>
              <span style={{ fontSize: '11px', color: daemonStatus.online ? '#34d399' : '#9ca3af', background: daemonStatus.online ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255, 255, 255, 0.05)', border: daemonStatus.online ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(255, 255, 255, 0.1)', padding: '4px 12px', borderRadius: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={12} color={daemonStatus.online ? '#34d399' : '#9ca3af'} /> Sidecar: {daemonStatus.online ? `Online (${daemonStatus.version})` : 'Offline'}
              </span>
            </div>

            {/* GitHub Token Config Card */}
            <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <KeyRound size={16} color="#38bdf8" /> GitHub Personal Access Token
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    Required to pull from private repositories or bypass rate limits.
                  </p>
                </div>
                {tokenStatus.state === 'valid' && (
                  <span style={{ fontSize: '11px', color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '3px 10px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Check size={12} /> {tokenStatus.message}
                  </span>
                )}
                {tokenStatus.state === 'invalid' && (
                  <span style={{ fontSize: '11px', color: '#f87171', background: 'rgba(248, 113, 113, 0.12)', border: '1px solid rgba(248, 113, 113, 0.25)', padding: '3px 10px', borderRadius: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertCircle size={12} /> {tokenStatus.message}
                  </span>
                )}
              </div>
              <input
                type="password"
                placeholder="ghp_..."
                value={githubToken}
                onChange={(e) => handleSaveGithubToken(e.target.value)}
                style={{
                  width: '100%',
                  background: '#030712',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#f9fafb',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Component Provisioner Section */}
            <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#f9fafb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DownloadCloud size={16} color="#c084fc" /> Component Provisioner
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>Component Repository URL</label>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Paste the full GitHub URL to the component repository.</span>
                <input
                  type="text"
                  placeholder="https://github.com/user/repo"
                  value={provisionUrl}
                  onChange={(e) => setProvisionUrl(e.target.value)}
                  style={{ background: '#030712', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '10px 14px', color: '#f9fafb', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f9fafb' }}>Provision Component</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>Pulls release asset and registers runtime cache.</div>
                </div>
                <button
                  onClick={handleProvisionComponent}
                  disabled={!provisionUrl.trim()}
                  style={{
                    background: provisionUrl.trim() ? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' : '#1f2937',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 18px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: provisionUrl.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <DownloadCloud size={14} /> Pull Component
                </button>
              </div>
              {provisioningMsg && <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} /> {provisioningMsg}</div>}
            </div>

            {/* Installed Components Grid */}
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#f9fafb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} color="#38bdf8" /> Installed Components ({components.length})
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                {components.map((comp) => (
                  <div
                    key={comp.id}
                    style={{
                      background: '#111827',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '14px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', color: '#f9fafb', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getLucideIconForComponent(comp.name)} {comp.name}
                        </h4>
                        <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                          Active
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#9ca3af' }}>{comp.desc}</p>
                      <code style={{ fontSize: '11px', color: '#38bdf8', wordBreak: 'break-all', fontFamily: 'monospace' }}>{comp.repo}</code>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <button
                        onClick={() => setActiveTab(comp.id)}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Play size={12} fill="currentColor" /> Launch
                      </button>
                      <button
                        onClick={() => handlePurgeComponent(comp.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#f87171',
                          borderRadius: '8px',
                          padding: '8px 14px',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Trash2 size={13} /> Purge
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'store' ? (
          <div style={{ padding: '28px', maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', height: 'calc(100vh - 44px)', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#f9fafb', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={20} color="#38bdf8" /> GREX Nexus Component Store
                </h2>
                <p style={{ color: '#9ca3af', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Explore and install sovereign components directly from <code>beto-group</code> GitHub repositories into Hermes.
                </p>
              </div>
              <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                {communityRepos.length} Repositories Available
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="text"
                  placeholder="Search beto-group repositories..."
                  value={storeSearchQuery}
                  onChange={(e) => setStoreSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#111827',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    padding: '10px 14px 10px 36px',
                    color: '#f9fafb',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} /> Install Custom Component from GitHub
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="e.g. beto-group/SocialBotEngine"
                  value={ghRepoInput}
                  onChange={(e) => setGhRepoInput(e.target.value)}
                  style={{ flex: 1, background: '#030712', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '8px', padding: '10px 14px', color: '#f9fafb', fontSize: '13px' }}
                />
                <button
                  onClick={() => handleInstallFromGitHub()}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <DownloadCloud size={14} /> Install &amp; Launch
                </button>
              </div>
              {installingMsg && <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={14} /> {installingMsg}</div>}
            </div>

            {isLoadingStore ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                Fetching beto-group repositories...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {filteredCommunityRepos.map((repo) => {
                  const isInstalled = components.some(c => c.id === repo.id || c.repo.toLowerCase().includes(repo.name.toLowerCase()));
                  return (
                    <div key={repo.id} style={{ background: '#111827', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '14px', color: '#f9fafb', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {getLucideIconForComponent(repo.name)} {repo.name}
                          </h4>
                          {isInstalled && (
                            <span style={{ fontSize: '10px', color: '#34d399', background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.25)', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                              Installed
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>{repo.description}</p>
                        <code style={{ fontSize: '11px', color: '#38bdf8', wordBreak: 'break-all', fontFamily: 'monospace' }}>{repo.html_url}</code>
                      </div>
                      {isInstalled ? (
                        <button
                          onClick={() => setActiveTab(repo.id)}
                          style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Play size={12} fill="currentColor" /> Launch Component
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstallFromGitHub(repo.html_url)}
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <DownloadCloud size={13} /> Install Component
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
            <span>Component <code>{activeTab}</code> active in Hermes frame...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// REGISTER-ONLY: the Hermes GUI loader owns the mount. It renders this
// component inside the plugin's own sidebar tab container, using the host's
// own React (window.__HERMES_PLUGIN_SDK__.React). We consume React from the
// SDK (see vite.config.js externals) — if we bundled our own React, hooks
// would bind to a null dispatcher and throw "Cannot read properties of null
// (reading 'useState')". We must NOT self-mount to the global #root.
if (typeof window !== 'undefined' && window.__HERMES_PLUGINS__ && window.__HERMES_PLUGIN_SDK__ && window.__HERMES_PLUGIN_SDK__.React) {
  window.__HERMES_PLUGINS__.register("grex-nexus-hermes", GrexNexusHermesDashboard);
} else {
  console.error("[grex-nexus-hermes] Hermes plugin SDK (window.__HERMES_PLUGIN_SDK__.React) not available — plugin not registered.");
}
