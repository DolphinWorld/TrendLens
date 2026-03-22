"use client";

import { useState, useRef, useEffect } from "react";

interface SearchBarProps {
  onSearch: (keyword: string) => void;
  loading?: boolean;
  externalValue?: string;
}

export function SearchBar({ onSearch, loading, externalValue }: SearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (externalValue !== undefined) setValue(externalValue);
  }, [externalValue]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSearch(trimmed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search any trend... (e.g., AI agents, cold plunge, micro SaaS)"
          className="w-full pl-11 pr-24 py-3.5 bg-surface border border-border rounded-2xl text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-accent text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            "Search"
          )}
        </button>
      </div>
    </form>
  );
}
