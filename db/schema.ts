import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const ebookOrders = sqliteTable(
  "ebook_orders",
  {
    stripeSessionId: text("stripe_session_id").primaryKey(),
    email: text("email").notNull(),
    paymentLinkId: text("payment_link_id").notNull(),
    amountTotal: integer("amount_total").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("paid"),
    downloadToken: text("download_token").notNull().unique(),
    emailedAt: text("emailed_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("ebook_orders_email_idx").on(table.email)],
);

export const resumeOrders = sqliteTable(
  "resume_orders",
  {
    orderId: text("order_id").primaryKey(),
    stripeSessionId: text("stripe_session_id"),
    email: text("email").notNull(),
    plan: text("plan").notNull(),
    amountTotal: integer("amount_total").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("pending"),
    accessToken: text("access_token"),
    paidAt: text("paid_at"),
    createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("resume_orders_stripe_session_idx").on(table.stripeSessionId),
    uniqueIndex("resume_orders_access_token_idx").on(table.accessToken),
    index("resume_orders_email_idx").on(table.email),
  ],
);
