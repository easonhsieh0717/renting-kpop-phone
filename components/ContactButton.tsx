import Link from 'next/link';

const ContactButton = () => {
  return (
    <Link
      href="https://line.me/ti/p/@563amdnh"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#06C755] text-white shadow-lg transition-transform duration-300 ease-in-out hover:scale-110"
      aria-label="Contact us on LINE"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-9 w-9"
      >
        <path d="M16.142 13.346c.264 0 .523-.022.78-.065.345-.061.432-.423.168-.69L13.13 7.828c-.18-.18-.468-.18-.648 0L9.46 10.45c-.264.264-.177.625.168.686.28.05.56.073.84.073h.588v2.06c0 .878.712 1.59 1.59 1.59s1.59-.712 1.59-1.59v-2.06h1.906z" />
        <path
          fillRule="evenodd"
          d="M4.953 2.404C7.942 1.25 11.41 1.033 14.655 2.11c3.557 1.185 6.225 4.02 7.198 7.643.972 3.622.378 7.556-1.74 10.594-2.118 3.038-5.542 4.87-9.35 4.54-3.81-.33-7.11-2.48-8.86-5.83-1.75-3.35-1.72-7.38.08-10.7 1.34-2.47 3.42-4.47 5.97-5.41zM12 21.8c3.27.3 6.36-1.3 8.22-4.02 1.86-2.73 2.37-6.23 1.48-9.45-.89-3.22-3.26-5.75-6.41-6.72-2.88-.87-6.04-1.05-8.88.07-2.1 1.03-3.85 2.76-4.99 4.94-1.5 2.9-.93 6.34 1.52 8.78 1.98 2.27 4.7 3.59 7.62 3.86l.44.04z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
};

export default ContactButton; 