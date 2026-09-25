import {
  handleResumeBuilderRoute as handleCoreResumeBuilderRoute,
  runResumeBuilderRetention,
  runReviewRequestEmails,
  runReviewRequestEmails,
  type ResumeBuilderEnv,
} from "./resume-builder";
import { operationalEvent } from "./operations-monitoring";

export type { ResumeBuilderEnv };
export { runResumeBuilderRetention, runReviewRequestEmails };

function monitoredFailure(pathname: string, status: number): ReturnType<typeof operationalEvent> | null {
  if (pathname === "/api/resume-builder/auth/request" && status >= 500) {
    return operationalEvent("auth_email", "magic_link_request_failed", "error", { status });
  }

  if (pathname === "/api/resume-builder/stripe/webhook") {
    if (status >= 500) return operationalEvent("stripe", "resume_stripe_webhook_failed", "error", { status });
    if (status >= 400) return operationalEvent("stripe", "resume_stripe_webhook_rejected", "warning", { status });
  }

  if (/^\/api\/resume-builder\/resumes\/[^/]+\/generate$/.test(pathname) && status >= 500) {
    return operationalEvent("ai_generation", "resume_generation_request_failed", "error", { status });
  }

  if (/^\/api\/resume-builder\/resumes\/[^/]+\/(files\/(pdf|docx|preview)|bullets)$/.test(pathname) && status >= 500) {
    return operationalEvent("document_storage", "resume_document_request_failed", "error", { status });
  }

  return null;
}

export async function handleResumeBuilderRoute(
  request: Request,
  env: ResumeBuilderEnv,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  try {
    const response = await handleCoreResumeBuilderRoute(request, env);
    if (!response) return null;

    const event = monitoredFailure(pathname, response.status);
    if (event) {
      if (event.severity === "warning") console.warn(event);
      else console.error(event);
    }
    return response;
  } catch (error) {
    const message = "Unhandled Resume Builder error";
    console.error(operationalEvent("document_storage", "resume_builder_unhandled_failure", "error", {
      path: pathname.slice(0, 180),
      message,
    }));
    throw error;
  }
}
