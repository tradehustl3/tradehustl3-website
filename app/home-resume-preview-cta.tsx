import { ConversionCta } from './conversion-cta';

/** The existing verified-account entry owns authentication and saved work. */
export function ResumePreviewCta() {
  return (
    <ConversionCta href="/resume-builder/start" data-primary-cta="true"
      data-analytics-event="cta_click" data-location="homepage_resume_builder" data-item="resume_builder">
      Start Your Free Resume Preview
    </ConversionCta>
  );
}
