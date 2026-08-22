import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
