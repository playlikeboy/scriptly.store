import { Metadata } from "next";
import PromptsManagerClient from "./PromptsManagerClient";

export const metadata: Metadata = {
  title: "AI Integration & Process Prompts | Admin Console",
  description: "Pre-configured LLM system prompts, JSON schemas, and SDK reference implementations for ScriptlyStore engines.",
};

export default function AdminPromptsPage() {
  return <PromptsManagerClient />;
}
