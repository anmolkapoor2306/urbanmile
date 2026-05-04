import twilio from 'twilio';

let twilioClient: ReturnType<typeof twilio> | null = null;

export function getTwilioVerifyClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !verifyServiceSid) {
    throw new Error('Twilio Verify environment variables are not configured');
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }

  return {
    client: twilioClient,
    verifyServiceSid,
  };
}

export function logTwilioError(context: string, error: unknown) {
  if (error && typeof error === 'object') {
    const twilioError = error as {
      code?: string | number;
      status?: string | number;
      message?: string;
      moreInfo?: string;
      details?: unknown;
    };

    console.error(context, {
      code: twilioError.code,
      status: twilioError.status,
      message: twilioError.message,
      moreInfo: twilioError.moreInfo,
      details: twilioError.details,
    });
    return;
  }

  console.error(context, error);
}
