import type { InputHTMLAttributes, ReactNode } from "react";
import s from "./Checkbox.module.scss";

export function Checkbox({
  children,
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  children: ReactNode;
}) {
  return (
    <label className={`${s.checkbox} ${className}`}>
      <input type="checkbox" {...props} />
      <i aria-hidden />
      <span>{children}</span>
    </label>
  );
}
