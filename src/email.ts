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
          HtmlBody: `${HTMLTemplate}
          <body>
            ${content}
            <br/>
            <br/>
            <div>
              <a href="threads.garden">threads.garden</a>
            </div>
          </body>`,
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

const HTMLTemplate = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title></title>
    <style type="text/css" rel="stylesheet" media="all">
    body {
      width: 100% !important;
      font-size: 18px;
      height: 100%;
      margin: 0;
      -webkit-text-size-adjust: none;
    }
    
    a {
      color: #3869D4;
    }
    
    a img {
      border: none;
    }
    
    td {
      word-break: break-word;
    }
    
    h1 {
      margin-top: 0;
      color: #333333;
      font-size: 22px;
      font-weight: bold;
      text-align: left;
    }
    
    h2 {
      margin-top: 0;
      color: #333333;
      font-size: 16px;
      font-weight: bold;
      text-align: left;
    }
    
    h3 {
      margin-top: 0;
      color: #333333;
      font-size: 14px;
      font-weight: bold;
      text-align: left;
    }
    
    p,
    ul,
    ol,
    blockquote {
      margin: .4em 0 1.1875em;
      font-size: 16px;
      line-height: 1.625;
    }
    
    body {
      background-color: #F2F4F6;
      color: #51545E;
    }
    
    p {
      color: #51545E;
    }
    </style>
  <![endif]-->
  </head>
`;
