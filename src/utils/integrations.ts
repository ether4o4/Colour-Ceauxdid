/**
 * Third-party integrations via Personal Access Tokens.
 *
 * BYOK-style, same pattern as the LLM providers:
 *   - GitHub: user creates a PAT with `repo` scope at github.com/settings/tokens.
 *   - Google Drive: user creates an OAuth 2.0 access token via
 *     https://developers.google.com/oauthplayground (select Drive API readonly),
 *     or uses a long-lived refresh token flow (future).
 *
 * Tokens live in expo-secure-store; only metadata lives in AsyncStorage.
 */

import { ExternalAsset } from '../types';
import { setExternalAssetToken, getExternalAssetToken } from '../store';
import { v4 as uuidv4 } from 'uuid';

// ────────── GitHub ──────────
const GH_API = 'https://api.github.com';

export async function testGitHubToken(token: string): Promise<{ ok: boolean; error?: string; login?: string }> {
  if (!/^(ghp_|github_pat_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]+$/.test(token.trim())) {
    return { ok: false, error: 'Invalid GitHub token format. Paste a PAT that starts with ghp_ or github_pat_.' };
  }
  try {
    const r = await fetch(`${GH_API}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!r.ok) {
      const msg =
        r.status === 401 ? 'Invalid GitHub token. Generate a classic PAT or fine-grained token with repository read access.'
        : r.status === 403 ? 'GitHub token lacks permission or is rate limited. Grant repository read access.'
        : `GitHub returned ${r.status}.`;
      return { ok: false, error: msg };
    }
    const data = await r.json();
    return { ok: true, login: data.login };
  } catch (e: any) {
    return { ok: false, error: 'Network error contacting GitHub.' };
  }
}

export async function listGitHubRepos(token: string, limit = 30): Promise<{ fullName: string; description?: string; stars: number }[]> {
  try {
    const r = await fetch(`${GH_API}/user/repos?per_page=${limit}&sort=updated`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return data.map((r: any) => ({ fullName: r.full_name, description: r.description, stars: r.stargazers_count }));
  } catch { return []; }
}

// ────────── Google Drive ──────────
const GDRIVE_API = 'https://www.googleapis.com/drive/v3';

export async function testGoogleDriveToken(token: string): Promise<{ ok: boolean; error?: string; userEmail?: string }> {
  if (!/^ya29\.[A-Za-z0-9_.-]+$/.test(token.trim())) {
    return { ok: false, error: 'Paste a Google OAuth access token that starts with ya29.' };
  }
  try {
    const r = await fetch(`${GDRIVE_API}/about?fields=user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      const msg =
        r.status === 401 ? 'Token expired or invalid. Get a fresh OAuth access token with Drive readonly scope.'
        : r.status === 403 ? 'Google Drive token lacks Drive readonly permission.'
        : `Google Drive returned ${r.status}.`;
      return { ok: false, error: msg };
    }
    const data = await r.json();
    return { ok: true, userEmail: data?.user?.emailAddress };
  } catch (e: any) {
    return { ok: false, error: 'Network error contacting Google Drive.' };
  }
}

export async function listDriveFiles(token: string, limit = 30): Promise<{ id: string; name: string; mimeType: string }[]> {
  try {
    const r = await fetch(`${GDRIVE_API}/files?pageSize=${limit}&fields=files(id,name,mimeType)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return data.files || [];
  } catch { return []; }
}

// ────────── Helper to create a new asset record with secret ──────────
export async function createExternalAsset(
  type: ExternalAsset['type'],
  label: string,
  token: string,
  accountRef?: string,
): Promise<ExternalAsset> {
  const id = uuidv4();
  const secretKey = `asset:${id}`;
  await setExternalAssetToken(secretKey, token);
  return {
    id, type, label,
    secretKey, accountRef,
    connected: true,
    connectedAt: Date.now(),
  };
}

export { getExternalAssetToken };
