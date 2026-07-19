/**
 * DriverHelpSupport — help hub: emergency info, operator contact, FAQs, quick links.
 */
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  MessageSquare,
  Phone,
  Mail,
  Shield,
  ClipboardCheck,
  Wrench,
} from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { op } from "@/lib/driver-operational-theme";
import {
  DRIVER_HELP_FAQ,
  DRIVER_OPERATOR_INFO,
} from "@/lib/driverOperatorInfo";

function LinkRow({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 py-4 border-b border-border last:border-b-0 active:bg-muted/60 px-4 bg-card"
    >
      <div className={op.iconWrap}>
        <Icon className={`w-5 h-5 ${op.iconTeal}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        ) : null}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
    </Link>
  );
}

function ContactRow({ to, href, icon: Icon, label, value }) {
  const className = `flex items-center gap-3 py-3.5 px-4 ${op.cardInteractive}`;

  const content = (
    <>
      <div className={op.iconWrap}>
        <Icon className={`w-4 h-4 ${op.iconTeal}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-[15px] font-semibold text-foreground truncate">{value}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}

export default function DriverHelpSupport() {
  const { supportPhone, supportEmail, officeHours } = DRIVER_OPERATOR_INFO;

  return (
    <div>
      <DriverOperationalHeader title="Help & support" subtitle="Emergency, contact and FAQs" backTo="/profile" />

      <div className="px-4 pb-8 space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-red-900">Emergency</p>
              <p className="text-xs text-red-800/90 mt-1 leading-relaxed">
                If anyone is in immediate danger, call{" "}
                <a href="tel:999" className="font-bold underline">
                  999
                </a>{" "}
                first. Then report the incident to your operator.
              </p>
              <Link
                to="/incidents/new"
                className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-red-900 underline"
              >
                Report an incident
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <section>
          <DriverSectionTitle>Contact your operator</DriverSectionTitle>
          <div className="space-y-2">
            <ContactRow
              to="/contact"
              icon={MessageSquare}
              label="Message operator"
              value="Chat with dispatch & compliance"
            />
            {supportPhone ? (
              <ContactRow
                href={`tel:${supportPhone.replace(/\s/g, "")}`}
                icon={Phone}
                label="Phone"
                value={supportPhone}
              />
            ) : null}
            {supportEmail ? (
              <ContactRow
                href={`mailto:${supportEmail}`}
                icon={Mail}
                label="Email"
                value={supportEmail}
              />
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{officeHours}</p>
        </section>

        <section>
          <DriverSectionTitle>Quick links</DriverSectionTitle>
          <div className={op.listCard}>
            <LinkRow
              to="/check"
              icon={ClipboardCheck}
              label="Daily safety check"
              description="Required before going on duty"
            />
            <LinkRow
              to="/defects"
              icon={Wrench}
              label="Report defect"
              description="Vehicle issue outside daily check"
            />
            <LinkRow
              to="/incidents/new"
              icon={Shield}
              label="Incident report"
              description="Accidents, safety concerns, lost property"
            />
            <LinkRow
              to="/documents"
              icon={FileText}
              label="Documents"
              description="Licences and compliance uploads"
            />
            <LinkRow
              to="/threads"
              icon={MessageSquare}
              label="Conversations"
              description="Message threads with admin"
            />
          </div>
        </section>

        <section>
          <DriverSectionTitle>Common questions</DriverSectionTitle>
          <div className={`${op.card} px-4`}>
            <Accordion type="single" collapsible className="w-full">
              {DRIVER_HELP_FAQ.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-border">
                  <AccordionTrigger className="text-[15px] font-semibold text-foreground hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </div>
    </div>
  );
}
