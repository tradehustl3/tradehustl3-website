import Image from 'next/image';
import Link from 'next/link';
import fi from './home-first-impression.module.css';

// Owner-approved copy (October 2026). Keep the wording exactly as written.
export const JOBSITE_TRUTHS = [
  {
    trade: 'HVAC',
    href: '/resume-builder/hvac',
    image: '/optimized/hvac-manifold-worksite.webp',
    alt: 'Digital refrigerant manifold gauge with blue, yellow and red hoses connected to a rooftop unit on a commercial job site',
    fact: 'Fixed orifice? Charge by superheat. TXV? Charge by subcooling.',
    line: 'Get that backwards and the gauges will lie to you all afternoon.',
  },
  {
    trade: 'Electrical',
    href: '/resume-builder/electrician',
    image: '/trade-landings/electrician-worksite.webp',
    alt: 'Open electrical panel with breakers and color-coded wiring, a multimeter and hand tools on a construction site',
    fact: 'The white wire is the grounded conductor. It is not the ground.',
    line: 'Neutral and ground bond once, at the service. Bond them in a subpanel and you have built a problem.',
  },
  {
    trade: 'Plumbing',
    href: '/resume-builder/plumbing',
    image: '/trade-landings/plumbing-worksite.webp',
    alt: 'Mechanical room with copper piping and water heaters, and a press tool, copper fittings, tubing cutter and pipe wrench on a workbench',
    fact: 'Small horizontal drains want a quarter inch of fall per foot.',
    line: 'Too flat and it clogs. The first rule still applies: water runs downhill.',
  },
  {
    trade: 'Welding',
    href: '/resume-builder/welding-fabrication',
    image: '/trade-landings/welding-fabrication-worksite.webp',
    alt: 'Welding helmet, MIG gun and a welded steel plate on a fabrication shop table',
    fact: 'Once the can is open, 7018 lives in the rod oven.',
    line: 'Low-hydrogen rods soak up moisture, and wet rods mean porosity and cracking.',
  },
  {
    trade: 'Facilities',
    href: '/resume-builder/facilities-maintenance',
    image: '/trade-landings/facilities-maintenance-worksite.webp',
    alt: 'Air handling unit and circulation pumps in a building mechanical room, with a multimeter, drill and hand tools on a workbench',
    fact: 'One lock, one key, one person.',
    line: 'If your lock is not on the hasp, you are not locked out. Verify zero energy before you touch it.',
  },
  {
    trade: 'Construction',
    href: '/resume-builder/construction-carpentry',
    image: '/trade-landings/construction-carpentry-worksite.webp',
    alt: 'Wood-framed house under construction with a circular saw, framing nailer, speed square and tape measure on a work table',
    fact: 'Crown up. Every joist, every time.',
    line: 'Set the bow up and the load flattens it. Set it down and the floor sags for good.',
  },
] as const;

export function JobsiteTruths() {
  return (
    <section className={fi.truths} aria-labelledby="jobsite-truths-title">
      <div className={fi.truthsHeading}>
        <p className={fi.eyebrow}>BUILT FOR PEOPLE WHO KNOW THE WORK</p>
        <h2 id="jobsite-truths-title" className={fi.sectionTitle}>Jobsite truths. If you know, you know.</h2>
      </div>

      <ul className={fi.truthGrid}>
        {JOBSITE_TRUTHS.map(({ trade, href, image, alt, fact, line }) => (
          <li key={trade} className={`${fi.truthCard} ${fi.blueprint}`}>
            <div className={fi.truthPhoto}>
              <Image src={image} alt={alt} fill sizes="(max-width: 720px) 92vw, (max-width: 1100px) 46vw, 390px" />
            </div>
            <div className={fi.truthBody}>
              <p className={fi.truthTrade}>{trade}</p>
              <p className={fi.truthFact}>{fact}</p>
              <p className={fi.truthLine}>{line}</p>
              <Link href={href} className={fi.truthGuide}>Explore {trade} resumes →</Link>
            </div>
          </li>
        ))}
      </ul>

      <div className={`${fi.truthsCta} ${fi.blueprint}`}>
        <p>You know the work. Let&apos;s put it on paper the right way.</p>
        <Link
          href="#resume-start"
          className={fi.truthsButton}
          data-analytics-event="cta_click"
          data-location="jobsite_truths"
          data-destination="#resume-start"
        >
          Build my free preview
        </Link>
      </div>
    </section>
  );
}
