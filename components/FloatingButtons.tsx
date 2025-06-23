import Link from 'next/link';
import Image from 'next/image';

const FloatingButtons = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
      {/* Google Maps Button */}
      <Link
        href="https://maps.app.goo.gl/cTCykHeBTw7YgWDJ9"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out hover:scale-110 border-2 border-white/30 hover:border-white/60"
        aria-label="View on Google Maps"
      >
        <Image
          src="/images/googlemap.png"
          alt="Google Maps"
          width={64}
          height={64}
          className="rounded-full p-1"
        />
      </Link>

      {/* LINE Button */}
      <Link
        href="https://line.me/ti/p/@563amdnh"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-transparent shadow-lg transition-all duration-300 ease-in-out hover:scale-110 border-2 border-white/30 hover:border-white/60"
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