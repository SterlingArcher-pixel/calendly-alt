'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { US_LOCATIONS, type USLocation } from '../data/us-locations';

// —— Types ————————————————————————————————————————————————————————————

type VerifyStatus = 'idle' | 'checking' | 'found' | 'not_found' | 'skipped' | 'error' | 'no_key' | 'cached';

interface TierResult {
  status: VerifyStatus;
  tier: string;
  message?: string;
  url?: string;
  details?: Record<string, string>;
}

interface CachedResult {
  timestamp: number;
  foundResult: TierResult | null;
  results: TierResult[];
}

interface BatchJob {
  company: string;
  jobTitle: string;
  location: string;
}

interface BatchResult extends BatchJob {
  status: 'pending' | 'checking' | 'found' | 'not_found' | 'error' | 'cached';
  url?: string;
  tier?: string;
  details?: Record<string, string>;
}

// —— Cache helpers (24-hour TTL) ——————————————————————————————————————

const CACHE_KEY = 'indeed-verifier-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(company: string, jobTitle: string, location: string): string {
  return `${company.trim().toLowerCase()}|${jobTitle.trim().toLowerCase()}|${location.trim().toLowerCase()}`;
}

function getCache(): Record<string, CachedResult> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const cache = JSON.parse(raw);
    // Prune expired entries
    const now = Date.now();
    const pruned: Record<string, CachedResult> = {};
    for (const [key, val] of Object.entries(cache)) {
      const entry = val as CachedResult;
      if (now - entry.timestamp < CACHE_TTL) {
        pruned[key] = entry;
      }
    }
    return pruned;
  } catch {
    return {};
  }
}

