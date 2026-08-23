const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61593457675674";
const INSTAGRAM_URL = "https://www.instagram.com/tradehustl3/";
const YOUTUBE_URL = "https://www.youtube.com/@tradehustl3";
const X_URL = "https://x.com/maintenancmt1k";
const LINKEDIN_URL = "https://www.linkedin.com/in/zachary-ellis-a797193ab";
const TIKTOK_URL = "https://www.tiktok.com/@da.maintenance.ma5";

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
      <a
        href={X_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow TRADE HUSTL3 on X"
        title="X"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.9 2h3.68l-8.04 9.19L24 22h-7.41l-5.8-7.59L4.15 22H.46l8.62-9.85L0 2h7.59l5.24 6.93L18.9 2Zm-1.29 18.1h2.04L6.48 3.8H4.29L17.61 20.1Z" />
        </svg>
        <span className="sr-only">X</span>
      </a>
      <a
        href={LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Connect with Zachary Ellis on LinkedIn"
        title="LinkedIn"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.42v1.57h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.41a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13ZM7.1 20.45H3.54V8.98H7.1v11.47ZM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0Z" />
        </svg>
        <span className="sr-only">LinkedIn</span>
      </a>
      <a
        href={TIKTOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow Da Maintenance Mane on TikTok"
        title="TikTok"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-2-2.75V9.4a6.34 6.34 0 1 0 5.45 6.27V8.73a8.2 8.2 0 0 0 4.77 1.52V6.81c-.34 0-.67-.04-1-.12Z" />
        </svg>
        <span className="sr-only">TikTok</span>
      </a>
    </nav>
  );
}
