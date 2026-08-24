import { forwardRef, type TextareaHTMLAttributes } from "react";
import s from "./Textarea.module.scss";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...props }, ref) {
  return (
    <textarea ref={ref} className={`${s.textarea} ${className}`} {...props} />
  );
});
