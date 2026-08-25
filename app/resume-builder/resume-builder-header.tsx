import Image from "next/image";
import Link from "next/link";

export function ResumeBuilderHeader() {
  return (
    <header className="rb-header">
      <Link className="rb-brand" href="/" aria-label="TRADE HUSTL3 home">
        <Image src="/trade-hustl3-resume-builder-logo.png" alt="TRADE HUSTL3 Resume Builder logo" width={64} height={64} priority />
        <span>TRADE HUSTL<span>3</span></span>
      </Link>
      <div className="rb-header-product">
        <span>Career tools</span>
        <strong>Resume Builder</strong>
      </div>
      <Link className="rb-exit" href="/">Exit builder</Link>
    </header>
  );
}
