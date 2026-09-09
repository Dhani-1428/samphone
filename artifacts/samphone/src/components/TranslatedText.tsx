import { useTranslatedText } from "@/hooks/useTranslatedText";

export default function TranslatedText({ text }: { text: string }) {
  return <>{useTranslatedText(text)}</>;
}
