import * as React from "react";
import { Html, Head, Body, Container, Heading, Text, Button, Hr } from "@react-email/components";

interface WelcomeEmailProps { name?: string; }

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/onboarding`;
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#fafafa", fontFamily: "Inter, Arial, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", borderRadius: 12, padding: 32, margin: "32px auto", maxWidth: 560, border: "1px solid #e5e5e5" }}>
          <Heading style={{ color: "#0a0a0a", fontSize: 22, marginTop: 0 }}>Welcome to CareerOS{name ? `, ${name}` : ""}</Heading>
          <Text style={{ color: "#525252", fontSize: 14, lineHeight: 1.6 }}>
            Upload your resume and we&apos;ll generate your career intelligence audit in about a minute.
          </Text>
          <Button href={url} style={{ backgroundColor: "#0a0a0a", color: "#ffffff", padding: "12px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
            Start your audit
          </Button>
          <Hr style={{ borderColor: "#e5e5e5", margin: "24px 0" }} />
          <Text style={{ color: "#a3a3a3", fontSize: 11 }}>You&apos;re receiving this because you signed up for CareerOS. Manage email preferences in Settings.</Text>
        </Container>
      </Body>
    </Html>
  );
}
