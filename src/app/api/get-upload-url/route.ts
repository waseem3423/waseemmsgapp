import { NextResponse } from 'next/server';

let cachedReleaseUploadUrl: string | null = null;

async function getReleaseUploadUrl(repo: string, token: string): Promise<string> {
  if (cachedReleaseUploadUrl) return cachedReleaseUploadUrl;

  const getReleaseRes = await fetch(`https://api.github.com/repos/${repo}/releases/tags/v1.0`, {
    headers: {
      Authorization: `token ${token}`,
      'User-Agent': 'WaseemMsgApp',
    },
  });

  let release;
  if (getReleaseRes.status === 404) {
    const createReleaseRes = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WaseemMsgApp',
      },
      body: JSON.stringify({
        tag_name: 'v1.0',
        name: 'Media Storage v1.0',
        body: 'Unlimited Media Storage Release Asset Bucket',
        draft: false,
        prerelease: false,
      }),
    });
    release = await createReleaseRes.json();
  } else {
    release = await getReleaseRes.json();
  }

  if (release && release.upload_url) {
    cachedReleaseUploadUrl = release.upload_url;
    return release.upload_url;
  }

  throw new Error('Could not obtain GitHub release upload URL');
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fileName = body.fileName || `file_${Date.now()}`;

    const token = process.env.GITHUB_STORAGE_TOKEN || '';
    const repo = process.env.GITHUB_STORAGE_REPO || 'adamwhite5674-svg/msgapp-media-storage';

    const extIndex = fileName.lastIndexOf('.');
    const baseName = extIndex !== -1 ? fileName.substring(0, extIndex) : fileName;
    const extension = extIndex !== -1 ? fileName.substring(extIndex + 1) : 'bin';
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `${cleanBaseName}_${Date.now()}.${extension}`;

    const rawUploadUrlTemplate = await getReleaseUploadUrl(repo, token);
    const uploadUrl = rawUploadUrlTemplate.replace(/\{.*?\}$/, `?name=${encodeURIComponent(uniqueFileName)}`);

    return NextResponse.json({
      uploadUrl,
      token,
      uniqueFileName,
    });
  } catch (error: any) {
    console.error('get-upload-url API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
