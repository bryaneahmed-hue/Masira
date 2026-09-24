import { getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return Response.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return Response.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Session check error:", error);

    return Response.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}
