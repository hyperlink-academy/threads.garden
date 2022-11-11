export const sendEmail = async (
  To: string,
  Subject: string,
  content: string,
  POSTMARK_API_TOKEN?: string
) => {
  if (POSTMARK_API_TOKEN) {
    try {
      await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        body: JSON.stringify({
          From: "Accounts @ threads.garden <accounts@threads.garden>",
          To,
          Subject: Subject,
          Tag: "Invitation",
          HtmlBody: content,
          TextBody: content,
          MessageStream: "outbound",
        }),
        headers: {
          "Content-type": "application/json",
          "X-Postmark-Server-Token": POSTMARK_API_TOKEN,
        },
      });
    } catch (e) {
      console.log(e);
    }
  } else {
    console.log(`
              to: ${To}
              subject: ${Subject}

              ${content}
              `);
  }
  return;
};
