import { getDocuments } from "@/services/documentService";
import DocumentClient from "./DocumentClient";

export default async function DokumenPage() {
  const documents = await getDocuments();

  return <DocumentClient documents={documents} />;
}