import React from 'react';
import { FlaskConical, FileText, Sparkles, BookOpen, Sliders } from 'lucide-react';
import { WavelengthSettings } from '../types';

interface HeaderProps {
  runLabel: string;
  setRunLabel: (label: string) => void;
  wavelengths: WavelengthSettings;
  setWavelengths: React.Dispatch<React.SetStateAction<WavelengthSettings>>;
  onGoToReport: () => void;
  onOpenFaviconModal?: () => void;
  onOpenLabManual?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  runLabel,
  setRunLabel,
  wavelengths,
  setWavelengths,
  onGoToReport,
  onOpenFaviconModal,
  onOpenLabManual,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between shrink-0 no-print shadow-xs">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xs shrink-0">
          <FlaskConical className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 leading-tight flex items-center gap-2">
            <span>Endotoxin Kit Workspace</span>
          </h1>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest hidden sm:block">
            Archachatina marginata dual-assay suite
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Editable Wavelengths inputs (documentation parameter) */}
        <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
          <div className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-slate-400" />
            <span className="text-slate-500 text-[11px] font-medium">&lambda; (nm):</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Coag</span>
            <input
              type="number"
              value={wavelengths.coagulation}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setWavelengths((prev) => ({
                  ...prev,
                  coagulation: Number.isFinite(val) ? val : 540,
                }));
              }}
              className="w-13 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-mono font-bold text-indigo-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              title="Coagulation Wavelength in nm (documentation parameter only — does not alter regression math)"
            />
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold">PO</span>
            <input
              type="number"
              value={wavelengths.phenoloxidase}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setWavelengths((prev) => ({
                  ...prev,
                  phenoloxidase: Number.isFinite(val) ? val : 490,
                }));
              }}
              className="w-13 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-center text-xs font-mono font-bold text-emerald-700 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              title="Phenoloxidase Kinetic Wavelength in nm (documentation parameter only — does not alter regression math)"
            />
          </div>
        </div>

        {/* Lab Manual / Readme button */}
        {onOpenLabManual && (
          <button
            onClick={onOpenLabManual}
            className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Open In-App Lab Manual, SOP, and Statistical Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Lab Manual &amp; SOP</span>
          </button>
        )}

        {onOpenFaviconModal && (
          <button
            onClick={onOpenFaviconModal}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            title="Choose or upload browser tab Favicon"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Favicon</span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 text-xs font-medium hidden sm:inline">Run:</span>
          <input
            type="text"
            value={runLabel}
            onChange={(e) => setRunLabel(e.target.value)}
            className="bg-slate-50 text-slate-800 text-xs px-2.5 py-1.5 rounded-md border border-slate-200 w-24 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium"
            placeholder="Run 1"
          />
        </div>

        <button
          onClick={onGoToReport}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 sm:py-2 rounded-md sm:rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Build Report</span>
        </button>
      </div>
    </header>
  );
};


