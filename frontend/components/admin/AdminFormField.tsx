import React from "react";

interface AdminFormFieldProps {
  label: string;
  type?: string;
  name?: string;
  value?: string | number;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  error?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function AdminFormField({
  label,
  type = "text",
  name,
  value,
  placeholder,
  onChange,
  error,
  required = false,
  children,
  className = "",
  disabled = false,
}: AdminFormFieldProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-slate-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
          disabled={disabled}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition ${
            error
              ? "border-red-300 focus:ring-red-200 focus:border-red-400"
              : "border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
          } ${disabled ? "bg-slate-100 cursor-not-allowed" : "bg-white"}`}
          rows={4}
        />
      ) : type === "select" ? (
        <select
          name={name}
          value={value}
          onChange={onChange as (e: React.ChangeEvent<HTMLSelectElement>) => void}
          disabled={disabled}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition ${
            error
              ? "border-red-300 focus:ring-red-200 focus:border-red-400"
              : "border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
          } ${disabled ? "bg-slate-100 cursor-not-allowed" : "bg-white"}`}
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange as (e: React.ChangeEvent<HTMLInputElement>) => void}
          disabled={disabled}
          className={`w-full px-3 py-2 rounded-lg border text-sm transition ${
            error
              ? "border-red-300 focus:ring-red-200 focus:border-red-400"
              : "border-slate-300 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
          } ${disabled ? "bg-slate-100 cursor-not-allowed" : "bg-white"}`}
        />
      )}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
