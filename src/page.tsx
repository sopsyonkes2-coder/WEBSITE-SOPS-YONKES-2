import { getDocuments } from "@/services/documentService";

export default async function DokumenPage() {
  const documents = await getDocuments();

  // Kita kembalikan teks sederhana agar tidak error saat build
  return (
    <div>
      <h1>Daftar Dokumen</h1>
      <pre>{JSON.stringify(documents, null, 2)}</pre>
    </div>
  );
}