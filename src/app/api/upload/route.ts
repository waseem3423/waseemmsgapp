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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const token = process.env.GITHUB_STORAGE_TOKEN || '';
    const repo = process.env.GITHUB_STORAGE_REPO || 'adamwhite5674-svg/msgapp-media-storage';

    // Prepare clean unique filename
    const extIndex = file.name.lastIndexOf('.');
    const baseName = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
    const extension = extIndex !== -1 ? file.name.substring(extIndex + 1) : 'bin';
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFileName = `${cleanBaseName}_${Date.now()}.${extension}`;

    const rawUploadUrlTemplate = await getReleaseUploadUrl(repo, token);
    const assetUploadUrl = rawUploadUrlTemplate.replace(/\{.*?\}$/, `?name=${encodeURIComponent(uniqueFileName)}`);

    const bytes = await file.arrayBuffer();

    const uploadRes = await fetch(assetUploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': bytes.byteLength.toString(),
        'User-Agent': 'WaseemMsgApp',
      },
      body: bytes,
    });

    const assetData = await uploadRes.json();

    if (!uploadRes.ok || !assetData.browser_download_url) {
      console.error('GitHub Release Asset upload error:', assetData);
      return NextResponse.json(
        { error: assetData.message || 'GitHub release asset upload failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: assetData.browser_download_url,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('Upload API handler error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
