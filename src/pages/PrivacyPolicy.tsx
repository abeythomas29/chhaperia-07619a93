import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-muted p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/login"><ArrowLeft className="mr-2 h-4 w-4" />Back to Login</Link>
        </Button>
        <div className="bg-card rounded-lg border p-6 md:p-8 space-y-6 text-sm text-muted-foreground">
          <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
          <p><strong className="text-foreground">Effective Date:</strong> March 27, 2026</p>
          <p>Chhaperia Cables ("we", "our", "us") operates the Production Tracking System. This policy describes how we collect, use, and protect your information.</p>
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>We collect your name, employee ID, email address, and production data you enter into the system. This information is necessary to operate the tracking system and manage production workflows.</p>
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
          <p>Your information is used to authenticate your account, track production entries, manage stock and client records, and generate reports for internal business use.</p>
          <h2 className="text-lg font-semibold text-foreground">3. Data Storage & Security</h2>
          <p>Your data is stored securely on cloud infrastructure with encryption at rest and in transit. Access is restricted based on your assigned role (worker or admin).</p>
          <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
          <p>We do not sell or share your personal information with third parties. Data is only accessible to authorized administrators within the organization.</p>
          <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal data by contacting your administrator.</p>
          <h2 className="text-lg font-semibold text-foreground">6. Changes to This Policy</h2>
          <p>We may update this policy from time to time. Continued use of the system constitutes acceptance of the updated policy.</p>
          <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
          <p>For questions about this policy, contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}
