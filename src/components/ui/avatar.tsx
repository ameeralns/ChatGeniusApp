import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  size?: number;
}

export function Avatar({ src, alt = '', size = 40, className, ...props }: AvatarProps) {
  if (!src) {
    return (
      <div 
        className={cn(
          "bg-purple-600 flex items-center justify-center text-white font-medium rounded-full",
          className
        )}
        style={{ width: size, height: size }}
        {...props}
      >
        {alt?.[0]?.toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <div 
      className={cn("relative rounded-full overflow-hidden", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
      />
    </div>
  );
} 