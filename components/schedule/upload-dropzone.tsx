"use client";

import * as React from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UploadDropzoneProps {
  onFileAnalyzed?: (file: File) => void;
  isAnalyzing?: boolean;
}

export function UploadDropzone({
  onFileAnalyzed,
  isAnalyzing = false,
}: UploadDropzoneProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const [lastFileName, setLastFileName] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState("");

  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFileImmediately = (selectedFile: File) => {
    if (!allowedTypes.includes(selectedFile.type)) {
      setErrorMessage("Format non supporté (PDF, PNG ou JPG uniquement).");
      return;
    }

    setErrorMessage("");
    setLastFileName(selectedFile.name);
    if (onFileAnalyzed) {
      onFileAnalyzed(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileImmediately(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileImmediately(e.target.files[0]);
      e.target.value = "";
    }
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={() => !isAnalyzing && fileInputRef.current?.click()}
      className={`relative flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-dashed transition-all duration-150 cursor-pointer select-none active:scale-[0.99] ${
        dragActive
          ? "border-amber-500 bg-amber-500/10 ring-1 ring-inset ring-amber-500/30"
          : errorMessage
          ? "border-red-400 bg-red-50/40 dark:border-red-900"
          : "border-slate-300/90 dark:border-slate-700/90 bg-white dark:bg-slate-900/90 hover:border-amber-500/50"
      }`}
    >
      <input
        id="schedule-file-upload"
        name="schedule-file-upload"
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleChange}
        className="hidden"
        disabled={isAnalyzing}
      />

      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-amber-400">
          {isAnalyzing ? (
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0">
          {isAnalyzing ? (
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              Extraction automatique des créneaux ({lastFileName})...
            </p>
          ) : errorMessage ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Glissez-déposez votre emploi du temps (PDF, PNG, JPG)
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                • Extraction et synchronisation immédiates sans clic supplémentaire
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {lastFileName && !isAnalyzing && !errorMessage && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="h-3 w-3" />
            {lastFileName}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          disabled={isAnalyzing}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="h-8 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700 ring-1 ring-inset ring-amber-400/25 gap-1.5"
        >
          <FileText className="h-3.5 w-3.5 text-amber-400" />
          Importer PDF / Image
        </Button>
      </div>
    </div>
  );
}
