const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61593457675674";
const INSTAGRAM_URL = "https://www.instagram.com/tradehustl3/";
const YOUTUBE_URL = "https://www.youtube.com/@tradehustl3";

export function SocialLinks() {
  return (
    <nav className="social-links" aria-label="TRADE HUSTL3 social media">
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow TRADE HUSTL3 on Facebook"
        title="Facebook"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
        </svg>
        <span className="sr-only">Facebook</span>
      </a>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow TRADE HUSTL3 on Instagram"
        title="Instagram"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6Zm9.65 1.5a1.35 1.35 0 1 1 0 2.7 1.35 1.35 0 0 1 0-2.7ZM12 6.87A5.13 5.13 0 1 1 12 17.13 5.13 5.13 0 0 1 12 6.87Zm0 2A3.13 3.13 0 1 0 12 15.13 3.13 3.13 0 0 0 12 8.87Z" />
        </svg>
        <span className="sr-only">Instagram</span>
      </a>
      <a
        href={YOUTUBE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Subscribe to TRADE HUSTL3 on YouTube"
        title="YouTube"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.58 12 3.58 12 3.58s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.12A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.55 15.56V8.44L15.82 12l-6.27 3.56Z" />
        </svg>
        <span className="sr-only">YouTube</span>
      </a>
    </nav>
  );
}
