import {
  QuickSightClient,
  GenerateEmbedUrlForRegisteredUserCommand,
} from "@aws-sdk/client-quicksight";
export async function dashboard() {
  const {
    AWS_ACCOUNT_ID,
    QUICKSIGHT_USER_ARN,
    QUICKSIGHT_DASHBOARD_ID,
    WEB_ORIGIN,
    AWS_REGION,
  } = process.env;
  if (
    !AWS_ACCOUNT_ID ||
    !QUICKSIGHT_USER_ARN ||
    !QUICKSIGHT_DASHBOARD_ID ||
    !WEB_ORIGIN
  )
    return {
      mode: "Synthetic chart fallback — QuickSight is not yet live",
      url: null,
    };
  const result = await new QuickSightClient({
    region: AWS_REGION || "us-east-1",
  }).send(
    new GenerateEmbedUrlForRegisteredUserCommand({
      AwsAccountId: AWS_ACCOUNT_ID,
      UserArn: QUICKSIGHT_USER_ARN,
      AllowedDomains: [WEB_ORIGIN],
      SessionLifetimeInMinutes: 15,
      ExperienceConfiguration: {
        Dashboard: { InitialDashboardId: QUICKSIGHT_DASHBOARD_ID },
      },
    }),
  );
  if (!result.EmbedUrl)
    throw new Error("QuickSight did not return an embed URL");
  const embedUrl = new URL(result.EmbedUrl);
  if (
    embedUrl.protocol !== "https:" ||
    !embedUrl.hostname.endsWith("quicksight.aws.amazon.com")
  ) {
    throw new Error("QuickSight returned an unsupported embed URL");
  }
  return {
    mode: "QuickSight embed URL generated — dashboard rendering must be verified",
    url: embedUrl.href,
  };
}
