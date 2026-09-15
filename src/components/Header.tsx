import React from 'react';
import { FlaskConical, FileText, BookOpen, Sliders, Sun, Moon } from 'lucide-react';
import { WavelengthSettings } from '../types';
import { ThemePreference } from '../utils/theme';

interface HeaderProps {
  runLabel: string;
  setRunLabel: (label: string) => void;
  wavelengths: WavelengthSettings;
  setWavelengths: React.Dispatch<React.SetStateAction<WavelengthSettings>>;
  onGoToReport: () => void;
  onOpenFaviconModal?: () => void;
  onOpenLabManual?: () => void;
  themePreference?: ThemePreference;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  runLabel,
  setRunLabel,
  wavelengths,
  setWavelengths,
  onGoToReport,
  onOpenLabManual,
  themePreference = 'system',
  isDark = false,
  onToggleTheme,
}) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0 no-print shadow-xs transition-colors">
      {/* Brand & Workspace Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        <div className="w-7 h-7 sm:w-9 sm:h-9 bg-indigo-600 dark:bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-xs shrink-0">
          <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xs sm:text-base md:text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 leading-tight truncate">
            Endotoxin Kit Workspace
          </h1>
          <p className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:block truncate">
            Archachatina marginata dual-assay suite
          </p>
        </div>
      </div>

      {/* Header Actions & Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Editable Wavelengths inputs (explicit documentation metadata only) */}
        <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1 rounded-lg">
          <div className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
              Doc Metadata &lambda; (nm):
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Coag</span>
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
              className="w-13 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              title="Coagulation Wavelength in nm (documentation metadata only — does not alter regression calculations)"
            />
          </div>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">PO</span>
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
              className="w-13 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              title="Phenoloxidase Kinetic Wavelength in nm (documentation metadata only — does not alter regression calculations)"
            />
          </div>
        </div>

        {/* Lab Manual / Readme button - Compact on mobile, icon-only with clear title */}
        {onOpenLabManual && (
          <button
            onClick={onOpenLabManual}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title="Open In-App Lab Manual, SOP, and Statistical Guide"
            aria-label="Open Lab Manual and SOP Protocol Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden sm:inline">Lab Manual</span>
          </button>
        )}

        {/* Dark / Light Mode Toggle Button - Icon only on mobile to save critical space */}
        {onToggleTheme && (
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title={
              isDark
                ? `Active: Dark mode. Click to switch to Light mode (${themePreference === 'system' ? 'System theme' : 'Manual'})`
                : `Active: Light mode. Click to switch to Dark mode (${themePreference === 'system' ? 'System theme' : 'Manual'})`
            }
            aria-label="Toggle dark and light mode"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-200 hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600/20 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-700 hidden md:inline">Dark</span>
              </>
            )}
          </button>
        )}

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

        {/* Run Label input - Streamlined and compact */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium hidden sm:inline">Run:</span>
          <input
            type="text"
            value={runLabel}
            onChange={(e) => setRunLabel(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] sm:text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md border border-slate-200 dark:border-slate-700 w-14 sm:w-20 md:w-24 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium text-center sm:text-left"
            placeholder="Run 1"
            title="Batch Run Identifier"
          />
        </div>

        {/* Build Report CTA Button */}
        <button
          onClick={onGoToReport}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition-colors shadow-xs flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
          title="Switch to Validation Report tab"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">Report</span>
        </button>
      </div>
    </header>
  );
};


