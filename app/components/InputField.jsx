"use client";

import { useState } from "react";

export default function InputField({
  type = "text",
  placeholder,
  value,
  onChange,
  name,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className="relative w-full">
      <input
        type={inputType}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
        autoComplete={
          isPassword ? "current-password" : "email"
        }
        className="w-full px-4 py-3.5 pr-11 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#0d1b6e] focus:ring-1 focus:ring-[#0d1b6e] transition-all bg-white"
      />

      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={
            showPassword ? "Hide password" : "Show password"
          }
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {showPassword ? "🙈" : "👁"}
        </button>
      )}
    </div>
  );
}