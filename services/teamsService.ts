
import { MeetingRecord } from '../types';

export const sendToTeams = async (webhookUrl: string, record: MeetingRecord): Promise<boolean> => {
  // Creating a message following the MS Teams Message Card format
  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": "6264A7",
    "summary": `Meeting Summary: ${record.title}`,
    "sections": [{
      "activityTitle": `📝 ${record.title}`,
      "activitySubtitle": `Strategic Summary by MeetingMind Autopilot`,
      "activityImage": "https://img.icons8.com/fluency/96/microsoft-teams-2019.png",
      "facts": [
        { "name": "Grade", "value": record.professionalGrade },
        { "name": "Sentiment", "value": `${record.sentimentScore}/10` },
        { "name": "Source", "value": record.source || "Auto" }
      ],
      "markdown": true
    }, {
      "startGroup": true,
      "title": "**Executive Summary**",
      "text": record.summary
    }, {
      "title": "**Key Takeaways**",
      "text": record.keyTakeaways.map(t => `* ${t}`).join('\n')
    }, {
      "title": "**Action Items**",
      "text": record.actionPlan
        .filter(a => !a.completed)
        .map(a => `* [${a.priority}] **${a.task}** (Assignee: ${a.assignee || 'TBD'})`)
        .join('\n')
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "View in MeetingMind",
      "targets": [{ "os": "default", "uri": window.location.href }]
    }]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // Webhooks often require no-cors or specialized headers in browser
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    // With no-cors, we can't truly check status, but we assume success if no error thrown
    return true;
  } catch (error) {
    console.error("Teams sync error:", error);
    return false;
  }
};
