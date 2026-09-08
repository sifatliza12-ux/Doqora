import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Sign up — Doqora",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background p-6">
      <SignUp />
    </div>
  );
}
