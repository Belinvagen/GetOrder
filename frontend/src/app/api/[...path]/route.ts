import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://getorder-production.up.railway.app";

export async function GET(request: NextRequest) {
  return proxyRequest(request);
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return proxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return proxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return proxyRequest(request);
}

async function proxyRequest(request: NextRequest) {
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  const headers: Record<string, string> = {
    "content-type": request.headers.get("content-type") || "application/json",
  };
  
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    headers["authorization"] = authHeader;
  }

  let body: string | undefined;
  if (!["GET", "HEAD"].includes(request.method)) {
    try {
      body = await request.text();
    } catch {
      body = undefined;
    }
  }

  try {
    // First try as-is
    let res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual", // Don't auto-follow redirects
    });

    // If FastAPI redirects (307), follow it manually preserving method and body
    if (res.status === 307 || res.status === 308) {
      const location = res.headers.get("location");
      if (location) {
        const redirectUrl = location.startsWith("http")
          ? location.replace("http://", "https://") // Force HTTPS
          : `${BACKEND_URL}${location}`;
        
        res = await fetch(redirectUrl, {
          method: request.method,
          headers,
          body,
          redirect: "manual",
        });
      }
    }

    const responseBody = await res.arrayBuffer();
    
    return new NextResponse(responseBody, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { detail: "Backend unavailable" },
      { status: 502 }
    );
  }
}
