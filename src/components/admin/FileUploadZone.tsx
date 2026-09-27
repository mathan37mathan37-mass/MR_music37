import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle2, AlertTriangle, FileAudio, Image as ImageIcon, X, RefreshCw } from 'lucide-react';
import { validateAudioFile, validateImageFile, uploadMediaWithProgress } from '@/services/storageService';
import { cn } from '@/utils/cn';

interface FileUploadZoneProps {
  type: 'audio' | 'image';
  storagePath: string;
  currentUrl?: string;
  onUploadSuccess: (url: string) => void;
  onFileSelect?: (file: File | File[]) => void;
  label?: string;
  helperText?: string;
  className?: string;
  multiple?: boolean;
}

export function FileUploadZone({
  type,
  storagePath,
  currentUrl,
  onUploadSuccess,
  onFileSelect,
  label,
  helperText,
  className,
  multiple = false,
}: FileUploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const acceptedExtensions = type === 'audio' ? '.mp3,.wav,.ogg,.aac,.flac,.m4a' : '.jpg,.jpeg,.png,.webp,.gif';

  const handleFile = async (selectedFile: File) => {
    setErrorMessage(null);
    setFile(selectedFile);
    onFileSelect?.(selectedFile);

    const validation = type === 'audio' ? validateAudioFile(selectedFile) : validateImageFile(selectedFile);
    if (!validation.valid) {
      setStatus('error');
      setErrorMessage(validation.error || 'Invalid file');
      return;
    }

    if (type === 'image') {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
    }

    setStatus('uploading');
    setProgress(5);

    try {
      await uploadMediaWithProgress(storagePath, selectedFile, {
        onProgress: (p) => setProgress(p),
        onError: (err) => {
          setStatus('error');
          setErrorMessage(err.message || 'Upload failed. Please try again.');
        },
        onSuccess: (url) => {
          setStatus('success');
          setProgress(100);
          setPreviewUrl(url);
          onUploadSuccess(url);
        },
      });
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Upload could not be completed.');
    }
  };

  const handleFiles = async (selectedFiles: File[]) => {
    if (!selectedFiles.length) return;
    if (!multiple) {
      await handleFile(selectedFiles[0]);
      return;
    }
    onFileSelect?.(selectedFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      if (multiple) {
        handleFiles(files);
      } else {
        handleFile(files[0]);
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white/80">{label}</label>
          {helperText && <span className="text-[11px] text-white/40">{helperText}</span>}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-4 transition-all cursor-pointer flex flex-col items-center justify-center text-center overflow-hidden',
          dragOver ? 'border-violet-500 bg-violet-600/10 scale-[1.01]' : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]',
          status === 'error' && 'border-rose-500/50 bg-rose-500/5',
          status === 'success' && 'border-emerald-500/40 bg-emerald-500/5'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedExtensions}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              const files = Array.from(e.target.files);
              if (multiple) {
                handleFiles(files);
              } else {
                handleFile(files[0]);
              }
            }
          }}
        />

        {type === 'image' && previewUrl && status !== 'uploading' && (
          <div className="relative w-full aspect-video max-h-36 rounded-xl overflow-hidden mb-3 border border-white/10 shadow-lg">
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md">Change Image</span>
            </div>
            <button type="button" onClick={handleClear} className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white/70 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {status === 'idle' && (
          <div className="space-y-2 py-2">
            <div className="w-11 h-11 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-violet-400 shadow">
              {type === 'audio' ? <FileAudio size={22} /> : <ImageIcon size={22} />}
            </div>
            <div>
              <p className="text-xs font-semibold text-white">
                Drop your {type === 'audio' ? 'audio track' : 'artwork'} here, or <span className="text-violet-400 underline">browse</span>
              </p>
              <p className="text-[11px] text-white/40 mt-0.5">
                {type === 'audio' ? 'MP3, WAV, OGG, FLAC (Max 35MB)' : 'JPG, PNG, WEBP (Max 6MB)'}
              </p>
            </div>
          </div>
        )}

        {status === 'uploading' && (
          <div className="w-full space-y-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-2 text-violet-300"><RefreshCw size={13} className="animate-spin" />Processing & uploading asset...</span>
              <span className="text-violet-400 font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut', duration: 0.2 }} />
            </div>
            <p className="text-[11px] text-white/40 truncate">{file?.name}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-1 py-1">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold"><CheckCircle2 size={16} /><span>Asset Uploaded Successfully</span></div>
            <p className="text-[11px] text-white/50 truncate max-w-xs">{file?.name || 'File ready'}</p>
            <button type="button" onClick={handleClear} className="text-[11px] text-white/40 hover:text-white underline mt-1">Replace Asset</button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2 py-2">
            <div className="flex items-center justify-center gap-2 text-rose-400 text-xs font-semibold"><AlertTriangle size={15} /><span>Upload Failed</span></div>
            <p className="text-[11px] text-rose-300 max-w-xs">{errorMessage || 'Please try again.'}</p>
            <button type="button" onClick={() => { setStatus('idle'); setErrorMessage(null); setProgress(0); }} className="text-[11px] text-white/50 hover:text-white underline">Try another file</button>
          </div>
        )}
      </div>
    </div>
  );
}
