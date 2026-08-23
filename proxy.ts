import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = process.env.SESSION_SECRET;
if (!SECRET_KEY) {
  throw new Error("A variável de ambiente SESSION_SECRET não está definida.");
}
const key = new TextEncoder().encode(SECRET_KEY);

const publicRoutes = ["/login", "/public"];

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;


  if (
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".svg") ||
    path === "/sw.js" ||
    path === "/manifest.json"
  ) {
    return NextResponse.next();
  }


  const isPublicRoute = publicRoutes.some(
    (route) => path === route || path.startsWith(route),
  );


  const session = req.cookies.get("session_token")?.value;


  let isAuthenticated = false;
  let userRole = "";

  if (session) {
    try {
      // Extraímos o 'payload' para ler os dados salvos no token (como o role)
      const { payload } = await jwtVerify(session, key, {
        algorithms: ["HS256"],
      });
      isAuthenticated = true;
      userRole = payload.role as string;
    } catch (error) {

    }
  }


  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }


  if (path === "/login" && isAuthenticated) {

    if (userRole === "funcionario") {
      return NextResponse.redirect(new URL("/eventos/novo", req.url));
    }


    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {

  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sw.js|sw.js.map|manifest.json|.*\\.png$|.*\\.svg$).*)",
  ],
};
