import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in — Doqora",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background p-6">
      <SignIn />
    </div>
  );
}
