"use client";
import { motion } from "framer-motion";
import Link from "next/link";

// motion-enhanced Next.js Link for navigation CTAs
const MotionLink = motion(Link);

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 20,
};

/** Use `href` for navigation links, `onClick` for actions. */
export default function AnimatedButton({
  children,
  onClick,
  href,
  style,
  type,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  style?: React.CSSProperties;
  type?: "button" | "submit" | "reset";
}) {
  if (href) {
    return (
      <MotionLink
        href={href}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={springTransition}
        style={style}
      >
        {children}
      </MotionLink>
    );
  }

  return (
    <motion.button
      type={type ?? "button"}
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={springTransition}
      style={style}
    >
      {children}
    </motion.button>
  );
}
