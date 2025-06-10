const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        const mailOptions = {
            from: `"Travel Agency" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        throw new Error('Failed to send email');
    }
};

module.exports = sendEmail;