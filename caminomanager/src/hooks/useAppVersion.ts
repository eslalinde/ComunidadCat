'use client';

import { useState, useEffect } from 'react';

const GITHUB_REPO = 'eslalinde/VibeCaminoManager';
export const DOWNLOAD_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const CURRENT_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

function compareVersions(a: string, b: string): number {
  const normalize = (v: string) => v.replace(/^v/, '');
  const pa = normalize(a).split(/[-.]/).map(s => isNaN(Number(s)) ? s : Number(s));
  const pb = normalize(b).split(/[-.]/).map(s => isNaN(Number(s)) ? s : Number(s));

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (typeof va === 'number' && typeof vb === 'number') {
      if (va !== vb) return va - vb;
    } else {
      const sa = String(va);
      const sb = String(vb);
      if (sa < sb) return -1;
      if (sa > sb) return 1;
    }
  }
  return 0;
}

export function useAppVersion() {
  const [isElectron, setIsElectron] = useState(true);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    setIsElectron(!!window.electronAPI);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) return;

    fetch(RELEASES_API)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.tag_name) {
          setLatestVersion(data.tag_name);
        }
      })
      .catch(() => {});
  }, []);

  const hasUpdate = latestVersion !== null && compareVersions(latestVersion, CURRENT_VERSION) > 0;

  return {
    isElectron,
    currentVersion: CURRENT_VERSION,
    latestVersion,
    hasUpdate,
    showDownload: !isElectron,
  };
}
