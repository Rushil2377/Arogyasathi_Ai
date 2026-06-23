import { createServerFn } from "@tanstack/react-start";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Server-side in-memory map to store verification tokens and corresponding user registration data
const verificationStore = new Map<string, { data: any; expiresAt: number }>();

export const sendVerificationEmailFn = createServerFn({ method: "POST" })
  .validator((data: { data: any; origin: string }) => data)
  .handler(async ({ data }) => {
    const { data: formData, origin } = data;
    const { email } = formData;
    if (!email) {
      throw new Error("Email is required");
    }

    // Generate unique token
    const token = crypto.randomUUID();
    // Token is valid for 1 hour
    const expiresAt = Date.now() + 60 * 60 * 1000;

    verificationStore.set(token, { data: formData, expiresAt });

    const verificationLink = `${origin}/verify-email?token=${token}`;
    
    // Log the link to the console for testing purposes
    console.log(`\n--- DEVELOPER VERIFICATION LINK FOR ${email} ---`);
    console.log(verificationLink);
    console.log("-------------------------------------------------\n");

    // Read SMTP config
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      // Return dev link immediately if SMTP configuration is missing
      return { 
        success: false, 
        devVerifyUrl: verificationLink, 
        error: "SMTP credentials not configured in .env file." 
      };
    }

    const cleanedPass = smtpPass.replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser.trim(),
        pass: cleanedPass,
      },
    });

    try {
      await transporter.sendMail({
        from: `"ArogyaSathi AI" <${smtpUser.trim()}>`,
        to: email,
        subject: "Verify Your Email Address - ArogyaSathi AI",
        text: `Please verify your email address by clicking this link: ${verificationLink}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0f766e; text-align: center; font-family: 'Poppins', Arial, sans-serif; margin-bottom: 5px;">ArogyaSathi AI</h2>
            <p style="text-align: center; color: #666666; font-size: 14px; margin-top: 0; margin-bottom: 20px;">Your Smart Healthcare Companion</p>
            <hr style="border: 0; border-top: 1px solid #e0e0e0;" />
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">Hello ${formData.name || "there"},</p>
            <p style="font-size: 16px; color: #333333; line-height: 1.5;">Thank you for registering with ArogyaSathi AI. Please click the button below to verify your email address and activate your account. This link is valid for 1 hour.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="font-size: 16px; font-weight: bold; color: #ffffff; padding: 12px 30px; background-color: #0d9488; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px rgba(13, 148, 136, 0.2);">Verify Email Address</a>
            </div>
            <p style="font-size: 12px; color: #666666; line-height: 1.5; text-align: center;">Or copy and paste this link into your browser:<br/>
              <a href="${verificationLink}" style="color: #0d9488; word-break: break-all;">${verificationLink}</a>
            </p>
            <p style="font-size: 14px; color: #666666; line-height: 1.5; margin-top: 20px;">If you did not request this registration, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin-top: 30px;" />
            <p style="font-size: 12px; color: #999999; text-align: center; margin-bottom: 0;">© ${new Date().getFullYear()} ArogyaSathi AI. Vadodara, India.</p>
          </div>
        `,
      });
      return { success: true };
    } catch (mailError: any) {
      console.error("Nodemailer verification link error:", mailError);
      return { 
        success: false, 
        devVerifyUrl: verificationLink,
        error: mailError.code === "EAUTH" 
          ? "SMTP authentication failed. Google rejected the credentials." 
          : mailError.message || "Failed to send email." 
      };
    }
  });

export const verifyTokenFn = createServerFn({ method: "POST" })
  .validator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const { token } = data;
    if (!token) {
      throw new Error("Token is required");
    }

    const record = verificationStore.get(token);
    if (!record) {
      throw new Error("Invalid or expired verification token.");
    }

    if (Date.now() > record.expiresAt) {
      verificationStore.delete(token);
      throw new Error("Verification link has expired. Please sign up again.");
    }

    // Return user details and clear token so it is single-use
    verificationStore.delete(token);
    return { success: true, data: record.data };
  });
