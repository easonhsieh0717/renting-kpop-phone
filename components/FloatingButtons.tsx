import Link from 'next/link';
import Image from 'next/image';

const FloatingButtons = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
      {/* Google Maps Button */}
      <Link
        href="#" // TODO: Replace with actual Google Maps URL
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-white shadow-lg transition-transform duration-300 ease-in-out hover:scale-110"
        aria-label="View on Google Maps"
      >
        <Image
          src="/images/googlemap.png"
          alt="Google Maps"
          width={56}
          height={56}
          className="rounded-full"
        />
      </Link>

      {/* LINE Button */}
      <Link
        href="https://line.me/ti/p/@563amdnh"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-transparent text-white shadow-lg transition-transform duration-300 ease-in-out hover:scale-110"
        aria-label="Contact us on LINE"
      >
        <Image
          src="/images/line_At.png"
          alt="LINE Official Account"
          width={64}
          height={64}
          className="rounded-full"
        />
      </Link>
    </div>
  );
};

export default FloatingButtons; 