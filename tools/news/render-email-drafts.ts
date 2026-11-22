import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FIRST_ISSUE } from "../../app/news/content";
import { COMMUNITY_QUESTION, COMMUNITY_REPLY_HREF, FIRST_ISSUE_PATH, NEWS_REPLY_EMAIL } from "../../app/news/constants";

const site = "https://tradehustl3.com";
const output = resolve(process.argv[2] || "emails/hustl3-news");
const escape = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
function tracked(path: string, campaign: string) {
  const url = new URL(path, site);
  url.searchParams.set("utm_source", "hustl3_news");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campaign);
  return url.href;
}
const paragraph = (text: string) => `<p style="margin:0 0 20px;font-size:17px;line-height:1.7;color:#304b60">${escape(text)}</p>`;
const link = (label: string, href: string) => `<p style="margin:18px 0 28px"><a href="${escape(href)}" style="color:#0b5789;font-size:17px;font-weight:bold;text-decoration:underline">${escape(label)}</a></p>`;
function shell(title: string, preheader: string, content: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title></head><body style="margin:0;padding:0;background:#edf3f8;font-family:Arial,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</div><table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="padding:24px 12px"><table role="presentation" style="width:100%;max-width:640px;margin:auto;border-collapse:collapse;background:#fff"><tr><td style="padding:30px 26px;background:#0b243b;border-top:4px solid #d5a249"><p style="margin:0 0 10px;font-size:14px;letter-spacing:2px;color:#ffd184;font-weight:bold">ENTER • EARN • ELEVATE</p><p style="margin:0;color:#fff;font-size:30px;font-weight:bold">THE HUSTL3 NEWS</p></td></tr><tr><td style="padding:30px 26px"><h1 style="margin:0 0 22px;font-size:30px;line-height:1.25;color:#102c43">${escape(title)}</h1>${content}<p style="margin:30px 0 0;font-size:16px;line-height:1.6;color:#102c43">Built by HUSTL3. Backed by Trade.<br>Zachary Ellis · TRADE HUSTL3</p></td></tr><tr><td style="padding:24px 26px;border-top:1px solid #d7e3ec;color:#526575;font-size:13px;line-height:1.7">You subscribed to THE HUSTL3 NEWS and TRADE HUSTL3 updates.<br>TRADE HUSTL3 LLC<br>[ADD THE APPROVED BUSINESS MAILING ADDRESS IN BREVO]<br><a href="{{ unsubscribe }}" style="color:#0b5789">Unsubscribe</a> · <a href="${site}/privacy" style="color:#0b5789">Privacy</a></td></tr></table></td></tr></table></body></html>`;
}

const welcomeSubject = "You're in. Welcome to the HUSTL3.";
const welcomePreheader = "One useful weekly edition. Your next move belongs here.";
const welcomeParagraphs = [
  "You belong here. Thanks for joining THE HUSTL3 NEWS.",
  "Expect a short weekly email built around three moves: ENTER a trade or a new opportunity, EARN with skills you can explain, and ELEVATE toward your next goal.",
  "Whether you're finishing school, changing careers, or building on years in the field, we'll bring practical resources and clearer credential guidance. Start with issue #001, then tell us what you want help with.",
];
const welcomeHtml = shell(welcomeSubject, welcomePreheader,
  welcomeParagraphs.map(paragraph).join("") +
  link("Read issue #001: Your next move starts here", tracked(FIRST_ISSUE_PATH, "welcome")) +
  paragraph(COMMUNITY_QUESTION) +
  paragraph("Hit Reply with your trade, your goal, and what's holding you back. Your response helps shape future editions. We'll ask before publishing your name or story.") +
  link("Explore trade careers", tracked("/resume-examples", "welcome")) +
  link("Understand credentials", tracked("/resources/certifications", "welcome")));
