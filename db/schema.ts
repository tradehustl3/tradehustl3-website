import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const subscribers = sqliteTable("subscribers", {
  email: text("email").primaryKey(),
  interest: text("interest").notNull(),
  source: text("source").notNull().default("website"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const leadDeliveryJobs = sqliteTable(
  "lead_delivery_jobs",
  {
    jobId: text("job_id").primaryKey(),
    email: text("email").notNull(),
    kind: text("kind").notNull(),
    payloadJson: text("payload_json").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: integer("next_attempt_at").notNull(),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("lead_delivery_jobs_due_idx").on(table.status, table.nextAttemptAt)],
);

export const ebookOrders = sqliteTable(
  "ebook_orders",
  {
    stripeSessionId: text("stripe_session_id").primaryKey(),
    email: text("email").notNull(),
    paymentLinkId: text("payment_link_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountTotal: integer("amount_total").notNull(),
    amountRefunded: integer("amount_refunded").notNull().default(0),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("paid"),
    downloadToken: text("download_token").notNull().unique(),
    emailedAt: text("emailed_at"),
    launchEmailedAt: text("launch_emailed_at"),
    launchEmailLeaseUntil: integer("launch_email_lease_until"),
    refundedAt: text("refunded_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("ebook_orders_email_idx").on(table.email),
    uniqueIndex("ebook_orders_payment_intent_idx").on(table.stripePaymentIntentId),
  ],
);

export const ebookRefundEvents = sqliteTable(
  "ebook_refund_events",
  {
    eventId: text("event_id").primaryKey(),
    paymentIntentId: text("payment_intent_id").notNull(),
    amountRefunded: integer("amount_refunded").notNull(),
    currency: text("currency").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("ebook_refund_events_payment_intent_idx").on(table.paymentIntentId)],
);

export const users = sqliteTable(
  "users",
  {
    userId: text("user_id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    lastLoginAt: text("last_login_at"),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull(),
    purpose: text("purpose").notNull().default("login"),
    expiresAt: integer("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("auth_tokens_user_idx").on(table.userId),
    index("auth_tokens_expires_idx").on(table.expiresAt),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    sessionHash: text("session_hash").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const resumes = sqliteTable(
  "resumes",
  {
    resumeId: text("resume_id").primaryKey(),
    userId: text("user_id").notNull(),
    trade: text("trade").notNull(),
    title: text("title").notNull(),
    intakeJson: text("intake_json").notNull(),
    generatedJson: text("generated_json"),
    targetJobPosting: text("target_job_posting"),
    status: text("status").notNull().default("draft"),
    theme: text("theme").notNull().default("plain"),
    generatedAt: text("generated_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    deletedAt: text("deleted_at"),
  },
  (table) => [index("resumes_user_idx").on(table.userId, table.updatedAt)],
);

export const resumeOrders = sqliteTable(
  "resume_orders",
  {
    orderId: text("order_id").primaryKey(),
    userId: text("user_id").notNull(),
    resumeId: text("resume_id").notNull(),
    email: text("email").notNull(),
    plan: text("plan").notNull(),
    amountTotal: integer("amount_total").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paidAt: text("paid_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("resume_orders_session_idx").on(table.stripeSessionId),
    index("resume_orders_user_idx").on(table.userId),
    index("resume_orders_resume_idx").on(table.resumeId),
    index("resume_orders_email_idx").on(table.email),
  ],
);

export const reviewRequests = sqliteTable(
  "review_requests",
  {
    requestId: text("request_id").primaryKey(),
    userId: text("user_id").notNull(),
    resumeId: text("resume_id").notNull(),
    orderId: text("order_id").notNull(),
    email: text("email").notNull(),
    tokenHash: text("token_hash"),
    scheduledAt: integer("scheduled_at").notNull(),
    sentAt: text("sent_at"),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("review_requests_order_idx").on(table.orderId),
    uniqueIndex("review_requests_token_idx").on(table.tokenHash),
    index("review_requests_due_idx").on(table.sentAt, table.consumedAt, table.scheduledAt),
    index("review_requests_user_idx").on(table.userId, table.createdAt),
  ],
);

export const customerReviews = sqliteTable(
  "customer_reviews",
  {
    reviewId: text("review_id").primaryKey(),
    requestId: text("request_id").notNull(),
    userId: text("user_id").notNull(),
    resumeId: text("resume_id").notNull(),
    orderId: text("order_id").notNull(),
    email: text("email").notNull(),
    publicName: text("public_name").notNull(),
    trade: text("trade").notNull(),
    rating: integer("rating").notNull(),
    reviewText: text("review_text").notNull(),
    resultText: text("result_text"),
    recommend: integer("recommend").notNull().default(0),
    consentPublish: integer("consent_publish").notNull().default(0),
    consentResumeExample: integer("consent_resume_example").notNull().default(0),
    status: text("status").notNull().default("pending"),
    approvedAt: text("approved_at"),
    publishedAt: text("published_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("customer_reviews_request_idx").on(table.requestId),
    index("customer_reviews_public_idx").on(table.status, table.consentPublish, table.approvedAt),
    index("customer_reviews_user_idx").on(table.userId, table.createdAt),
  ],
);

export const entitlements = sqliteTable(
  "entitlements",
  {
    entitlementId: text("entitlement_id").primaryKey(),
    userId: text("user_id").notNull(),
    resumeId: text("resume_id").notNull(),
    kind: text("kind").notNull(),
    plan: text("plan").notNull(),
    status: text("status").notNull().default("active"),
    creditsTotal: integer("credits_total").notNull().default(0),
    creditsUsed: integer("credits_used").notNull().default(0),
    accessExpiresAt: integer("access_expires_at"),
    sourceOrderId: text("source_order_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
    updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("entitlements_user_idx").on(table.userId, table.status),
    uniqueIndex("entitlements_source_order_idx").on(table.sourceOrderId),
    uniqueIndex("entitlements_subscription_idx").on(table.stripeSubscriptionId),
  ],
);

export const resumeGenerations = sqliteTable(
  "resume_generations",
  {
    generationId: text("generation_id").primaryKey(),
    resumeId: text("resume_id").notNull(),
    userId: text("user_id").notNull(),
    mode: text("mode").notNull().default("generate"),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    guardFlags: text("guard_flags"),
    outcome: text("outcome").notNull().default("ok"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("resume_generations_user_idx").on(table.userId, table.createdAt),
    index("resume_generations_resume_idx").on(table.resumeId, table.createdAt),
  ],
);

export const resumeFiles = sqliteTable(
  "resume_files",
  {
    fileId: text("file_id").primaryKey(),
    resumeId: text("resume_id").notNull(),
    userId: text("user_id").notNull(),
    format: text("format").notNull(),
    objectKey: text("object_key").notNull(),
    byteSize: integer("byte_size").notNull(),
    sha256: text("sha256").notNull(),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("resume_files_object_key_idx").on(table.objectKey),
    index("resume_files_resume_idx").on(table.resumeId, table.format),
  ],
);

export const stripeEvents = sqliteTable("stripe_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: text("received_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    bucket: text("bucket").primaryKey(),
    windowStart: integer("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => [index("rate_limits_window_idx").on(table.windowStart)],
);
