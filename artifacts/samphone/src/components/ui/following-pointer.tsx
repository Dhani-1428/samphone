import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

export const FollowerPointerCard = ({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isInside, setIsInside] = useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    x.set(e.clientX);
    y.set(e.clientY);
  };

  return (
    <div
      onMouseLeave={() => setIsInside(false)}
      onMouseEnter={() => setIsInside(true)}
      onMouseMove={handleMouseMove}
      className={cn("relative cursor-none [&_*]:cursor-none", className)}
    >
      <AnimatePresence>
        {isInside && <FollowPointer x={x} y={y} title={title} />}
      </AnimatePresence>
      {children}
    </div>
  );
};

export const FollowPointer = ({
  x,
  y,
  title,
}: {
  x: ReturnType<typeof useMotionValue<number>>;
  y: ReturnType<typeof useMotionValue<number>>;
  title?: string | React.ReactNode;
}) => {
  return (
    <motion.div
      className="fixed z-[9999] h-4 w-4 rounded-full pointer-events-none"
      style={{ top: y, left: x, pointerEvents: "none" }}
      initial={{ scale: 1, opacity: 1 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      <svg
        stroke="currentColor"
        fill="currentColor"
        strokeWidth="1"
        viewBox="0 0 16 16"
        className="h-5 w-5 -translate-x-[10px] -translate-y-[8px] -rotate-[70deg] transform"
        style={{ color: "hsl(221 83% 53%)", stroke: "hsl(221 83% 53%)" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z" />
      </svg>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="min-w-max rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap text-white shadow-lg"
        style={{ backgroundColor: "hsl(221 83% 53%)" }}
      >
        {title}
      </motion.div>
    </motion.div>
  );
};