const welcomeText = [welcomeSubject, "", ...welcomeParagraphs.flatMap(p => [p, ""]), `Read issue #001: ${tracked(FIRST_ISSUE_PATH, "welcome")}`, "", COMMUNITY_QUESTION, `Reply to ${NEWS_REPLY_EMAIL}. We'll ask before publishing your name or story.`, "", `Explore trade careers: ${tracked("/resume-examples", "welcome")}`, `Understand credentials: ${tracked("/resources/certifications", "welcome")}`, ""].join("\n");

const issueSubject = "HUSTL3 NEWS #001: Your next move starts here";
const issuePreheader = "Pick a direction. Show your real experience. Take one useful step.";
const issueHtml = shell(FIRST_ISSUE.title, issuePreheader,
  paragraph(`ISSUE ${FIRST_ISSUE.number} · Launch edition`) +
  paragraph(FIRST_ISSUE.introduction) +
  FIRST_ISSUE.sections.map(section => `<h2 style="margin:30px 0 12px;color:#a72b3b;font-size:23px;line-height:1.35">${escape(section.label)}: ${escape(section.title)}</h2>${paragraph(section.action)}${link(section.link.label, tracked(section.link.href, "issue_001"))}`).join("") +
  `<h2 style="margin:30px 0 12px;color:#102c43;font-size:23px">Credential check</h2>${paragraph(FIRST_ISSUE.credential.body)}${link(FIRST_ISSUE.credential.sourceLabel, FIRST_ISSUE.credential.sourceUrl)}` +
  link("Read the full edition", tracked(FIRST_ISSUE_PATH, "issue_001")) +
  paragraph(COMMUNITY_QUESTION) + link("Share your next move", COMMUNITY_REPLY_HREF));
const issueText = [issueSubject, "", FIRST_ISSUE.introduction, "", ...FIRST_ISSUE.sections.flatMap(section => [section.label, section.title, section.action, `${section.link.label}: ${tracked(section.link.href, "issue_001")}`, ""]), "CREDENTIAL CHECK", FIRST_ISSUE.credential.body, `Source: ${FIRST_ISSUE.credential.sourceUrl}`, "", `Read the full edition: ${tracked(FIRST_ISSUE_PATH, "issue_001")}`, "", COMMUNITY_QUESTION, `Reply to ${NEWS_REPLY_EMAIL}. We'll ask before publishing your name or story.`, ""].join("\n");
const textFooter = "\nTRADE HUSTL3 LLC\n[ADD THE APPROVED BUSINESS MAILING ADDRESS IN BREVO]\nUnsubscribe: {{ unsubscribe }}\nPrivacy: https://tradehustl3.com/privacy\n";

await mkdir(output, { recursive: true });
for (const [name, html, text] of [["welcome", welcomeHtml, welcomeText], ["issue-001", issueHtml, issueText]]) {
  await writeFile(resolve(output, `${name}.draft.html`), html);
  await writeFile(resolve(output, `${name}.draft.txt`), text + textFooter);
}
await writeFile(resolve(output, "campaign-settings.draft.json"), JSON.stringify({
  status: "draft_requires_account_review",
  senderName: "THE HUSTL3 NEWS | TRADE HUSTL3",
  senderEmail: "updates@tradehustl3.com",
  replyTo: NEWS_REPLY_EMAIL,
  welcome: { subject: welcomeSubject, preheader: welcomePreheader, trigger: "New confirmed newsletter subscriber; not an unconfirmed form submission" },
  issue001: { subject: issueSubject, preheader: issuePreheader, schedule: null },
  beforeSending: ["Replace the business mailing-address placeholder using the approved Brevo account footer.", "Deploy and verify the news pages before testing email links.", "Verify confirmation, unsubscribe, sender authentication, audience filter, and test delivery.", "Keep the campaign unscheduled until the owner approves the subscriber send."],
}, null, 2) + "\n");
console.log(`Prepared two HTML drafts, two text drafts, and campaign settings in ${output}. Nothing was sent.`);
