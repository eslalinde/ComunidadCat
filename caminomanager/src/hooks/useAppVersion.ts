'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';

import { compareVersions, validateStrict } from 'compare-versions';
import { repository, version as currentVersion } from '../../package.json';

const releasesUrl = `${repository.url}/releases`;
export const DOWNLOAD_URL = `${releasesUrl}/latest`;
export const releaseNotesUrl = `${releasesUrl}/tag/v${currentVersion}`;
const RELEASES_API = `https://api.github.com/repos${new URL(repository.url).pathname}/releases/latest`;

export function isNewerRelease(tag: string, installed: string): boolean {
  const version = tag.replace(/^v/, '');
  return validateStrict(version) && compareVersions(version, installed) > 0;
}

const subscribeNoop = () => () => {};
const getIsElectron = () => !!window.electronAPI;
const getIsElectronServer = () => true; // assume electron on server to avoid flash

export function useAppVersion() {
  const isElectron = useSyncExternalStore(subscribeNoop, getIsElectron, getIsElectronServer);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI) return;

    fetch(RELEASES_API)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (typeof data?.tag_name === 'string') {
          setLatestVersion(data.tag_name);
        }
      })
      .catch(() => {});
  }, []);

  const hasUpdate = latestVersion !== null && isNewerRelease(latestVersion, currentVersion);

  return {
    isElectron,
    currentVersion,
    latestVersion,
    hasUpdate,
    showDownload: !isElectron,
  };
}
