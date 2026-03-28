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
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`editorial-upload w-full aspect-video max-h-[40vh] cursor-pointer flex flex-col items-center justify-center gap-4 transition-all ${
          dragOver
            ? "border-[#111] bg-[#f0f0ee]"
            : "bg-transparent"
        }`}
      >
        {preview ? (
          <video
            src={preview}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <>
            {/* Minimal upload icon */}
            <svg
              className="w-8 h-8 text-[#bbb]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <p className="editorial-body text-sm text-[#999]">
              Drop a video here or click to browse
            </p>
            <p className="editorial-subhead text-[0.65rem] text-[#bbb]">
              5 &ndash; 30 seconds
            </p>
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
          className="editorial-btn disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Analyzing..." : "Translate the Vibe"}
        </button>
      )}
    </div>
  );
}
