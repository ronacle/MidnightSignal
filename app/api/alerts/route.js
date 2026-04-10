
export async function POST(req) {
  const body = await req.json();

  // In real build: store in DB
  console.log("Alert registered:", body);

  return Response.json({
    success: true,
    message: "Alerts activated (email stored)"
  });
}
