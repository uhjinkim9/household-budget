import type { ButtonHTMLAttributes } from "react";
import s from "./Button.module.scss";
type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  block?: boolean;
};
export function Button({
  variant = "primary",
  block,
  className = "",
  ...p
}: Props) {
  return (
    <button
      className={`${s.button} ${s[variant]} ${block ? s.block : ""} ${className}`}
      {...p}
    />
  );
}
