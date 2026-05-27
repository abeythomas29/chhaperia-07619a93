import SlittingEntryForm from "./SlittingEntryForm";
import MaterialReturn from "./MaterialReturn";
import Head36Entry from "./Head36Entry";

type SlittingTab = "slitting" | "return" | "head36";

interface SlittingEntryProps {
  defaultTab?: SlittingTab;
}

export default function SlittingEntry({ defaultTab = "slitting" }: SlittingEntryProps) {
  if (defaultTab === "return") {
    return <MaterialReturn />;
  }
  if (defaultTab === "head36") {
    return <Head36Entry />;
  }
  return <SlittingEntryForm />;
}
