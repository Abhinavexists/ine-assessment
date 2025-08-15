const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid email service initialized');
} else {
  console.log('SendGrid API key not found, email service disabled');
}

async function sendEmail(to, subject, text, html = null, attachments = []) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('📧 [EMAIL SIMULATION]');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text}`);
    if (attachments.length > 0) {
      console.log(`Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    }
    console.log('📧 [END EMAIL SIMULATION]');
    return { success: true, simulation: true };
  }

  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM || 'no-reply@auctionapp.com',
      subject,
      text,
      html: html || text,
      attachments
    };

    const result = await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
    return { success: true, messageId: result[0].headers['x-message-id'] };

  } catch (error) {
    console.error('Failed to send email:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: continuing despite email failure');
      return { success: false, error: error.message, simulation: true };
    }
    
    throw error;
  }
}

async function sendBidAcceptedEmail(buyer, auction, amount, invoiceBuffer = null) {
  const subject = `Your bid was accepted for "${auction.title}"`;
  
  const text = `
Congratulations! Your bid has been accepted!

Auction: ${auction.title}
Your winning bid: ₹${amount}
Seller: ${auction.seller?.displayName || 'Auction Seller'}

Thank you for using our auction platform!

Best regards,
The Auction Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #28a745;">Congratulations!</h1>
      <p>Your bid has been <strong>accepted</strong>!</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Auction Details</h3>
        <p><strong>Item:</strong> ${auction.title}</p>
        <p><strong>Your winning bid:</strong> ₹${amount}</p>
        <p><strong>Seller:</strong> ${auction.seller?.displayName || 'Auction Seller'}</p>
      </div>
      
      <p>Thank you for using our auction platform!</p>
      <p>Best regards,<br>The Auction Team</p>
    </div>
  `;

  const attachments = [];
  if (invoiceBuffer) {
    attachments.push({
      filename: `invoice-${auction.id}.pdf`,
      content: invoiceBuffer.toString('base64'),
      type: 'application/pdf',
      disposition: 'attachment'
    });
  }

  return await sendEmail(buyer.email, subject, text, html, attachments);
}

async function sendBidAcceptedSellerEmail(seller, auction, amount, buyerName, invoiceBuffer = null) {
  const subject = `You accepted a bid for "${auction.title}"`;
  
  const text = `
You have successfully accepted a bid!

Auction: ${auction.title}
Accepted bid: ₹${amount}
Buyer: ${buyerName}

Thank you for using our auction platform!

Best regards,
The Auction Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #007bff;">Bid Accepted</h1>
      <p>You have successfully <strong>accepted</strong> a bid!</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Transaction Details</h3>
        <p><strong>Item:</strong> ${auction.title}</p>
        <p><strong>Accepted bid:</strong> ₹${amount}</p>
        <p><strong>Buyer:</strong> ${buyerName}</p>
      </div>
      
      <p>Thank you for using our auction platform!</p>
      <p>Best regards,<br>The Auction Team</p>
    </div>
  `;

  const attachments = [];
  if (invoiceBuffer) {
    attachments.push({
      filename: `invoice-${auction.id}.pdf`,
      content: invoiceBuffer.toString('base64'),
      type: 'application/pdf',
      disposition: 'attachment'
    });
  }

  return await sendEmail(seller.email, subject, text, html, attachments);
}
  
async function sendBidRejectedEmail(buyer, auction, amount) {
  const subject = `Your bid was not accepted for "${auction.title}"`;
  
  const text = `
We're sorry to inform you that your bid was not accepted.

Auction: ${auction.title}
Your bid: ₹${amount}

Don't worry - there are many other great auctions available on our platform!

Best regards,
The Auction Team
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #dc3545;">Bid Not Accepted</h1>
      <p>We're sorry to inform you that your bid was <strong>not accepted</strong>.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Auction Details</h3>
        <p><strong>Item:</strong> ${auction.title}</p>
        <p><strong>Your bid:</strong> ₹${amount}</p>
      </div>
      
      <p>Don't worry - there are many other great auctions available on our platform!</p>
      <p>Best regards,<br>The Auction Team</p>
    </div>
  `;

  return await sendEmail(buyer.email, subject, text, html);
}

module.exports = {
  sendEmail,
  sendBidAcceptedEmail,
  sendBidAcceptedSellerEmail,
  sendBidRejectedEmail
};