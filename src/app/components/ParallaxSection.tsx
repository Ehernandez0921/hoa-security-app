import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface ParallaxSectionProps {
  imageUrl: string;
  title: string;
  description: string;
  altText: string;
  reverse?: boolean;
}

export default function ParallaxSection({ imageUrl, title, description, altText, reverse = false }: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const handleScroll = () => {
      const rect = section.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      if (rect.top < windowHeight && rect.bottom > 0) {
        const scrollPercentage = (windowHeight - rect.top) / (windowHeight + rect.height);
        section.style.opacity = Math.min(scrollPercentage, 1).toString();
        section.style.transform = `translateY(${(1 - scrollPercentage) * 50}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={sectionRef}
      className={`min-h-screen flex items-center justify-center transition-opacity duration-500 opacity-0
        ${reverse ? 'bg-gray-100' : 'bg-white'}`}
    >
      <div className={`container mx-auto px-4 py-16 flex flex-col md:flex-row items-center gap-8 
        ${reverse ? 'md:flex-row-reverse' : ''}`}>
        <div className="w-full md:w-1/2 relative h-[300px] md:h-[500px]">
          <Image
            src={imageUrl}
            alt={altText}
            fill
            className="object-cover rounded-lg shadow-xl"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <div className="w-full md:w-1/2 space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{title}</h2>
          <p className="text-lg text-gray-600 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
} 