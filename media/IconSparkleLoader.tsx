import React from "react";
import Image from "next/image";
import cn from "@/app/utils/TailwindMergeAndClsx";
import sparkle from "@/media/sparkle.svg";

interface Props {
  className?: string;
  isBlack?: boolean;
}

const IconSparkleLoader = ({ className, isBlack = false }: Props) => {
  return (
    <Image
      src={sparkle}
      alt="loader"
      width={24}
      height={24}
      className={cn(
        isBlack ? "filter invert" : "",
        className
      )}
      style={{ width: 'auto', height: 'auto' }}
      unoptimized
    />
  );
};

export default IconSparkleLoader;
