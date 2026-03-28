"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onUpload: (file: File) => void;
  isLoading: boolean;
}

export default function VideoUploader({ onUpload, isLoading }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("video/")) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center gap-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`upload-zone w-full aspect-video rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition-all ${
          dragOver
            ? "border-purple-400 bg-purple-500/10"
            : "border-white/20 hover:border-purple-400/60 hover:bg-white/[0.02]"
        }`}
      >
        {preview ? (
          <video
            src={preview}
            className="w-full h-full object-cover rounded-xl"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <>
            <svg
              className="w-10 h-10 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
            <p className="text-white/50 text-sm">
              Drop a video here or click to browse
            </p>
            <p className="text-white/30 text-xs">5-30 seconds, any format</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
      />

      {selectedFile && (
        <button
          onClick={() => onUpload(selectedFile)}
          disabled={isLoading}
          className="px-8 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Analyzing..." : "Translate the Vibe"}
        </button>
      )}
    </div>
  );
}
