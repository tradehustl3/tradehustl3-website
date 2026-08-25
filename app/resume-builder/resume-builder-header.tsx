/* eslint-disable @next/next/no-html-link-for-pages -- Resume Builder exits must work without the client router */
import Image from "next/image";

export function ResumeBuilderHeader() {
  return (
    <header className="rb-header">
      <a className="rb-brand" href="/" aria-label="TRADE HUSTL3 home">
        <Image src="/trade-hustl3-resume-builder-logo.png" alt="TRADE HUSTL3 Resume Builder logo" width={64} height={64} priority />
        <span>TRADE HUSTL<span>3</span></span>
      </a>
      <div className="rb-header-product">
        <span>Career tools</span>
        <strong>Resume Builder</strong>
      </div>
      <a className="rb-exit" href="/">Exit builder</a>
    </header>
  );
}
