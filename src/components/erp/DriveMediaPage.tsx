import React, { useEffect, useState } from 'react';
import { Check, Copy, HardDrive, ImagePlus, RefreshCw, Upload } from 'lucide-react';
import { compressImage, listDriveImages, uploadPhotoToDrive, type DriveImageItem } from '../../lib/drive';
import { PageHeader, card, btnGold, btnGhost, inputCls, labelCls } from './ui';

export const DriveMediaPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [images, setImages] = useState<DriveImageItem[]>([]);
  const [selected, setSelected] = useState<DriveImageItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    setLoading(true);
    setMessage('');
    try { setImages(await listDriveImages()); }
    catch (e: any) { setMessage(e?.message || 'Drive folder load nahi hua. Apps Script redeploy karein.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setMessage('Pehle image select karein.');
    setUploading(true); setMessage('');
    try {
      const dataUrl = await compressImage(file);
      const id = `media-${Date.now()}`;
      await uploadPhotoToDrive({
        photoId: id, clientId: 'studio-library', clientName: 'Studio Media Library',
        title: title.trim() || file.name, category: 'Studio Library',
        date: new Date().toISOString().slice(0, 10), dataUrl
      });
      setFile(null); setTitle('');
      const input = document.getElementById('drive-media-file') as HTMLInputElement | null;
      if (input) input.value = '';
      setMessage('Image Google Drive folder mein upload ho gayi.');
      await refresh();
    } catch (err: any) { setMessage(err?.message || 'Image upload fail hua.'); }
    finally { setUploading(false); }
  };

  const copySelected = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected.url); setMessage('Image link copy ho gaya.'); }
    catch { setMessage(selected.url); }
  };

  return <div>
    <PageHeader title="Drive Media Library" subtitle="Admin ke liye image upload aur existing Google Drive images picker" onBack={onBack}
      right={<button onClick={() => void refresh()} className={btnGhost}><RefreshCw className="mr-1 inline h-3.5 w-3.5"/>Refresh</button>} />
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <form onSubmit={upload} className={`${card} h-fit p-4`}>
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><ImagePlus className="h-5 w-5 text-amber-400"/> Upload new image</div>
        <label className={labelCls}>Image file</label>
        <input id="drive-media-file" type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)}
          className="mb-3 block w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-400 file:px-3 file:py-2 file:text-xs file:font-bold file:text-black"/>
        <label className={labelCls}>Image title (optional)</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Bridal look" className={`${inputCls} mb-3`}/>
        <button disabled={!file || uploading} className={`${btnGold} w-full`}><Upload className="mr-1 inline h-4 w-4"/>{uploading ? 'Uploading...' : 'Upload to Google Drive'}</button>
        <p className="mt-3 text-[11px] leading-5 text-slate-400">Images configured Drive folder <b>Deepika Salon Client Photos</b> mein save hongi.</p>
        {message && <p className="mt-3 break-words rounded-lg bg-slate-900 p-3 text-xs text-amber-200">{message}</p>}
        {selected && <div className="mt-4 border-t border-slate-700 pt-4">
          <div className="mb-2 text-xs font-bold text-emerald-300"><Check className="mr-1 inline h-4 w-4"/> Selected image</div>
          <img src={selected.thumbnailUrl} alt={selected.name} className="mb-2 max-h-44 w-full rounded-lg object-contain bg-black/30"/>
          <div className="mb-2 break-all text-xs text-slate-300">{selected.name}</div>
          <button type="button" onClick={() => void copySelected()} className={`${btnGhost} w-full`}><Copy className="mr-1 inline h-3.5 w-3.5"/>Copy image link</button>
        </div>}
      </form>
      <section className={`${card} p-4`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="font-bold text-white">Choose from Google Drive</h3><p className="text-xs text-slate-400">{images.length} images available in media folder</p></div>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-300"><HardDrive className="mr-1 inline h-3.5 w-3.5"/> Drive folder</span>
        </div>
        {loading ? <div className="py-12 text-center text-sm text-slate-400">Loading Drive images...</div> :
          images.length === 0 ? <div className="py-12 text-center text-sm text-slate-400">Folder mein abhi image nahi hai. Left side se upload karein.</div> :
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {images.map(img => <button type="button" key={img.fileId} onClick={() => setSelected(img)}
              className={`overflow-hidden rounded-xl border text-left transition ${selected?.fileId === img.fileId ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700 hover:border-slate-500'}`}>
              <img src={img.thumbnailUrl} alt={img.name} loading="lazy" className="aspect-square w-full bg-slate-900 object-cover"/>
              <div className="truncate p-2 text-[11px] text-slate-200">{img.name}</div>
              {selected?.fileId === img.fileId && <div className="px-2 pb-2 text-[10px] font-bold text-emerald-300">Selected</div>}
            </button>)}
          </div>}
      </section>
    </div>
  </div>;
};
