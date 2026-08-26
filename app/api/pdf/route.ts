import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  const token = searchParams.get("token");

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
    const decodedUrl = decodeURIComponent(targetUrl);
    const parsed = new URL(decodedUrl);

    // Security check: Only allow trusted protocols
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

    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "BooksCircle-Secure-PDF-Delivery/2.0",
        Accept: "application/pdf,application/octet-stream,*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote server responded with ${response.status}: ${response.statusText}` },
        {
          status: response.status,
          headers: {
            "X-Robots-Tag": "noindex, nofollow, noarchive",
          },
        }
      );
    }

    const arrayBuffer = await response.arrayBuffer();

    // Deliver with strict crawler protection headers to safeguard purchased digital assets
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="ebook.pdf"',
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, notranslate",
        "Cache-Control": "private, max-age=3600, no-transform",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("PDF Delivery error:", error);
    return NextResponse.json(
      { error: "Failed to fetch PDF securely", details: error?.message || String(error) },
      {
        status: 500,
        headers: {
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      }
    );
  }
}
