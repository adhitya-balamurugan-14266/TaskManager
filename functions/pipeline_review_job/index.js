/**
 * pipeline_review_job — Catalyst Job Function (Cron)
 *
 * Runs once daily. Scans all pipeline tasks whose `pipeline_entered_at`
 * timestamp is 14 or more days in the past and for which `pipeline_alerted`
 * is still false. For each such task it:
 *   1. Sends an alert email to MAIL_TO_ADDRESS.
 *   2. Sets pipeline_alerted = true so the alert is not sent again until the
 *      user reviews the task (which resets pipeline_entered_at and clears the flag).
 *
 * Required environment variables (set on the function in Catalyst Console):
 *   MAIL_FROM_ADDRESS — Sender address for the outgoing alert email
 *   MAIL_TO_ADDRESS   — Recipient address for pipeline review alerts
 */
'use strict';
const catalyst = require('zcatalyst-sdk-node');

const TASKS_TABLE    = 'Tasks';
const SERVICES_TABLE = 'Services';
const MAIL_FROM = process.env.MAIL_FROM_ADDRESS || '';
const MAIL_TO   = process.env.MAIL_TO_ADDRESS || '';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

module.exports = async (jobData, context) => {
  try {
    const catalystApp = catalyst.initialize(context, { scope: 'admin' });
    const zcql = catalystApp.zcql();
    const dsTasks = catalystApp.datastore().table(TASKS_TABLE);

    if (!MAIL_FROM || !MAIL_TO) {
      console.warn('[pipeline_review_job] MAIL_FROM_ADDRESS or MAIL_TO_ADDRESS not set. Email skipped.');
      context.closeWithSuccess();
      return;
    }

    // Fetch all pipeline tasks that have not yet been alerted
    const taskRows = await zcql.executeZCQLQuery(
      `SELECT * FROM ${TASKS_TABLE} WHERE status = 'pipeline' AND pipeline_alerted = false`
    );

    if (!taskRows.length) {
      console.log('[pipeline_review_job] No un-alerted pipeline tasks found.');
      context.closeWithSuccess();
      return;
    }

    const now = Date.now();
    const overdueTaskIds = [];
    const overdueTaskDetails = [];

    for (const row of taskRows) {
      const task = row[TASKS_TABLE];
      // Fall back to date_added for tasks that pre-date the pipeline_entered_at column
      const enteredAt = task.pipeline_entered_at || task.date_added;
      if (!enteredAt) continue;
      const enteredMs = new Date(enteredAt).getTime();
      if (Number.isNaN(enteredMs)) continue;
      if (now - enteredMs >= TWO_WEEKS_MS) {
        overdueTaskIds.push(task.ROWID);
        overdueTaskDetails.push(task);
      }
    }

    if (!overdueTaskIds.length) {
      console.log('[pipeline_review_job] No tasks have exceeded the 2-week pipeline threshold.');
      context.closeWithSuccess();
      return;
    }

    console.log(`[pipeline_review_job] ${overdueTaskIds.length} task(s) exceeded 2-week pipeline threshold. Sending alerts.`);

    // Fetch service names for the overdue tasks
    const serviceIds = [...new Set(overdueTaskDetails.map((t) => t.service_id).filter(Boolean))];
    const serviceMap = {};
    for (const sid of serviceIds) {
      try {
        const svcRows = await zcql.executeZCQLQuery(
          `SELECT service_name FROM ${SERVICES_TABLE} WHERE ROWID = ${sid} LIMIT 1`
        );
        if (svcRows.length) serviceMap[String(sid)] = svcRows[0][SERVICES_TABLE].service_name;
      } catch (e) {
        console.warn(`[pipeline_review_job] Could not fetch service ${sid}:`, e.message);
      }
    }

    // Build email table rows
    const taskRows_html = overdueTaskDetails.map((task) => {
      const serviceName = serviceMap[String(task.service_id)] || `Service ${task.service_id}`;
      const enteredAt = task.pipeline_entered_at || task.date_added;
      const enteredDate = enteredAt
        ? new Date(enteredAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';
      const daysInPipeline = enteredAt
        ? Math.floor((Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60 * 24))
        : '?';
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px 12px; font-weight: 600; color: #111827;">${task.title}</td>
          <td style="padding: 10px 12px; color: #6b7280;">${serviceName}</td>
          <td style="padding: 10px 12px; color: #6b7280;">${enteredDate}</td>
          <td style="padding: 10px 12px; color: #d97706; font-weight: 600;">${daysInPipeline} days</td>
          ${task.pipeline_reason ? `<td style="padding: 10px 12px; color: #6b7280; font-style: italic;">${task.pipeline_reason}</td>` : '<td style="padding: 10px 12px; color: #9ca3af;">—</td>'}
        </tr>`;
    }).join('');

    const email = catalystApp.email();
    await email.sendMail({
      from_email: MAIL_FROM,
      to_email: [MAIL_TO],
      subject: `Pipeline Review Alert: ${overdueTaskIds.length} task${overdueTaskIds.length > 1 ? 's have' : ' has'} been in pipeline for 2+ weeks`,
      html_mode: true,
      content: `
        <div style="font-family: sans-serif; font-size: 15px; color: #111827; max-width: 680px; margin: auto; padding: 32px 24px;">
          <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #111827;">Pipeline Review Alert</p>
          <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">The following task${overdueTaskIds.length > 1 ? 's have' : ' has'} been sitting in the pipeline for <strong>2 or more weeks</strong> without a review. Please open each task and decide whether to keep it in the pipeline or drop it.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 0 0 28px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 12px; text-align: left; color: #374151; font-size: 13px;">Task</th>
                <th style="padding: 10px 12px; text-align: left; color: #374151; font-size: 13px;">Service</th>
                <th style="padding: 10px 12px; text-align: left; color: #374151; font-size: 13px;">In Pipeline Since</th>
                <th style="padding: 10px 12px; text-align: left; color: #374151; font-size: 13px;">Days in Pipeline</th>
                <th style="padding: 10px 12px; text-align: left; color: #374151; font-size: 13px;">Current Reason</th>
              </tr>
            </thead>
            <tbody>
              ${taskRows_html}
            </tbody>
          </table>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">For each task, open it in the TaskManager app and choose one of:</p>
          <ul style="margin: 0 0 24px; padding-left: 20px; color: #6b7280; font-size: 13px; line-height: 1.8;">
            <li><strong style="color: #111827;">Keep in Pipeline</strong> — provide a reason; the 2-week timer will reset.</li>
            <li><strong style="color: #111827;">Drop Task</strong> — provide a reason and move the task to the Dropped section.</li>
          </ul>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">This alert was sent by the TaskManager pipeline review job.</p>
        </div>`,
    });

    console.log(`[pipeline_review_job] Alert email sent for ${overdueTaskIds.length} task(s).`);

    // Mark all alerted tasks as pipeline_alerted = true
    await Promise.all(
      overdueTaskIds.map((rowid) =>
        dsTasks.updateRow({ ROWID: rowid, pipeline_alerted: true }).catch((e) => {
          console.warn(`[pipeline_review_job] Failed to mark task ${rowid} as alerted:`, e.message);
        })
      )
    );

    context.closeWithSuccess();
  } catch (err) {
    console.error('[pipeline_review_job] Fatal error:', err);
    context.closeWithFailure();
  }
};
