import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="bg-neutral-50 min-h-screen flex items-center justify-center">
      <SignIn
        routing="path"
        path="/sign-in"
        appearance={{
          elements: {
            card: "shadow-sm border border-neutral-200",
            formButtonPrimary: "bg-neutral-950 hover:bg-neutral-800 text-white",
            footerActionLink: "text-neutral-950 hover:underline",
          },
        }}
      />
    </div>
  );
}
