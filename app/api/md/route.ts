export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { formatFirebaseStorageUrl } from "@/lib/services/storage";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json(
      { error: "Missing 'url' parameter" },
      {
        status: 400,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  }

  try {
    const resolvedUrl = formatFirebaseStorageUrl(targetUrl);
    const parsed = new URL(resolvedUrl);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Invalid URL protocol" },
        {
          status: 400,
          headers: {
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        }
      );
    }

    const response = await fetch(resolvedUrl, {
      headers: {
        "User-Agent": "BooksCircle-Secure-Markdown-Delivery/2.0",
        Accept: "text/markdown,text/plain,application/octet-stream,*/*",
      },
    });

    if (response.ok) {
      const mdText = await response.text();
      if (mdText && mdText.trim().length > 0 && !mdText.trim().startsWith("<")) {
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

    return NextResponse.json(
      { error: "Markdown content not found" },
      {
        status: 404,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  } catch (error) {
    console.error("Markdown Delivery error:", error);
    return NextResponse.json(
      { error: "Failed to fetch markdown content" },
      {
        status: 502,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  }
}
