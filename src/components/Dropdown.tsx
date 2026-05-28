'use client';

import Select, { StylesConfig, SingleValue } from 'react-select';

interface DropdownProps {
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

type Option = { value: string; label: string };

const dropdownStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
    borderWidth: '1.5px',
    borderColor: state.isFocused ? '#b8860b' : '#e0d8d0',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(184,134,11,0.1)' : 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    '&:hover': { borderColor: '#b8860b' },
  }),
  valueContainer: (base) => ({ ...base, padding: '2px 10px' }),
  singleValue: (base) => ({ ...base, color: '#3d3530', fontSize: '0.875rem' }),
  placeholder: (base) => ({ ...base, color: '#9c8e85', fontSize: '0.875rem' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    padding: '0 8px',
    color: '#9c8e85',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s',
  }),
  menu: (base) => ({
    ...base,
    fontSize: '0.875rem',
    borderRadius: '0.5rem',
    border: '1px solid #e0d8d0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    overflow: 'hidden',
    zIndex: 9999,
  }),
  menuList: (base) => ({ ...base, padding: 4 }),
  option: (base, state) => ({
    ...base,
    fontSize: '0.875rem',
    borderRadius: '0.375rem',
    padding: '8px 12px',
    backgroundColor: state.isSelected
      ? '#b8860b'
      : state.isFocused
      ? 'rgba(184,134,11,0.08)'
      : 'white',
    color: state.isSelected ? 'white' : '#3d3530',
    cursor: 'pointer',
    '&:active': { backgroundColor: '#b8860b', color: 'white' },
  }),
};

export default function Dropdown({ value, options, onChange, placeholder }: DropdownProps) {
  const opts: Option[] = (options as string[]).map((o) => ({ value: o, label: o || '—' }));
  const current = opts.find((o) => o.value === value) ?? null;

  return (
    <Select
      options={opts}
      value={current}
      onChange={(opt: SingleValue<Option>) => onChange(opt?.value ?? '')}
      styles={dropdownStyles}
      isSearchable={false}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      placeholder={placeholder ?? 'Select...'}
    />
  );
}
