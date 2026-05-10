import * as React from "react";
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface AuditCompleteEmailProps {
  readinessScore: number;
  marketMatchScore: number;
  topGaps: string[];
}

export function AuditCompleteEmail({ readinessScore, marketMatchScore, topGaps }: AuditCompleteEmailProps) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`;
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#fafafa", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 32, margin: "32px auto", maxWidth: 560, border: "1px solid #e5e5e5" }}>
          <Heading style={{ color: "#0a0a0a", fontSize: 22, marginTop: 0 }}>Your audit is ready</Heading>
          <Text style={{ color: "#525252", fontSize: 14, lineHeight: 1.6 }}>
            Readiness {readinessScore}% · Market match {marketMatchScore}%
          </Text>
          {topGaps.length > 0 && (
            <>
              <Text style={{ color: "#0a0a0a", fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 8 }}>Top skill gaps to close:</Text>
              <ul style={{ color: "#525252", fontSize: 14, paddingLeft: 20 }}>
                {topGaps.slice(0, 3).map((g) => <li key={g} style={{ marginBottom: 4 }}>{g}</li>)}
              </ul>
            </>
          )}
          <Button href={url} style={{ backgroundColor: "#0a0a0a", color: "#ffffff", padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 16 }}>
            Open dashboard
          </Button>
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
          <Text style={{ color: "#a3a3a3", fontSize: 11 }}>Manage email preferences in Settings.</Text>
        </Container>
      </Body>
    </Html>
  );
}
