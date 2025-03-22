import Link from 'next/link';
import Image from 'next/image';

export default function Hero() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-gate.jpg"
          alt="Gated community entrance"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
          Secure Gate Access Management
        </h1>
        <p className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto animate-fade-in-delay">
          Streamline your gated community's security with our modern visitor management system
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-2">
          <Link
            href="/routes/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg 
              font-semibold transition-colors duration-200 text-lg"
          >
            Login
          </Link>
          <Link
            href="/routes/register"
            className="bg-white hover:bg-gray-100 text-blue-600 px-8 py-3 rounded-lg 
              font-semibold transition-colors duration-200 text-lg"
          >
            Register
          </Link>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </div>
  );
} 