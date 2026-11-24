import { Directory, File, Paths } from 'expo-file-system';

/** Copy a camera photo from the (purgeable) cache into app-private document storage. */
export function persistPhoto(cacheUri: string): string {
  try {
    const dir = new Directory(Paths.document, 'photos');
    if (!dir.exists) dir.create({ intermediates: true });
    const target = new File(dir, `walk-${Date.now()}.jpg`);
    new File(cacheUri).copy(target);
    return target.uri;
  } catch {
    // A failed copy must never lose the walk: fall back to the original photo location.
    return cacheUri;
  }
}

export function removePhoto(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* best effort: a missing file must never block deleting a record */
  }
}
