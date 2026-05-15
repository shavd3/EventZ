'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function Dropdown({ value, options, onChange, placeholder }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border-[1.5px] border-[#e0d8d0] rounded-lg bg-white text-left transition-colors hover:border-[#b8860b] focus:outline-none focus:border-[#b8860b] focus:shadow-[0_0_0_3px_rgba(184,134,11,0.1)]"
      >
        <span className={value ? 'text-[#3d3530]' : 'text-[#9c8e85]'}>
          {value || placeholder || 'Select...'}
        </span>
        <ChevronDown size={16} className={`text-[#9c8e85] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#e0d8d0] rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                value === opt
                  ? 'bg-[#b8860b]/10 text-[#b8860b] font-medium'
                  : 'text-[#3d3530] hover:bg-[#faf8f5]'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
