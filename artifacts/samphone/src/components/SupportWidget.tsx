import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { answerFaq } from "@/lib/faq-bot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const WA = "https://wa.me/351937119295";

export default function SupportWidget() {
  const { t, lang } = useLang();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [faqQ, setFaqQ] = useState("");
  const [faqA, setFaqA] = useState("");
  const [phone, setPhone] = useState("");

  const runFaq = () => {
    setFaqA(answerFaq(faqQ, lang));
  };

  const submitCallback = () => {
    if (!phone.trim()) return;
    toast({ title: t("support_callback_ok") });
    setPhone("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2F6BFF] text-white shadow-lg md:bottom-8 md:right-8"
          aria-label={t("support_open")}
          data-testid="button-support-widget"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {t("support_open")}
          </SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="live" className="mt-4 flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="live">{t("support_tab_live")}</TabsTrigger>
            <TabsTrigger value="faq">{t("support_tab_faq")}</TabsTrigger>
            <TabsTrigger value="callback">{t("support_tab_callback")}</TabsTrigger>
          </TabsList>
          <TabsContent value="live" className="mt-4 space-y-4 text-sm text-muted-foreground">
            <p>{t("support_live_blurb")}</p>
            <Button className="w-full gap-2" asChild>
              <a href={WA} target="_blank" rel="noopener noreferrer">
                {t("support_chat_whatsapp")}
              </a>
            </Button>
            <a href="tel:+351937119295" className="block text-center text-primary font-medium">
              +351 937 119 295
            </a>
          </TabsContent>
          <TabsContent value="faq" className="mt-4 flex flex-col gap-3 min-h-[200px]">
            <Textarea
              placeholder={t("support_faq_placeholder")}
              value={faqQ}
              onChange={(e) => setFaqQ(e.target.value)}
              className="min-h-[88px] resize-none"
            />
            <Button type="button" onClick={runFaq}>
              {t("support_faq_send")}
            </Button>
            {faqA && (
              <p className="text-sm text-foreground rounded-lg border border-border bg-muted/40 p-3">{faqA}</p>
            )}
          </TabsContent>
          <TabsContent value="callback" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">{t("support_callback_hint")}</p>
            <Input
              type="tel"
              placeholder={t("support_callback_phone")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="button" className="w-full" onClick={submitCallback}>
              {t("support_callback_submit")}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
