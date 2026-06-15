import nodemailer from 'nodemailer';

// Use Ethereal for dummy testing if real creds aren't provided
export const sendEmail = async (to, subject, text) => {
  try {
    let transporter;
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, 
        auth: {
          user: testAccount.user, 
          pass: testAccount.pass, 
        },
      });
    }

    const info = await transporter.sendMail({
      from: '"ParkEasy Support" <support@parkeasy.com>',
      to,
      subject,
      text,
    });

    console.log('\n==========================================');
    console.log(`✉️  EMAIL SENT TO: ${to}`);
    console.log(`📋 SUBJECT: ${subject}`);
    console.log(`💬 MESSAGE:\n${text}`);
    if (!process.env.SMTP_USER) {
      console.log(`🔗 Ethereal URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    console.log('==========================================\n');
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};
