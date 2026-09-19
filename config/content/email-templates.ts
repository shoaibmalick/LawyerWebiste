import { emailTemplatesSchema } from "../schema/email-templates.schema";

/**
 * Sample canned messages for the dashboard's compose panel. Per-client copy —
 * rewrite the wording for each business, but keep the placeholders to the ones
 * `config/schema/email-templates.schema.ts` declares.
 *
 * Every one of these is a starting point, not a form letter: the compose box is
 * editable and whatever is typed over the top is what actually goes out. Write
 * them to be sendable unedited on a busy morning, and short enough that
 * changing a line is quicker than deleting a paragraph.
 *
 * `appliesTo` decides which list offers a template. A lead is a contact-form
 * enquiry with no appointment attached, so the schema rejects any lead template
 * that reaches for `{{service_name}}` or `{{appointment_time}}`.
 */
export const emailTemplates = emailTemplatesSchema.parse([
  {
    key: "tried-to-reach-you",
    label: "We tried to reach you",
    appliesTo: ["booking"],
    subject: "We tried to reach you — {{business_name}}",
    body: `Hi {{customer_name}},

We rang about your {{service_name}} appointment on {{appointment_time}} and couldn't get through.

Please give us a call on {{business_phone}} when you have a moment so we can confirm the time with you.

{{business_name}}`,
  },
  {
    key: "appointment-reminder",
    label: "Appointment reminder",
    appliesTo: ["booking"],
    subject: "A reminder about your appointment — {{business_name}}",
    body: `Hi {{customer_name}},

Just a reminder that we'll see you for {{service_name}} on {{appointment_time}}.

If anything has changed and you need to move it, call us on {{business_phone}} and we'll find you another time.

{{business_name}}`,
  },
  {
    key: "running-late",
    label: "We're running behind today",
    appliesTo: ["booking"],
    subject: "We're running a little behind — {{business_name}}",
    body: `Hi {{customer_name}},

We're running behind today and wanted to let you know before you set off. Your {{appointment_time}} appointment may start a little later than planned.

If you'd rather rebook, call us on {{business_phone}} — no trouble at all.

{{business_name}}`,
  },
  {
    key: "after-your-visit",
    label: "Following up after a visit",
    appliesTo: ["booking"],
    subject: "How are you getting on? — {{business_name}}",
    body: `Hi {{customer_name}},

Thanks for coming in for {{service_name}}. We hope everything went well.

If you have any questions about what we discussed, call us on {{business_phone}} — we'd much rather hear from you early.

{{business_name}}`,
  },
  {
    key: "answering-your-enquiry",
    label: "Answering an enquiry",
    appliesTo: ["lead"],
    subject: "Thanks for getting in touch — {{business_name}}",
    body: `Hi {{customer_name}},

Thanks for your message. Here's the answer to what you asked:



If you'd like to book in, call us on {{business_phone}} or reply to this email and we'll sort out a time.

{{business_name}}`,
  },
  {
    key: "accepting-new-customers",
    label: "Yes, we're taking new customers",
    appliesTo: ["lead"],
    subject: "We'd be glad to see you — {{business_name}}",
    body: `Hi {{customer_name}},

Thanks for your message — yes, we're taking new customers at the moment.

The easiest way to get started is to book on our website, or call us on {{business_phone}} and we'll find a time that suits you.

{{business_name}}`,
  },
]);
