import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Upload,
  Check,
  Download,
  RotateCcw,
  Layers,
  Globe,
} from 'lucide-react';
import {
  FAVICON_COLLECTION,
  FaviconItem,
  applyFaviconToDocument,
} from '../data/favicons';

interface FaviconModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFaviconId: string;
  onSelectFavicon: (id: string, customSvgOrUri?: string) => void;
}

export const FaviconModal: React.FC<FaviconModalProps> = ({
  isOpen,
  onClose,
  currentFaviconId,
  onSelectFavicon,
}) => {
  const [selectedId, setSelectedId] = useState<string>(currentFaviconId || 'bio-flask');
  const [customDataUri, setCustomDataUri] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const currentItem =
    selectedId === 'custom' && customDataUri
      ? {
          id: 'custom',
          name: customFileName || 'Custom Uploaded Favicon',
          category: 'Uploaded',
          description: 'Custom user-provided graphic for the browser tab icon',
          svg: customDataUri,
        }
      : FAVICON_COLLECTION.find((f) => f.id === selectedId) || FAVICON_COLLECTION[0];

  const handleSelect = (item: FaviconItem) => {
    setSelectedId(item.id);
  };

  const handleApply = () => {
    if (selectedId === 'custom' && customDataUri) {
      applyFaviconToDocument(customDataUri);
      onSelectFavicon('custom', customDataUri);
      localStorage.setItem('endotoxin_custom_favicon', customDataUri);
      localStorage.setItem('endotoxin_active_favicon_id', 'custom');
    } else {
      const item = FAVICON_COLLECTION.find((f) => f.id === selectedId) || FAVICON_COLLECTION[0];
      applyFaviconToDocument(item.svg);
      onSelectFavicon(item.id);
      localStorage.removeItem('endotoxin_custom_favicon');
      localStorage.setItem('endotoxin_active_favicon_id', item.id);
    }
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2200);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomDataUri(result);
      setSelectedId('custom');
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    if (selectedId === 'custom' && customDataUri) {
      const a = document.createElement('a');
      a.href = customDataUri;
      a.download = customFileName || 'favicon.png';
      a.click();
    } else {
      const item = FAVICON_COLLECTION.find((f) => f.id === selectedId) || FAVICON_COLLECTION[0];
      const blob = new Blob([item.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.id}-favicon.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getSvgSrc = (svgOrDataUri: string) => {
    if (svgOrDataUri.startsWith('data:')) return svgOrDataUri;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgOrDataUri)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs no-print animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Favicon &amp; Brand Icon Selector</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a modern biotech icon or upload a custom image for your browser tab.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Live Browser Tab Preview */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-xl p-4 text-white space-y-3 shadow-inner border border-slate-800 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Globe className="w-3.5 h-3.5 text-indigo-400" /> Live Browser Tab Simulation
              </span>
              <span className="text-[11px] font-mono text-indigo-300">
                Active Selection: {currentItem.name}
              </span>
            </div>

            {/* Tab Mockups (Light & Dark) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Light Mode Browser Tab */}
              <div className="bg-slate-200 dark:bg-slate-850 rounded-lg p-2 flex flex-col gap-1.5 border border-slate-300/40 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                  Chrome / Safari (Light Mode Tab)
                </span>
                <div className="bg-white rounded-md px-3 py-1.5 flex items-center gap-2.5 shadow-xs border border-slate-300/80">
                  <img
                    src={getSvgSrc(currentItem.svg)}
                    alt="Favicon"
                    className="w-4 h-4 rounded-xs shrink-0"
                  />
                  <span className="text-xs font-medium text-slate-800 truncate">
                    Endotoxin Kit — Calibration Workspace
                  </span>
                  <X className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                </div>
              </div>

              {/* Dark Mode Browser Tab */}
              <div className="bg-slate-950 rounded-lg p-2 flex flex-col gap-1.5 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Chrome / Firefox (Dark Mode Tab)
                </span>
                <div className="bg-slate-800 rounded-md px-3 py-1.5 flex items-center gap-2.5 shadow-xs border border-slate-700">
                  <img
                    src={getSvgSrc(currentItem.svg)}
                    alt="Favicon"
                    className="w-4 h-4 rounded-xs shrink-0"
                  />
                  <span className="text-xs font-medium text-slate-100 truncate">
                    Endotoxin Kit — Calibration Workspace
                  </span>
                  <X className="w-3 h-3 text-slate-400 ml-auto shrink-0" />
                </div>
              </div>
            </div>
          </div>

          {/* Favicon Gallery Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Curated Modern Generated Favicons (6 Styles)
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">Click any card to preview</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {FAVICON_COLLECTION.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`relative cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col items-center text-center gap-2 ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-xs">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                    <div className="w-14 h-14 p-1 rounded-xl bg-slate-900/5 dark:bg-slate-800 flex items-center justify-center">
                      <img
                        src={getSvgSrc(item.svg)}
                        alt={item.name}
                        className="w-12 h-12 drop-shadow-xs"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {item.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload Custom Favicon Section */}
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Upload Your Custom Favicon</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Upload an SVG, PNG, or ICO image to use your own organization logo.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Browse File...</span>
                <input
                  type="file"
                  accept="image/svg+xml,image/png,image/x-icon,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {customDataUri && (
                <button
                  onClick={() => setSelectedId('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedId === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  Use Custom
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setSelectedId('bio-flask');
              setCustomDataUri(null);
            }}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset Default
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownload}
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Download Icon File</span>
            </button>

            <button
              onClick={handleApply}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{copiedNotification ? 'Favicon Applied!' : 'Apply to Tab & Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
