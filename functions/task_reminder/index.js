/**
 * task_reminder — Catalyst Job Function
 *
 * Triggered by a one-time Catalyst Cron that was created when a task with
 * reminder=true was saved. The cron passes two params:
 *   task_id        — ROWID of the task in the Tasks table
 *   reminder_email — Recipient address supplied at task creation
 *
 * The function only sends the email if the task is still active and still has
 * reminder=true at fire time. This guards against the case where the task was
 * completed, deleted, or had its reminder disabled before the cron fired.
 *
 * Required environment variables (set on the function in Catalyst Console):
 *   MAIL_FROM_ADDRESS — Sender address for the outgoing reminder email
 *   MAIL_TO_ADDRESS   — (Optional) Fallback recipient
 */
'use strict';
const catalyst = require('zcatalyst-sdk-node');

const TASKS_TABLE    = 'Tasks';
const SERVICES_TABLE = 'Services';
const MAIL_FROM = process.env.MAIL_FROM_ADDRESS || '';
const MAIL_TO = process.env.MAIL_TO_ADDRESS || '';

module.exports = async (jobData, context) => {
  try {
    const catalystApp = catalyst.initialize(context, { scope: 'admin' });

    // Retrieve task_id passed via dynamic cron params
    const params = jobData.getAllJobParams ? jobData.getAllJobParams() : {};
    const taskId = params && params.task_id;

    if (!taskId) {
      console.error('[task_reminder] No task_id in job params. Aborting.');
      context.closeWithFailure();
      return;
    }

    const zcql = catalystApp.zcql();

    // Fetch the specific task — only send if still active with reminder on
    const taskResult = await zcql.executeZCQLQuery(
      `SELECT ROWID, title, description, service_id, due_date FROM ${TASKS_TABLE} WHERE ROWID = ${taskId} AND status = 'active' AND reminder = true LIMIT 1`
    );

    if (!taskResult.length) {
      console.log(`[task_reminder] Task ${taskId} not found, already completed, or reminder disabled. Skipping.`);
      context.closeWithSuccess();
      return;
    }

    const task = taskResult[0][TASKS_TABLE];

    // Fetch service name for email context
    const svcResult = await zcql.executeZCQLQuery(
      `SELECT service_name FROM ${SERVICES_TABLE} WHERE ROWID = ${task.service_id} LIMIT 1`
    );
    const serviceName = svcResult.length ? svcResult[0][SERVICES_TABLE].service_name : `Service ${task.service_id}`;

    const formattedDue = new Date(task.due_date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    console.log(`[task_reminder] Reminder fired for task "${task.title}" (ID: ${taskId}) due ${formattedDue}`);

    const candidateRecipients = [
      params && params.reminder_email ? String(params.reminder_email).trim() : '',
      MAIL_TO ? String(MAIL_TO).trim() : '',
    ].filter(Boolean);
    const recipients = [...new Set(candidateRecipients.map((r) => r.toLowerCase()))];

    if (!MAIL_FROM || recipients.length === 0) {
      console.warn('[task_reminder] MAIL_FROM_ADDRESS not set or no recipient email. Email skipped.');
      context.closeWithSuccess();
      return;
    }

    if (recipients.includes(String(MAIL_FROM).toLowerCase())) {
      console.warn('[task_reminder] Recipient and sender are the same address. Some inboxes may file this under Sent/All Mail/Spam.');
    }

    const email = catalystApp.email();
    const mailResult = await email.sendMail({
      from_email: MAIL_FROM,
      to_email: recipients,
      subject: `Task Reminder: "${task.title}" is due`,
      html_mode: true,
      content: `
        <div style="font-family: sans-serif; font-size: 15px; color: #111827; max-width: 480px; margin: auto; padding: 32px 24px;">
          <p style="margin: 0 0 20px;">Hi,</p>
          <p style="margin: 0 0 20px;">This is to remind you about the following:</p>
          <table style="border-collapse: collapse; width: 100%; margin: 0 0 28px;">
            <tr>
              <td style="padding: 8px 16px 8px 0; color: #6b7280; white-space: nowrap; vertical-align: top;">Task Name</td>
              <td style="padding: 8px 0; font-weight: 600;">: &nbsp;${task.title}</td>
            </tr>
            <tr>
              <td style="padding: 8px 16px 8px 0; color: #6b7280; white-space: nowrap; vertical-align: top;">Service Name</td>
              <td style="padding: 8px 0; font-weight: 600;">: &nbsp;${serviceName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 16px 8px 0; color: #6b7280; white-space: nowrap; vertical-align: top;">Due Date</td>
              <td style="padding: 8px 0; font-weight: 600;">: &nbsp;${formattedDue}</td>
            </tr>
          </table>
          <a href="https://task-manager.onslate.in" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;">Check Your Task Sheet</a>
        </div>
      `
    });
    console.log('[task_reminder] sendMail response:', JSON.stringify(mailResult));
    console.log(`[task_reminder] Email accepted for delivery to [${recipients.join(', ')}] for task "${task.title}".`);
    context.closeWithSuccess();
  } catch (error) {
    console.error('[task_reminder] Error:', error.message || error);
    context.closeWithFailure();
  }
};
