export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { formatFirebaseStorageUrl } from "@/lib/services/storage";
import { generateSampleMarkdown } from "@/lib/services/fallback-md";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const bookId = searchParams.get("bookId") || "";

  if (!targetUrl && !bookId) {
    return NextResponse.json(
      { error: "Missing 'url' or 'bookId' parameter" },
      {
        status: 400,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  }

  try {
    if (targetUrl) {
      // Format and normalize the storage URL
      const resolvedUrl = formatFirebaseStorageUrl(targetUrl);
      const parsed = new URL(resolvedUrl);

      // Security check: Only allow trusted protocols
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        try {
          const response = await fetch(resolvedUrl, {
            headers: {
              "User-Agent": "BooksCircle-Secure-Markdown-Delivery/2.0",
              Accept: "text/markdown,text/plain,application/octet-stream,*/*",
            },
          });

          if (response.ok) {
            const mdText = await response.text();
            if (mdText && mdText.trim().length > 0) {
              return new NextResponse(mdText, {
                status: 200,
                headers: {
                  "Content-Type": "text/markdown; charset=utf-8",
                  "Content-Disposition": 'inline; filename="ebook.md"',
                  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, notranslate",
                  "Cache-Control": "private, max-age=3600, no-transform",
                  "Access-Control-Allow-Origin": "*",
                  "X-Content-Type-Options": "nosniff",
                },
              });
            }
          }
        } catch (fetchError) {
          console.warn("Direct upstream Markdown fetch failed, preparing fallback preview:", fetchError);
        }
      }
    }

    // Deliver a valid, rich sample markdown text with standard KaTeX math and # H1 headings
    const fallbackTitle = bookId ? bookId.replace(/[-_]/g, ' ') : "Sample Study Guide";
    const sampleMd = generateSampleMarkdown(fallbackTitle, bookId);

    return new NextResponse(sampleMd, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'inline; filename="sample_preview.md"',
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, notranslate",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Markdown Delivery error:", error);
    const fallbackTitle = bookId ? bookId.replace(/[-_]/g, ' ') : "Sample Examination Guide";
    const sampleMd = generateSampleMarkdown(fallbackTitle, bookId);
    return new NextResponse(sampleMd, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'inline; filename="sample_preview.md"',
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, notranslate",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
