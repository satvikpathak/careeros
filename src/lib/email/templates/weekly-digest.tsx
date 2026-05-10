import * as React from "react";
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface WeeklyDigestEmailProps {
  streakDays: number;
  readinessDelta: number;
  staleApps: { jobTitle: string; company: string; status: string }[];
}

export function WeeklyDigestEmail({ streakDays, readinessDelta, staleApps }: WeeklyDigestEmailProps) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`;
  const sign = readinessDelta >= 0 ? "+" : "";
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#fafafa", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 32, margin: "32px auto", maxWidth: 560, border: "1px solid #e5e5e5" }}>
          <Heading style={{ color: "#0a0a0a", fontSize: 22, marginTop: 0 }}>Your week on CareerOS</Heading>
          <Text style={{ color: "#525252", fontSize: 14, lineHeight: 1.6 }}>
            Streak: <strong>{streakDays} {streakDays === 1 ? "day" : "days"}</strong> · Readiness: <strong>{sign}{readinessDelta}%</strong>
          </Text>
          {staleApps.length > 0 && (
            <>
              <Text style={{ color: "#0a0a0a", fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Applications needing attention:</Text>
              <ul style={{ color: "#525252", fontSize: 14, paddingLeft: 20 }}>
                {staleApps.slice(0, 3).map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a.jobTitle} — {a.company} ({a.status})</li>)}
              </ul>
            </>
          )}
          <Button href={url} style={{ backgroundColor: "#0a0a0a", color: "#ffffff", padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 16 }}>
            See your dashboard
          </Button>
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
          <Text style={{ color: "#a3a3a3", fontSize: 11 }}>Manage email preferences in Settings.</Text>
        </Container>
      </Body>
    </Html>
  );
}
