import { forwardRef, type InputHTMLAttributes } from "react";
import s from "./Input.module.scss";
export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...p }, ref) {
  return <input ref={ref} className={`${s.input} ${className}`} {...p} />;
});