function setCache(key: string, foundResult: TierResult | null, results: TierResult[]) {
  try {
    const cache = getCache();
    cache[key] = { timestamp: Date.now(), foundResult, results };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

function getCachedResult(key: string): CachedResult | null {
  const cache = getCache();
  return cache[key] || null;
}

function getCacheStats(): { count: number; oldest: number | null } {
  const cache = getCache();
  const entries = Object.values(cache);
  if (entries.length === 0) return { count: 0, oldest: null };
  const oldest = Math.min(...entries.map((e) => e.timestamp));
  return { count: entries.length, oldest };
}

function clearAllCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

// —— URL Generators ——————————————————————————————————————————————————

function getIndeedUrl(company: string, jobTitle: string, location: string) {
  const query = `${jobTitle} ${company ? `"${company}"` : ''}`.trim();
  const params = new URLSearchParams({ q: query, l: location, fromage: '14' });
  return `https://www.indeed.com/jobs?${params.toString()}`;
}

function getGoogleXRayUrl(company: string, jobTitle: string, location: string) {
  const parts = ['site:indeed.com'];
  if (jobTitle) parts.push(`intitle:"${jobTitle}"`);
  if (company) parts.push(`"${company}"`);
  if (location) parts.push(`"${location}"`);
  return `https://www.google.com/search?${new URLSearchParams({ q: parts.join(' ') })}`;
}

// —— Status colors ————————————————————————————————————————————————————

const STATUS_COLORS: Record<VerifyStatus, string> = {
  idle: '#475569',
  checking: '#f59e0b',
  found: '#10b981',
  not_found: '#ef4444',
  skipped: '#475569',
  error: '#ef4444',
  no_key: '#64748b',
  cached: '#06b6d4',
};

// —— Location Autocomplete Hook ——————————————————————————————————————

function useLocationAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<USLocation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSuggestions = useCallback((value: string) => {
    if (value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const lower = value.toLowerCase().trim();
    const isZipSearch = /^\d+$/.test(lower);
    let matches: USLocation[];

    if (isZipSearch) {
      matches = US_LOCATIONS.filter((loc) => loc.zip && loc.zip.startsWith(lower)).slice(0, 8);
    } else {
      const cityStarts = US_LOCATIONS.filter(
        (loc) => !loc.zip && loc.city.toLowerCase().startsWith(lower)
      );
      const displayContains = US_LOCATIONS.filter(
        (loc) =>
          !loc.zip &&
          !loc.city.toLowerCase().startsWith(lower) &&
          loc.display.toLowerCase().includes(lower)
      );
      matches = [...cityStarts, ...displayContains].slice(0, 8);
    }

    setSuggestions(matches);
    setSelectedIndex(-1);
    setIsOpen(matches.length > 0);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    query, setQuery, suggestions, selectedIndex, setSelectedIndex,
    isOpen, setIsOpen, containerRef, updateSuggestions,
  };
}

// —— Verify single job (used by both single + batch) —————————————————

async function verifySingleJob(
  company: string,
  jobTitle: string,
  location: string
): Promise<{ foundResult: TierResult | null; results: TierResult[] }> {
  const body = JSON.stringify({ company, jobTitle, location });
  const headers = { 'Content-Type': 'application/json' };
  const allResults: TierResult[] = [];
  let found: TierResult | null = null;

  // Tier 1: JSearch
  try {
    const res = await fetch('/api/verify/jsearch', { method: 'POST', headers, body });
    const data = await res.json();
    const r: TierResult = { ...data, tier: 'JSearch API' };
    allResults.push(r);
    if (data.status === 'found') {
      found = r;
      return { foundResult: found, results: allResults };
    }
  } catch (err: any) {
    allResults.push({ status: 'error', tier: 'JSearch API', message: err.message });
  }

  // Tier 2: Google CSE
  try {
    const res = await fetch('/api/verify/gcse', { method: 'POST', headers, body });
    const data = await res.json();
    const r: TierResult = { ...data, tier: 'Google CSE' };
    allResults.push(r);
    if (data.status === 'found') {
      found = r;
    }
  } catch (err: any) {
    allResults.push({ status: 'error', tier: 'Google CSE', message: err.message });
  }

  return { foundResult: found, results: allResults };
}

// —— Main Component ———————————————————————————————————————————————————

export default function Home() {
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState<TierResult[]>([]);
  const [foundResult, setFoundResult] = useState<TierResult | null>(null);
  const [tierStatuses, setTierStatuses] = useState<Record<string, VerifyStatus>>({});
  const [copied, setCopied] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [wasCached, setWasCached] = useState(false);
  const [cacheCount, setCacheCount] = useState(0);

  // Batch mode
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [batchText, setBatchText] = useState('');
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [manualCompany, setManualCompany] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualLocation, setManualLocation] = useState('');

  // Location autocomplete
  const loc = useLocationAutocomplete();
  const location = loc.query;
  const setLocation = (val: string) => {
    loc.setQuery(val);
    loc.updateSuggestions(val);
  };

  const selectLocation = (suggestion: USLocation) => {
    const displayValue = suggestion.zip
      ? `${suggestion.city}, ${suggestion.state}`
      : suggestion.display;
    loc.setQuery(displayValue);
    loc.setIsOpen(false);
    loc.setSelectedIndex(-1);
  };

  // Update cache count on mount
  useEffect(() => {
    setCacheCount(getCacheStats().count);
  }, [results, batchResults]);

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (!loc.isOpen) {
      if (e.key === 'Enter') runVerification();
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        loc.setSelectedIndex((prev) => (prev < loc.suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        loc.setSelectedIndex((prev) => (prev > 0 ? prev - 1 : loc.suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (loc.selectedIndex >= 0 && loc.suggestions[loc.selectedIndex]) {
          selectLocation(loc.suggestions[loc.selectedIndex]);
        } else {
          loc.setIsOpen(false);
          runVerification();
        }
        break;
      case 'Escape':
        loc.setIsOpen(false);
        break;
      case 'Tab':
        if (loc.selectedIndex >= 0 && loc.suggestions[loc.selectedIndex]) {
          selectLocation(loc.suggestions[loc.selectedIndex]);
        }
        loc.setIsOpen(false);
        break;
    }
  };

  const isFormValid = company.trim() !== '' || jobTitle.trim() !== '';

  // —— Single verification (with cache) ———————————————————————————————

  const runVerification = async () => {
    if (!isFormValid || isVerifying) return;

    loc.setIsOpen(false);
    setWasCached(false);

    // Check cache first
    const cKey = getCacheKey(company, jobTitle, location);
    const cached = getCachedResult(cKey);
    if (cached) {
      setResults(cached.results);
      setFoundResult(cached.foundResult);
      setWasCached(true);
      // Set tier statuses from cached results
      const statuses: Record<string, VerifyStatus> = {};
      for (const r of cached.results) {
        if (r.tier === 'JSearch API') statuses.jsearch = r.status;
        if (r.tier === 'Google CSE') statuses.gcse = r.status;
      }
      if (cached.foundResult?.tier === 'JSearch API' && !statuses.gcse) statuses.gcse = 'skipped';
      setTierStatuses(statuses);
      setCacheCount(getCacheStats().count);
      return;
    }

    setIsVerifying(true);
    setResults([]);
    setFoundResult(null);
    setTierStatuses({ jsearch: 'checking', gcse: 'idle' });

    const body = JSON.stringify({ company, jobTitle, location });
    const headers = { 'Content-Type': 'application/json' };
    const allResults: TierResult[] = [];

    // Tier 1: JSearch
    try {
      const res = await fetch('/api/verify/jsearch', { method: 'POST', headers, body });
      const data = await res.json();
      const r: TierResult = { ...data, tier: 'JSearch API' };
      allResults.push(r);
      setResults([...allResults]);
      setTierStatuses((prev) => ({ ...prev, jsearch: data.status }));

      if (data.status === 'found') {
        setFoundResult(r);
        setTierStatuses((prev) => ({ ...prev, gcse: 'skipped' }));
        setIsVerifying(false);
        setCache(cKey, r, allResults);
        setCacheCount(getCacheStats().count);
        return;
      }
    } catch (err: any) {
      const r: TierResult = { status: 'error', tier: 'JSearch API', message: err.message };
      allResults.push(r);
      setResults([...allResults]);
      setTierStatuses((prev) => ({ ...prev, jsearch: 'error' }));
    }

    // Tier 2: Google CSE
    setTierStatuses((prev) => ({ ...prev, gcse: 'checking' }));
    try {
      const res = await fetch('/api/verify/gcse', { method: 'POST', headers, body });
      const data = await res.json();
      const r: TierResult = { ...data, tier: 'Google CSE' };
      allResults.push(r);
      setResults([...allResults]);
      setTierStatuses((prev) => ({ ...prev, gcse: data.status }));

      if (data.status === 'found') {
        setFoundResult(r);
        setCache(cKey, r, allResults);
      } else {
        setCache(cKey, null, allResults);
      }
    } catch (err: any) {
      const r: TierResult = { status: 'error', tier: 'Google CSE', message: err.message };
      allResults.push(r);
      setResults([...allResults]);
      setTierStatuses((prev) => ({ ...prev, gcse: 'error' }));
      setCache(cKey, null, allResults);
    }

    setIsVerifying(false);
    setCacheCount(getCacheStats().count);
  };

  // —— Batch verification ——————————————————————————————————————————————

  const parseBatchText = (text: string): BatchJob[] => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'))
      .map((line) => {
        // Auto-detect separator: tab (spreadsheet paste) > pipe > comma
        let sep = ',';
        if (line.includes('\t')) sep = '\t';
        else if (line.includes('|')) sep = '|';
        const parts = line.split(sep).map((p) => p.trim());
        return {
          company: parts[0] || '',
          jobTitle: parts[1] || '',
          location: parts[2] || '',
        };
      })
      .filter((j) => j.company || j.jobTitle);
  };

  const parsedJobs = parseBatchText(batchText);

  // Manual row adder
  const addManualRow = () => {
    if (!manualCompany && !manualTitle) return;
    const newLine = `${manualCompany} | ${manualTitle} | ${manualLocation}`;
    setBatchText((prev) => (prev.trim() ? prev.trim() + '\n' + newLine : newLine));
    setManualCompany('');
    setManualTitle('');
    setManualLocation('');
  };

  const removeRow = (index: number) => {
    const lines = batchText.split('\n').filter((l) => l.trim().length > 0 && !l.startsWith('#'));
    lines.splice(index, 1);
    setBatchText(lines.join('\n'));
  };

  const runBatch = async () => {
    const jobs = parseBatchText(batchText);
    if (jobs.length === 0 || batchRunning) return;

    setBatchRunning(true);
    setBatchProgress({ current: 0, total: jobs.length });

    // Initialize all as pending
    const initial: BatchResult[] = jobs.map((j) => ({ ...j, status: 'pending' }));
    setBatchResults(initial);

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      setBatchProgress({ current: i + 1, total: jobs.length });

      // Update current to "checking"
      setBatchResults((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], status: 'checking' };
        return next;
      });

      // Check cache first
      const cKey = getCacheKey(job.company, job.jobTitle, job.location);
      const cached = getCachedResult(cKey);

      if (cached) {
        setBatchResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: cached.foundResult ? 'found' : 'not_found',
            url: cached.foundResult?.url,
            tier: (cached.foundResult?.tier || cached.results[0]?.tier || '') + ' (cached)',
            details: cached.foundResult?.details,
          };
          return next;
        });
        continue;
      }

      // Run verification
      try {
        const { foundResult: fr, results: rs } = await verifySingleJob(
          job.company,
          job.jobTitle,
          job.location
        );

        // Cache the result
        setCache(cKey, fr, rs);

        setBatchResults((prev) => {
          const next = [...prev];
          next[i] = {
            ...next[i],
            status: fr ? 'found' : 'not_found',
            url: fr?.url,
            tier: fr?.tier || rs[rs.length - 1]?.tier || '',
            details: fr?.details,
          };
          return next;
        });
      } catch (err: any) {
        setBatchResults((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], status: 'error' };
          return next;
        });
      }

      // Small delay between requests to avoid rate limiting
      if (i < jobs.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    setBatchRunning(false);
    setCacheCount(getCacheStats().count);
  };

  const copyBatchReport = () => {
    const found = batchResults.filter((r) => r.status === 'found');
    const notFound = batchResults.filter((r) => r.status === 'not_found');
    const errors = batchResults.filter((r) => r.status === 'error');

    let report = `Indeed Job Verification Report\n`;
    report += `Date: ${new Date().toLocaleDateString()}\n`;
    report += `Total: ${batchResults.length} jobs | Found: ${found.length} | Not Found: ${notFound.length} | Errors: ${errors.length}\n`;
    report += `${'—'.repeat(60)}\n\n`;

    if (found.length > 0) {
      report += `✓ VERIFIED ON INDEED (${found.length})\n`;
      for (const r of found) {
        report += `  • ${r.jobTitle} at ${r.company} — ${r.location}\n`;
        if (r.url) report += `    ${r.url}\n`;
      }
      report += '\n';
    }

    if (notFound.length > 0) {
      report += `✗ NOT FOUND (${notFound.length})\n`;
      for (const r of notFound) {
        report += `  • ${r.jobTitle} at ${r.company} — ${r.location}\n`;
      }
      report += '\n';
    }

    if (errors.length > 0) {
      report += `⚠ ERRORS (${errors.length})\n`;
      for (const r of errors) {
        report += `  • ${r.jobTitle} at ${r.company} — ${r.location}\n`;
      }
    }

    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // —— Email template ——————————————————————————————————————————————————

  const emailTemplate = `Hi there,

I looked into your Indeed visibility, and I was able to locate your "${jobTitle || '[Job Title]'}" role in ${location || '[Location]'}.

You can view the active Indeed listing here:
${foundResult?.url || '[INSERT LINK HERE]'}

Please note that Indeed's search algorithm prioritizes sponsored (paid) jobs. Because this is an organic (free) listing, it may not appear on the very first page of search results for all candidates depending on their search history and exact keywords, but it is successfully live on their platform.

Best,
Apploi Support`;

  const copyEmail = () => {
    navigator.clipboard.writeText(emailTemplate).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = emailTemplate;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // —— Styles —————————————————————————————————————————————————————————

  const card: React.CSSProperties = {
    background: '#111827',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #1e293b',
  };

  const label: React.CSSProperties = {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginBottom: 6,
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    fontFamily: 'inherit',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    background: active ? '#111827' : 'transparent',
    color: active ? '#f1f5f9' : '#475569',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
    transition: 'all 0.2s',
  });

  // —— Render —————————————————————————————————————————————————————————

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid #1e293b',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #0f172a 0%, #0a0f1a 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8, background: '#1e3a5f',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}
          >
            🔍
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
              Indeed Job Verifier
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>
              Apploi CSM Tool — 2-Tier API + Manual Fallback
            </p>
          </div>
        </div>
        {/* Cache indicator */}
        {cacheCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#06b6d4' }}>
              {cacheCount} cached {cacheCount === 1 ? 'search' : 'searches'}
            </span>
            <button
              onClick={() => { clearAllCache(); setCacheCount(0); }}
              style={{
                padding: '4px 8px', background: 'transparent', border: '1px solid #334155',
                borderRadius: 4, color: '#475569', fontSize: 10, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          </div>
        )}
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        {/* Mode tabs */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 4 }}>
          <button onClick={() => setMode('single')} style={tabBtn(mode === 'single')}>
            Single Search
          </button>
          <button onClick={() => setMode('batch')} style={tabBtn(mode === 'batch')}>
            Batch Verify
          </button>
        </div>

        {mode === 'single' ? (
          /* ═══════════════ SINGLE MODE ═══════════════ */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Search form */}
              <div style={card}>
                <div style={{ marginBottom: 16 }}>
                  <label style={label}>Company Name</label>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Sunrise Senior Living"
                    style={inputStyle}
                    onKeyDown={(e) => e.key === 'Enter' && runVerification()}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={label}>Job Title</label>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Registered Nurse"
                    style={inputStyle}
                    onKeyDown={(e) => e.key === 'Enter' && runVerification()}
                  />
                </div>

                {/* Location with Autocomplete */}
                <div style={{ marginBottom: 20 }}>
                  <label style={label}>Location</label>
                  <div ref={loc.containerRef} style={{ position: 'relative' }}>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onFocus={() => { if (loc.suggestions.length > 0) loc.setIsOpen(true); }}
                      onKeyDown={handleLocationKeyDown}
                      placeholder="City, state, or zip code..."
                      style={{
                        ...inputStyle,
                        borderRadius: loc.isOpen ? '8px 8px 0 0' : 8,
                        borderBottomColor: loc.isOpen ? '#3b82f6' : '#334155',
                      }}
                      autoComplete="off"
                    />
                    {loc.isOpen && loc.suggestions.length > 0 && (
                      <div
                        style={{
                          position: 'absolute', top: '100%', left: 0, right: 0,
                          background: '#0f172a', border: '1px solid #3b82f6',
                          borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 50,
                          maxHeight: 240, overflowY: 'auto',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        }}
                      >
                        {loc.suggestions.map((s, i) => {
                          const isSelected = i === loc.selectedIndex;
                          const lower = location.toLowerCase();
                          const displayText = s.display;
                          const idx = displayText.toLowerCase().indexOf(lower);
                          let displayContent;
                          if (idx >= 0) {
                            const before = displayText.slice(0, idx);
                            const match = displayText.slice(idx, idx + location.length);
                            const after = displayText.slice(idx + location.length);
                            displayContent = (
                              <>
                                {before}
                                <span style={{ color: '#60a5fa', fontWeight: 700 }}>{match}</span>
                                {after}
                              </>
                            );
                          } else {
                            displayContent = displayText;
                          }
                          return (
                            <div
                              key={`${s.city}-${s.state}-${s.zip}-${i}`}
                              onClick={() => selectLocation(s)}
                              onMouseEnter={() => loc.setSelectedIndex(i)}
                              style={{
                                padding: '10px 14px', cursor: 'pointer',
                                background: isSelected ? '#1e293b' : 'transparent',
                                color: isSelected ? '#f1f5f9' : '#94a3b8',
                                fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                                borderBottom: i < loc.suggestions.length - 1 ? '1px solid #1e293b' : 'none',
                                transition: 'background 0.1s',
                              }}
                            >
                              <span style={{ fontSize: 12, opacity: 0.5 }}>{s.zip ? '📮' : '📍'}</span>
                              <span>{displayContent}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={runVerification}
                  disabled={!isFormValid || isVerifying}
                  style={{
                    width: '100%', padding: '14px 20px', border: 'none', borderRadius: 8,
                    fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                    cursor: isFormValid && !isVerifying ? 'pointer' : 'not-allowed',
                    background: isFormValid && !isVerifying
                      ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : '#1e293b',
                    color: isFormValid ? 'white' : '#475569',
                    transition: 'all 0.2s',
                    boxShadow: isFormValid ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                  }}
                >
                  {isVerifying ? '⟳ Checking...' : '▶ Verify Job on Indeed'}
                </button>
              </div>

              {/* Pipeline status */}
              <div style={card}>
                <label style={{ ...label, marginBottom: 12 }}>Verification Pipeline</label>
                {[
                  { id: 'jsearch', name: 'JSearch API', desc: 'Google for Jobs index', accent: '#3b82f6' },
                  { id: 'gcse', name: 'Google CSE', desc: 'Google site:indeed.com', accent: '#8b5cf6' },
                ].map((tier, i, arr) => {
                  const status = tierStatuses[tier.id] || 'idle';
                  const color = STATUS_COLORS[status];
                  return (
                    <div
                      key={tier.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid #1e293b' : 'none',
                      }}
                    >
                      <div
                        style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: status === 'checking' ? `${tier.accent}20` : '#1e293b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1px solid ${status === 'checking' ? tier.accent : '#334155'}`,
                          transition: 'all 0.3s',
                        }}
                      >
                        <span
                          style={{
                            width: 8, height: 8, borderRadius: '50%', background: color,
                            display: 'block',
                            animation: status === 'checking' ? 'pulse 1s infinite' : 'none',
                            boxShadow: status === 'found' ? `0 0 8px ${color}` : 'none',
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
                          Tier {i + 1}: {tier.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569' }}>{tier.desc}</div>
                      </div>
                      <span style={{ fontSize: 11, color, fontWeight: 600, textTransform: 'uppercase' }}>
                        {status === 'idle' ? '' : status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Manual fallback */}
              <div style={card}>
                <label style={{ ...label, marginBottom: 12 }}>Manual Fallback</label>
                <p style={{ fontSize: 12, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                  If the API check comes back empty, use these to search Indeed directly.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={isFormValid ? getIndeedUrl(company, jobTitle, location) : '#'}
                    target={isFormValid ? '_blank' : '_self'}
                    rel="noreferrer"
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 12,
                      textDecoration: 'none', textAlign: 'center',
                      background: isFormValid ? '#1e293b' : '#0f172a',
                      color: isFormValid ? '#60a5fa' : '#334155',
                      border: `1px solid ${isFormValid ? '#334155' : '#1e293b'}`,
                      cursor: isFormValid ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Indeed Direct ↗
                  </a>
                  <a
                    href={isFormValid ? getGoogleXRayUrl(company, jobTitle, location) : '#'}
                    target={isFormValid ? '_blank' : '_self'}
                    rel="noreferrer"
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 8, fontSize: 12,
                      textDecoration: 'none', textAlign: 'center',
                      background: isFormValid ? '#1e293b' : '#0f172a',
                      color: isFormValid ? '#a78bfa' : '#334155',
                      border: `1px solid ${isFormValid ? '#334155' : '#1e293b'}`,
                      cursor: isFormValid ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Google X-Ray ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Results */}
              <div style={{ ...card, minHeight: 200 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <label style={{ ...label, marginBottom: 0 }}>Verification Results</label>
                  {wasCached && (
                    <span style={{
                      fontSize: 10, color: '#06b6d4', background: '#083344',
                      padding: '3px 8px', borderRadius: 4, fontWeight: 600,
                    }}>
                      ⚡ FROM CACHE
                    </span>
                  )}
                </div>

                {results.length === 0 && !isVerifying ? (
                  <div
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', padding: '40px 20px', color: '#334155',
                    }}
                  >
                    <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.5 }}>⊘</div>
                    <p style={{ fontSize: 13, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
                      Enter a company name and/or job title,<br />then hit verify.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {results.map((r, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 14, background: '#0f172a', borderRadius: 10,
                          border: `1px solid ${r.status === 'found' ? '#064e3b' : '#1e293b'}`,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: STATUS_COLORS[r.status], display: 'inline-block',
                            boxShadow: r.status === 'found' ? `0 0 8px ${STATUS_COLORS[r.status]}` : 'none',
                          }} />
                          <span style={{
                            color: STATUS_COLORS[r.status], fontSize: 12, fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {r.status.replace('_', ' ')}
                          </span>
                          <span style={{ color: '#475569', fontSize: 11 }}>{r.tier}</span>
                        </div>
                        {r.message && (
                          <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 6px 20px', lineHeight: 1.5 }}>
                            {r.message}
                          </p>
                        )}
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noreferrer" style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            marginLeft: 20, color: '#60a5fa', fontSize: 12,
                            textDecoration: 'none', wordBreak: 'break-all',
                          }}>
                            {r.url.length > 55 ? r.url.slice(0, 55) + '...' : r.url} ↗
                          </a>
                        )}
                        {r.details && (
                          <div style={{ marginLeft: 20, marginTop: 8 }}>
                            {Object.entries(r.details).map(([k, v]) => (
                              <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                                <span style={{ color: '#475569', fontSize: 11, minWidth: 100 }}>{k}:</span>
                                <span style={{ color: '#cbd5e1', fontSize: 11 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {isVerifying && (
                      <div style={{
                        padding: 14, background: '#0f172a', borderRadius: 10,
                        border: '1px solid #1e293b', textAlign: 'center',
                      }}>
                        <span style={{ color: '#f59e0b', fontSize: 12, animation: 'pulse 1s infinite' }}>
                          Checking next tier...
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!isVerifying && results.length > 0 && !foundResult && (
                  <div style={{
                    marginTop: 14, padding: 12, background: '#1c1008',
                    borderRadius: 8, border: '1px solid #422006',
                  }}>
                    <p style={{ color: '#fbbf24', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      <strong>Not found via APIs.</strong> Use the manual fallback buttons on the left.
                    </p>
                  </div>
                )}
                {foundResult && (
                  <div style={{
                    marginTop: 14, padding: 12, background: '#022c22',
                    borderRadius: 8, border: '1px solid #064e3b',
                  }}>
                    <p style={{ color: '#6ee7b7', fontSize: 12, margin: 0, fontWeight: 600 }}>
                      ✓ Job verified as live on Indeed
                    </p>
                  </div>
                )}
              </div>

              {/* Common reasons */}
              <div style={card}>
                <label style={{ ...label, marginBottom: 12 }}>Why Can&apos;t the Customer Find It?</label>
                {[
                  { icon: '💰', title: 'Organic vs Sponsored', desc: 'Free listings get buried behind paid/sponsored jobs over time.' },
                  { icon: '⏱', title: 'Processing Delay', desc: 'Indeed Trust & Safety takes up to 24-48hrs to index new API-synced jobs.' },
                  { icon: '📍', title: 'Search Radius', desc: "Indeed's algorithm is hyper-local. Searching from 20+ miles away may hide it." },
                  { icon: '🔄', title: 'Duplicate Rules', desc: 'If they also posted directly on Indeed, it hides the Apploi/feed version.' },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 10, padding: '10px 0',
                    borderBottom: i < 3 ? '1px solid #1e293b' : 'none',
                  }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, marginBottom: 2 }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Email template */}
              <div>
                <button
                  onClick={() => setShowEmail(!showEmail)}
                  style={{
                    width: '100%', padding: '12px 16px', background: '#111827',
                    border: '1px solid #1e293b',
                    borderRadius: showEmail ? '12px 12px 0 0' : 12,
                    color: '#94a3b8', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
                    textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>📧 Customer Email Template</span>
                  <span style={{ fontSize: 11 }}>{showEmail ? '▲' : '▼'}</span>
                </button>
                {showEmail && (
                  <div style={{
                    background: '#111827', border: '1px solid #1e293b',
                    borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 16,
                  }}>
                    <pre style={{
                      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8,
                      padding: 14, color: '#cbd5e1', fontSize: 12, whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word', lineHeight: 1.6, margin: '0 0 10px 0', fontFamily: 'inherit',
                    }}>
                      {emailTemplate}
                    </pre>
                    <button
                      onClick={copyEmail}
                      style={{
                        padding: '8px 16px', background: copied ? '#064e3b' : '#334155',
                        border: 'none', borderRadius: 6,
                        color: copied ? '#6ee7b7' : '#e2e8f0',
                        cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                      }}
                    >
                      {copied ? '✓ Copied' : '⎘ Copy to clipboard'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ═══════════════ BATCH MODE ═══════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={card}>
              <label style={{ ...label, marginBottom: 8 }}>Paste Jobs to Verify</label>
              <p style={{ fontSize: 12, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                Paste from a spreadsheet, CSV, or type manually. Supports{' '}
                <span style={{ color: '#94a3b8' }}>tab</span>,{' '}
                <span style={{ color: '#94a3b8' }}>pipe (|)</span>, or{' '}
                <span style={{ color: '#94a3b8' }}>comma</span> separators.
                Format: <span style={{ color: '#e2e8f0' }}>Company, Job Title, Location</span>
              </p>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={`Paste from spreadsheet or type:\nCardinal Pediatric Therapies | RBT | Queen Creek, AZ\nSunrise Senior Living | RN | Atlanta, GA\nBrookdale Senior Living | CNA | Denver, CO`}
                style={{
                  ...inputStyle,
                  minHeight: 120,
                  resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
            </div>

            {/* Quick Add Row */}
            <div style={card}>
              <label style={{ ...label, marginBottom: 10 }}>Quick Add</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 2 }}>
                  <span style={{ fontSize: 10, color: '#475569', display: 'block', marginBottom: 4 }}>Company</span>
                  <input
                    value={manualCompany}
                    onChange={(e) => setManualCompany(e.target.value)}
                    placeholder="Company name"
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                    onKeyDown={(e) => e.key === 'Enter' && addManualRow()}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <span style={{ fontSize: 10, color: '#475569', display: 'block', marginBottom: 4 }}>Job Title</span>
                  <input
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Job title"
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                    onKeyDown={(e) => e.key === 'Enter' && addManualRow()}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <span style={{ fontSize: 10, color: '#475569', display: 'block', marginBottom: 4 }}>Location</span>
                  <input
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="City, ST"
                    style={{ ...inputStyle, padding: '8px 10px', fontSize: 12 }}
                    onKeyDown={(e) => e.key === 'Enter' && addManualRow()}
                  />
                </div>
                <button
                  onClick={addManualRow}
                  disabled={!manualCompany && !manualTitle}
                  style={{
                    padding: '8px 14px', border: 'none', borderRadius: 6,
                    background: (manualCompany || manualTitle) ? '#1d4ed8' : '#1e293b',
                    color: (manualCompany || manualTitle) ? 'white' : '#475569',
                    cursor: (manualCompany || manualTitle) ? 'pointer' : 'not-allowed',
                    fontSize: 16, fontFamily: 'inherit', fontWeight: 700, flexShrink: 0,
                    lineHeight: 1, height: 36,
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Preview Table */}
            {parsedJobs.length > 0 && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ ...label, marginBottom: 0 }}>
                    Preview — {parsedJobs.length} {parsedJobs.length === 1 ? 'job' : 'jobs'} detected
                  </label>
                  <button
                    onClick={() => setBatchText('')}
                    style={{
                      padding: '3px 8px', background: 'transparent', border: '1px solid #334155',
                      borderRadius: 4, color: '#475569', fontSize: 10, cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Clear All
                  </button>
                </div>

                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 28px',
                  gap: 8, padding: '6px 10px', marginBottom: 4,
                }}>
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company</span>
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Title</span>
                  <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</span>
                  <span></span>
                </div>

                {/* Table rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
                  {parsedJobs.map((job, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 28px',
                        gap: 8, padding: '8px 10px', background: '#0f172a',
                        borderRadius: 6, border: '1px solid #1e293b', alignItems: 'center',
                      }}
                    >
                      <span style={{
                        fontSize: 12, color: job.company ? '#e2e8f0' : '#ef4444',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {job.company || '(missing)'}
                      </span>
                      <span style={{
                        fontSize: 12, color: job.jobTitle ? '#e2e8f0' : '#ef4444',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {job.jobTitle || '(missing)'}
                      </span>
                      <span style={{
                        fontSize: 12, color: job.location ? '#94a3b8' : '#f59e0b',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {job.location || '(optional)'}
                      </span>
                      <button
                        onClick={() => removeRow(i)}
                        style={{
                          width: 22, height: 22, border: 'none', borderRadius: 4,
                          background: 'transparent', color: '#475569', cursor: 'pointer',
                          fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0,
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run button */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={runBatch}
                disabled={batchRunning || parsedJobs.length === 0}
                style={{
                  padding: '14px 28px', border: 'none', borderRadius: 8,
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                  cursor: !batchRunning && parsedJobs.length > 0 ? 'pointer' : 'not-allowed',
                  background: !batchRunning && parsedJobs.length > 0
                    ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : '#1e293b',
                  color: parsedJobs.length > 0 ? 'white' : '#475569',
                  boxShadow: parsedJobs.length > 0 ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                }}
              >
                {batchRunning
                  ? `⟳ Checking ${batchProgress.current}/${batchProgress.total}...`
                  : `▶ Verify ${parsedJobs.length} ${parsedJobs.length === 1 ? 'Job' : 'Jobs'}`}
              </button>
              {batchRunning && (
                <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%', borderRadius: 3,
                      background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Batch Results */}
            {batchResults.length > 0 && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <label style={{ ...label, marginBottom: 0 }}>
                    Batch Results — {batchResults.filter((r) => r.status === 'found').length} found,{' '}
                    {batchResults.filter((r) => r.status === 'not_found').length} not found
                    {batchResults.some((r) => r.tier?.includes('cached')) && (
                      <span style={{ color: '#06b6d4', marginLeft: 6 }}>
                        ({batchResults.filter((r) => r.tier?.includes('cached')).length} cached)
                      </span>
                    )}
                  </label>
                  {!batchRunning && batchResults.length > 0 && (
                    <button
                      onClick={copyBatchReport}
                      style={{
                        padding: '6px 12px', background: copied ? '#064e3b' : '#334155',
                        border: 'none', borderRadius: 6,
                        color: copied ? '#6ee7b7' : '#e2e8f0',
                        cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
                      }}
                    >
                      {copied ? '✓ Copied Report' : '📋 Copy Report'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {batchResults.map((r, i) => {
                    const statusColor =
                      r.status === 'found' ? '#10b981' :
                      r.status === 'not_found' ? '#ef4444' :
                      r.status === 'checking' ? '#f59e0b' :
                      r.status === 'cached' ? '#06b6d4' :
                      r.status === 'error' ? '#ef4444' : '#475569';

                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', background: '#0f172a', borderRadius: 8,
                          border: `1px solid ${r.status === 'found' ? '#064e3b' : '#1e293b'}`,
                        }}
                      >
                        {/* Status dot */}
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: statusColor,
                          animation: r.status === 'checking' ? 'pulse 1s infinite' : 'none',
                          boxShadow: r.status === 'found' ? `0 0 8px ${statusColor}` : 'none',
                        }} />

                        {/* Job info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                            {r.jobTitle} <span style={{ color: '#475569', fontWeight: 400 }}>at</span> {r.company}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569' }}>
                            {r.location}
                            {r.tier && (
                              <span style={{ marginLeft: 8, color: r.tier.includes('cached') ? '#06b6d4' : '#475569' }}>
                                • {r.tier}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Status label */}
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          color: statusColor, letterSpacing: '0.05em', flexShrink: 0,
                        }}>
                          {r.status === 'pending' ? '—' :
                           r.status === 'checking' ? 'CHECKING' :
                           r.status.replace('_', ' ')}
                        </span>

                        {/* Link */}
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: 11, color: '#60a5fa', textDecoration: 'none',
                              flexShrink: 0, padding: '4px 8px', background: '#1e293b',
                              borderRadius: 4,
                            }}
                          >
                            View ↗
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
