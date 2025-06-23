import Link from 'next/link';
import Image from 'next/image';

const ContactButton = () => {
  return (
    <Link
      href="https://line.me/ti/p/@563amdnh"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-transparent text-white shadow-lg transition-transform duration-300 ease-in-out hover:scale-110"
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
  );
};

export default ContactButton; 