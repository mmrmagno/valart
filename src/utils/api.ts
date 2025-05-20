// @ts-nocheck
import axios from 'axios';

// Types
interface SubmissionData {
  authorName: string;
  creationName: string;
  art: string;
  gridSize: {
    width: number;
    height: number;
  };
  email?: string;
}

// Configuration for email sending (ideally would be environment variables)
const EMAIL_CONFIG = {
  apiUrl: 'https://api.emailjs.com/api/v1.0/email/send',
  serviceId: 'service_75uo1bc', // EmailJS service ID
  templateId: 'template_uezkfbq', // EmailJS template ID
  userId: 'QxKH4c9hPaVdcKtzg', // EmailJS public key
  defaultTo: 'valartapp@gmail.com', // Admin email for notification
  emailEnabled: true // Email sending is now enabled
};

const api = {
  /**
   * Send an email notification using EmailJS
   * @param to Email recipient
   * @param subject Email subject
   * @param message Email body
   */
  sendEmail: async (to: string, subject: string, message: string) => {
    if (!EMAIL_CONFIG.emailEnabled) {
      console.log(`Email sending disabled. Would have sent to ${to}: ${subject}`);
      return { success: true, mock: true };
    }
    
    try {
      const templateParams = {
        to_email: to,
        from_name: 'VALART ASCII Art Generator',
        subject: subject,
        message_html: message.replace(/\n/g, '<br>'),
        reply_to: EMAIL_CONFIG.defaultTo
      };
      
      console.log('Sending email with params:', templateParams);
      
      const response = await axios.post(EMAIL_CONFIG.apiUrl, {
        service_id: EMAIL_CONFIG.serviceId,
        template_id: EMAIL_CONFIG.templateId,
        user_id: EMAIL_CONFIG.userId,
        template_params: templateParams
      });
      
      console.log('Email sent successfully', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  },

  /**
   * Submit ASCII art for publication
   * @param data The submission data including author name, creation name, art, and grid size
   * @returns A promise with the server response
   */
  submitArt: async (data: SubmissionData) => {
    try {
      // Simulate a network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      let emailSent = false;
      
      // If email is provided, send confirmation email to the user
      if (data.email) {
        try {
          const subject = 'Your VALART submission was received';
          const message = `
            <h2>Hi ${data.authorName},</h2>
            
            <p>Thank you for submitting your ASCII art creation <strong>"${data.creationName}"</strong> to VALART!</p>
            
            <p>We've received your submission and it will be reviewed shortly.</p>
            
            <h3>Your creation:</h3>
            <pre style="background-color: #0a141b; color: #f8f8f8; padding: 15px; border-radius: 5px;">${data.art}</pre>
            
            <p>Grid size: ${data.gridSize.width} x ${data.gridSize.height}</p>
            
            <p>Thanks for being part of our community!</p>
            
            <p>- The VALART Team</p>
          `;
          
          await api.sendEmail(data.email, subject, message);
          
          // Also notify admin
          const adminSubject = `New VALART submission: ${data.creationName}`;
          const adminMessage = `
            <h2>New ASCII art submission received</h2>
            
            <p><strong>Author:</strong> ${data.authorName}</p>
            <p><strong>Creation:</strong> ${data.creationName}</p>
            <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
            <p><strong>Grid size:</strong> ${data.gridSize.width} x ${data.gridSize.height}</p>
            
            <h3>Art:</h3>
            <pre style="background-color: #0a141b; color: #f8f8f8; padding: 15px; border-radius: 5px;">${data.art}</pre>
          `;
          
          await api.sendEmail(EMAIL_CONFIG.defaultTo, adminSubject, adminMessage);
          emailSent = true;
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
          emailSent = false;
          // Continue with the submission even if email fails
        }
      }
      
      // Return mock success response
      return {
        success: true,
        message: "Art submitted successfully!",
        emailSent,
        data: {
          id: Math.random().toString(36).substr(2, 9),
          ...data,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error submitting art:', error);
      throw error;
    }
  }
};

export default api; 